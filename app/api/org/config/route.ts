import { NextRequest, NextResponse } from "next/server";
import { getVoiceConfig, saveVoiceConfig } from "@/lib/server/configRepository";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { getOrganizations } from "@/lib/server/adminRepository";

function resolveOrgId(req: NextRequest, session: { role: string; customerId: string | null }) {
  if (session.role === "super_admin") {
    return req.nextUrl.searchParams.get("orgId") ?? null;
  }
  return session.customerId;
}

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const orgId = resolveOrgId(req, session);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  return NextResponse.json({ config: getVoiceConfig(orgId) });
}

export async function PUT(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const orgId = resolveOrgId(req, session);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const config = saveVoiceConfig(orgId, body.config ?? body);

  // Push the greeting + personality to the real Vapi assistant so config
  // changes actually affect live calls, not just the local record.
  let vapiSynced = false;
  const VAPI_KEY = process.env.VAPI_PRIVATE_API_KEY;
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  const orgName = getOrganizations().find((o) => o.id === orgId)?.name ?? "this organization";
  const publicOrigin =
    process.env.PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      ? new URL(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL).origin
      : req.nextUrl.origin);
  if (VAPI_KEY && ASSISTANT_ID) {
    try {
      const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${VAPI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          firstMessage: config.greetingMessage,
          voice: { provider: "azure", voiceId: config.ttsVoice.startsWith("ravi") ? "en-US-GuyNeural" : "en-US-AriaNeural" },
          model: {
            provider: "groq",
            model: "llama-3.3-70b-versatile",
            messages: [{
              role: "system",
              content:
                `You are the voice assistant for ${orgName}. ${config.llmPersonality}\n\n` +
                `RULES:\n1. For EVERY question, call the voice_rag_query tool before answering.\n` +
                `2. Answer ONLY from the tool result — it is ${orgName}'s own knowledge base.\n` +
                `3. For appointments, FIRST ask the caller for their name, preferred date, and time (one at a time). Only after you have all three, call book_appointment and read back the confirmed details.\n` +
                `4. If you cannot help, offer to connect them to the front desk.\n` +
                `5. Keep answers to 2-3 short spoken sentences. Never read URLs.\n` +
                `6. You represent ${orgName} only.`,
            }],
            // Re-include tools — PATCHing model otherwise wipes them, which
            // would kill RAG on inbound calls to the shared number.
            tools: [
              {
                type: "function",
                function: {
                  name: "voice_rag_query",
                  description: `Search ${orgName}'s knowledge base to answer the caller's question.`,
                  parameters: {
                    type: "object",
                    properties: { user_question: { type: "string" } },
                    required: ["user_question"],
                  },
                },
                server: { url: `${publicOrigin}/api/query?orgId=${encodeURIComponent(orgId)}`, timeoutSeconds: 20 },
              },
              {
                type: "function",
                function: {
                  name: "book_appointment",
                  description: `Book an appointment at ${orgName} for the caller.`,
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Caller's name" },
                      datetime: { type: "string", description: "Preferred date and time" },
                      reason: { type: "string", description: "Reason / department" },
                    },
                    required: ["name", "datetime"],
                  },
                },
                server: { url: `${publicOrigin}/api/appointments?orgId=${encodeURIComponent(orgId)}`, timeoutSeconds: 15 },
              },
            ],
          },
        }),
      });
      vapiSynced = res.ok;
    } catch {
      vapiSynced = false;
    }
  }

  return NextResponse.json({ config, vapiSynced });
}
