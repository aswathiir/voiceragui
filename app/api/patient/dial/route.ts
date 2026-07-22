import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rateLimiter";
import { getOrganizations } from "@/lib/server/adminRepository";
import { getVoiceConfig } from "@/lib/server/configRepository";

// Patient-facing "call me" endpoint: an end user (no dashboard login) asks the
// org's toll-free line to ring THEIR phone. Rate-limited per org; suspended
// orgs are blocked; the call carries the org's persona + KB binding.
export async function POST(req: NextRequest) {
  const { toNumber, orgId } = await req.json();

  const org = getOrganizations().find((o) => o.id === orgId);
  if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 400 });
  if (org.status === "suspended") {
    return NextResponse.json({ error: "This line is currently unavailable" }, { status: 403 });
  }
  const rate = checkRateLimit(`patient_${orgId}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many call requests — try again shortly" }, { status: 429 });
  }

  const number = String(toNumber ?? "").replace(/[\s()-]/g, "");
  if (!/^\+\d{8,15}$/.test(number)) {
    return NextResponse.json({ error: "Enter your number in international format, e.g. +919746621918" }, { status: 400 });
  }

  const KEY = process.env.VAPI_PRIVATE_API_KEY;
  const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  if (!KEY || !PHONE_NUMBER_ID || !ASSISTANT_ID) {
    return NextResponse.json({ error: "Calling not configured" }, { status: 500 });
  }

  const publicOrigin =
    process.env.PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      ? new URL(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL).origin
      : req.nextUrl.origin);
  const config = getVoiceConfig(orgId);

  const res = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
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
          messages: [{
            role: "system",
            content:
              `You are the voice assistant for ${org.name}, calling a patient back at their request. ${config.llmPersonality}\n` +
              `RULES:\n1. For EVERY question (reports, timings, prices, doctors), call the voice_rag_query tool first and answer only from it.\n` +
              `2. For appointments, collect name, date and time one at a time, then call book_appointment.\n` +
              `3. Keep answers to 2-3 short spoken sentences. You represent ${org.name} only.`,
          }],
          tools: [
            {
              type: "function",
              function: {
                name: "voice_rag_query",
                description: `Search ${org.name}'s knowledge base.`,
                parameters: { type: "object", properties: { user_question: { type: "string" } }, required: ["user_question"] },
              },
              server: { url: `${publicOrigin}/api/query?orgId=${encodeURIComponent(orgId)}`, timeoutSeconds: 20 },
            },
            {
              type: "function",
              function: {
                name: "book_appointment",
                description: `Book an appointment at ${org.name}.`,
                parameters: {
                  type: "object",
                  properties: { name: { type: "string" }, datetime: { type: "string" }, reason: { type: "string" } },
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
    const msg = Array.isArray(data?.message) ? data.message.join("; ") : String(data?.message ?? `Vapi ${res.status}`);
    return NextResponse.json({ error: msg }, { status: res.status });
  }
  return NextResponse.json({ callId: data.id, status: data.status ?? "queued", to: number });
}
