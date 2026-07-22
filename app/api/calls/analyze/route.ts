import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { complete, llmConfigured, LLMError } from "@/lib/server/llm";

export type Sentiment = "positive" | "neutral" | "negative" | "frustrated";

interface AnalyzeResult {
  summary: string;
  intent: string;
  sentiment: Sentiment;
}

const VALID_SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative", "frustrated"];

function extractJSON(text: string): AnalyzeResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (
      typeof parsed.summary === "string" &&
      typeof parsed.intent === "string" &&
      VALID_SENTIMENTS.includes(parsed.sentiment)
    ) {
      return parsed as AnalyzeResult;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  if (!llmConfigured()) {
    return NextResponse.json({ error: "No LLM provider configured" }, { status: 500 });
  }

  const { transcript } = await req.json();
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const transcriptText = transcript
    .map((l: { speaker: string; text: string }) => `${l.speaker === "ai" ? "Agent" : "Caller"}: ${l.text}`)
    .join("\n");

  const prompt =
    `Analyze this call transcript and respond with ONLY a JSON object — no prose, no markdown fences — ` +
    `shaped exactly like {"summary": string (max 25 words), "intent": string (max 8 words), "sentiment": "positive"|"neutral"|"negative"|"frustrated"}.\n\n` +
    `Transcript:\n${transcriptText}`;

  try {
    const text = await complete(prompt);
    const result = extractJSON(text);
    if (!result) {
      return NextResponse.json({ error: "Could not parse analysis" }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
