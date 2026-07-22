// One-shot LLM completion for analysis features (call summaries, sentiment,
// question clustering). Groq is the primary provider — same account/model the
// n8n voice agent uses, no card-on-file requirement. Vapi's chat API is kept
// as a fallback for deployments that have a Vapi payment method but no
// GROQ_API_KEY.

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const VAPI_PRIVATE_API_KEY = process.env.VAPI_PRIVATE_API_KEY;
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

export class LLMError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function llmConfigured(): boolean {
  return Boolean(GROQ_API_KEY || (VAPI_PRIVATE_API_KEY && VAPI_ASSISTANT_ID));
}

/** Send a single prompt, get the raw text completion back. */
export async function complete(prompt: string): Promise<string> {
  if (GROQ_API_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      throw new LLMError(`Groq API returned ${res.status}`, res.status);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  }

  if (VAPI_PRIVATE_API_KEY && VAPI_ASSISTANT_ID) {
    const res = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistantId: VAPI_ASSISTANT_ID, input: prompt }),
    });
    if (!res.ok) {
      throw new LLMError(`VAPI Chat API returned ${res.status}`, res.status);
    }
    const data = await res.json();
    return data?.output?.[0]?.content ?? "";
  }

  throw new LLMError("No LLM provider configured (set GROQ_API_KEY)", 500);
}
