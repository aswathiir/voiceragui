import { NextRequest, NextResponse } from "next/server";
import { getCalls, getCallerDailyUsage, addCall } from "@/lib/server/callRepository";
import type { TranscriptLine } from "@/lib/server/callRepository";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { fetchVapiLive, vapiLiveCallerUsage } from "@/lib/server/vapiLive";

// GET /api/calls — customer sees their own org's calls; super_admin sees all
// (or one org via ?orgId=).
export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const orgId =
    session.role === "super_admin"
      ? req.nextUrl.searchParams.get("orgId") ?? undefined
      : session.customerId ?? "__none__";

  // The demo org's call log is the REAL Vapi account history, live.
  if (orgId === "vapi_live") {
    const { calls } = await fetchVapiLive();
    return NextResponse.json({ calls, callerDailyUsage: vapiLiveCallerUsage(calls) });
  }

  return NextResponse.json({
    calls: getCalls(orgId),
    callerDailyUsage: getCallerDailyUsage(orgId),
  });
}

// POST /api/calls — record a finished call (the web call page posts its
// transcript when a Vapi call ends). Customers can only write to their own org.
export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const body = await req.json();
  const customerId =
    session.role === "super_admin" ? (body.customerId as string) : session.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "No organization for this session" }, { status: 400 });
  }

  const transcript: TranscriptLine[] = Array.isArray(body.transcript) ? body.transcript : [];
  const durationSeconds = Number(body.durationSeconds) || 0;
  const startTime =
    typeof body.startTime === "string"
      ? body.startTime
      : new Date(Date.now() - durationSeconds * 1000).toISOString();

  const record = addCall({
    customerId,
    callerNumber: typeof body.callerNumber === "string" ? body.callerNumber : "web:dashboard",
    startTime,
    endTime: new Date().toISOString(),
    durationSeconds,
    status: body.status === "dropped" ? "dropped" : "completed",
    transcript,
    resolvedByAI: Boolean(body.resolvedByAI),
    language: ["en", "ml", "ar"].includes(body.language) ? body.language : "en",
  });

  return NextResponse.json({ call: record });
}
