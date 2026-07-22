import { NextRequest, NextResponse } from "next/server";

/** Shape of a single message in the VAPI Chat output array */
interface VapiChatOutputItem {
  role: "assistant" | "user";
  content: string;
}

/** Shape of a successful VAPI Chat API response */
interface VapiChatResponse {
  id: string;
  output: VapiChatOutputItem[];
}

export async function POST(req: NextRequest) {
  // Validate required server-side credentials at request time.
  // Hardcoded fallback values are intentionally removed — the server must
  // be configured via environment variables.
  const VAPI_PRIVATE_API_KEY = process.env.VAPI_PRIVATE_API_KEY;
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  if (!VAPI_PRIVATE_API_KEY || !ASSISTANT_ID) {
    console.error(
      "Missing required env vars: VAPI_PRIVATE_API_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID"
    );
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { question, previousChatId } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      assistantId: ASSISTANT_ID,
      input: question,
    };

    if (previousChatId) {
      payload.previousChatId = previousChatId;
    }

    const response = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`VAPI Chat API responded ${response.status}:`, text);
      return NextResponse.json(
        { error: `VAPI Chat API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data: VapiChatResponse = await response.json();
    // VAPI returns: { id, output: [{ role: 'assistant', content: '...' }] }
    const outputContent = data?.output?.[0]?.content ?? "No output returned from VAPI.";

    return NextResponse.json({
      answer: outputContent,
      chatId: data.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("VAPI Chat Proxy error:", message);
    return NextResponse.json(
      { error: "Could not communicate with VAPI Chat API." },
      { status: 500 }
    );
  }
}
