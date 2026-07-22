import { NextRequest, NextResponse } from "next/server";
import { addCall, type TranscriptLine } from "@/lib/server/callRepository";

// Vapi posts an "end-of-call-report" here when any phone/web call ends. We
// log the call + transcript to the org's call repository so it shows up in
// /dashboard/calls, analytics, and the admin views. orgId rides on the call
// metadata we set when placing/starting the call.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = body?.message ?? body;
  if (msg?.type !== "end-of-call-report") {
    // Ignore status-update / transcript / speech-update events.
    return NextResponse.json({ ok: true });
  }

  const call = msg.call ?? {};
  const orgId =
    call?.metadata?.orgId ??
    call?.assistantOverrides?.metadata?.orgId ??
    msg?.assistant?.metadata?.orgId ??
    null;
  if (!orgId) return NextResponse.json({ ok: true, skipped: "no orgId" });

  // Transcript: Vapi provides artifact.messages (role/message) — map to our shape.
  const raw: any[] = msg?.artifact?.messages ?? msg?.messages ?? [];
  const startedAt = msg.startedAt ?? call.startedAt ?? new Date().toISOString();
  const startMs = new Date(startedAt).getTime();
  const transcript: TranscriptLine[] = raw
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "bot")
    .map((m) => ({
      speaker: m.role === "user" ? ("caller" as const) : ("ai" as const),
      text: String(m.message ?? m.content ?? "").trim(),
      timestampSeconds: m.time ? Math.max(0, Math.round((m.time - startMs) / 1000)) : 0,
    }))
    .filter((l) => l.text.length > 0);

  const durationSeconds =
    Math.round(
      msg.durationSeconds ??
        (msg.endedAt ? (new Date(msg.endedAt).getTime() - startMs) / 1000 : 0),
    ) || transcript.length * 8;

  const callerNumber =
    call?.customer?.number ?? msg?.customer?.number ?? "web:browser";

  addCall({
    customerId: orgId,
    callerNumber,
    startTime: startedAt,
    endTime: msg.endedAt ?? new Date().toISOString(),
    durationSeconds,
    status: "completed",
    transcript,
    resolvedByAI: msg.endedReason !== "customer-ended-call" ? true : transcript.length > 2,
    language: "en",
  });

  return NextResponse.json({ ok: true, logged: true });
}
