import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { complete, llmConfigured, LLMError } from "@/lib/server/llm";

function extractQuestions(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed.filter((q) => typeof q === "string").slice(0, 5);
    return [];
  } catch {
    return [];
  }
}

// Clusters recent call transcripts into the top 5 recurring caller questions.
// Caller should pass a small, recent batch of transcripts (not the full
// history) to keep this cheap — see app/dashboard/analytics/page.tsx.
export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  if (!llmConfigured()) {
    return NextResponse.json({ error: "No LLM provider configured" }, { status: 500 });
  }

  const { transcripts } = await req.json();
  if (!Array.isArray(transcripts) || transcripts.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  const callerLines = transcripts
    .flat()
    .filter((l: { speaker: string }) => l.speaker === "caller")
    .map((l: { text: string }) => l.text)
    .join("\n");

  const prompt =
    `Here are caller questions from recent support calls, one per line:\n${callerLines}\n\n` +
    `Cluster these into the 5 most frequently recurring underlying questions/topics. ` +
    `Respond with ONLY a JSON array of up to 5 short strings — no prose, no markdown fences.`;

  try {
    const text = await complete(prompt);
    return NextResponse.json({ questions: extractQuestions(text) });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Clustering failed" },
      { status: 500 },
    );
  }
}
