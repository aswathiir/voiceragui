import { getVoiceConfig } from "@/lib/server/configRepository";
import { getOrganizations } from "@/lib/server/adminRepository";

// Single source of truth for the per-call Vapi assistant overrides, used by
// BOTH the phone dial route and the browser-call config endpoint so browser
// and phone calls behave identically for a given org.
export function buildAssistantOverrides(orgId: string, publicOrigin: string) {
  const config = getVoiceConfig(orgId);
  const orgName = getOrganizations().find((o) => o.id === orgId)?.name ?? "this organization";

  const systemPrompt =
    `You are the voice assistant for ${orgName}. ${config.llmPersonality}\n\n` +
    `RULES:\n` +
    `1. For EVERY question, call the voice_rag_query tool with the caller's question before answering.\n` +
    `2. Answer ONLY from the tool result — it is ${orgName}'s own knowledge base. Never use outside knowledge.\n` +
    `3. For appointments, FIRST ask the caller for their name, preferred date, and time one at a time. Only after you have name AND date AND time, call book_appointment and read back the confirmed details.\n` +
    `4. If you cannot help, offer to connect them to the front desk.\n` +
    `5. Keep answers to 2-3 short spoken sentences. Never read out URLs.\n` +
    `6. You represent ${orgName} only — never mention other organizations or unrelated topics.`;

  return {
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
              properties: { name: { type: "string" }, datetime: { type: "string" }, reason: { type: "string" } },
              required: ["name", "datetime"],
            },
          },
          server: { url: `${publicOrigin}/api/appointments?orgId=${encodeURIComponent(orgId)}`, timeoutSeconds: 15 },
        },
      ],
    },
  };
}

export function resolvePublicOrigin(reqOrigin: string) {
  return (
    process.env.PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      ? new URL(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL).origin
      : reqOrigin)
  );
}
