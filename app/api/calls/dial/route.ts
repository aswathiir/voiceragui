import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { getVoiceConfig } from "@/lib/server/configRepository";
import { getOrganizations } from "@/lib/server/adminRepository";

// POST /api/calls/dial { toNumber } — places a real outbound phone call from
// the org's toll-free line (Twilio number registered in Vapi) to the given
// number, with the org's id riding on the call metadata so the assistant
// answers from THIS org's knowledge base.
export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const orgId = session.customerId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization for this session" }, { status: 400 });
  }

  const VAPI_KEY = process.env.VAPI_PRIVATE_API_KEY;
  const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  if (!VAPI_KEY || !PHONE_NUMBER_ID || !ASSISTANT_ID) {
    return NextResponse.json(
      { error: "Outbound calling not configured (VAPI_PHONE_NUMBER_ID missing)" },
      { status: 500 },
    );
  }

  const { toNumber } = await req.json();
  const number = String(toNumber ?? "").replace(/[\s()-]/g, "");
  if (!/^\+\d{8,15}$/.test(number)) {
    return NextResponse.json(
      { error: "Enter the number in international format, e.g. +919746621918" },
      { status: 400 },
    );
  }

  // Vapi is cloud — its tool must call a PUBLIC url, not localhost. Derive the
  // ngrok origin from the configured webhook URL.
  const publicOrigin =
    process.env.PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      ? new URL(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL).origin
      : req.nextUrl.origin);

  const config = getVoiceConfig(orgId);
  const orgName = getOrganizations().find((o) => o.id === orgId)?.name ?? "this organization";
  const systemPrompt =
    `You are the voice assistant for ${orgName}. ${config.llmPersonality}\n\n` +
    `RULES:\n` +
    `1. For EVERY question, call the voice_rag_query tool with the caller's question before answering.\n` +
    `2. Answer ONLY from the tool result — it is ${orgName}'s own knowledge base. Never use outside knowledge.\n` +
    `3. For appointments, FIRST ask the caller for their name, preferred date, and time one at a time. Only after you have name AND date AND time, call book_appointment and read back the confirmed details.\n` +
    `4. If you cannot help, offer to connect them to the front desk.\n` +
    `4. Keep answers to 2-3 short spoken sentences. Never read out URLs.\n` +
    `5. You represent ${orgName} only — never mention other organizations or unrelated topics.`;

  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: ASSISTANT_ID,
        phoneNumberId: PHONE_NUMBER_ID,
        customer: { number },
        assistantOverrides: {
          metadata: { orgId },
          variableValues: { orgId },
          firstMessage: config.greetingMessage,
          model: {
            provider: "groq",
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }],
            tools: [
              {
                type: "function",
                function: {
                  name: "voice_rag_query",
                  description: `Search ${orgName}'s knowledge base to answer the caller's question.`,
                  parameters: {
                    type: "object",
                    properties: { user_question: { type: "string", description: "The caller's question" } },
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
                      name: { type: "string" },
                      datetime: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["name", "datetime"],
                  },
                },
                server: { url: `${publicOrigin}/api/appointments?orgId=${encodeURIComponent(orgId)}`, timeoutSeconds: 15 },
              },
            ],
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message
        ? Array.isArray(data.message)
          ? data.message.join("; ")
          : String(data.message)
        : `Vapi returned ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json({
      callId: data.id,
      status: data.status ?? "queued",
      from: "+19016693011",
      to: number,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dial failed" },
      { status: 502 },
    );
  }
}
