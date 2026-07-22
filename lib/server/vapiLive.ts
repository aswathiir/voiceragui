import type { CallRecord, TranscriptLine, CallerDailyUsage } from "./callRepository";

// Live data source for the "vapi_live" demo org: every number comes straight
// from the Vapi account's real call history and billing — nothing seeded.
// Cached 60s to be gentle on Vapi's API.

const USD_TO_INR = 84;

const g = globalThis as unknown as {
  __vapiLive?: { at: number; calls: CallRecord[]; usedUSD: number };
};

export async function fetchVapiLive(): Promise<{ calls: CallRecord[]; usedUSD: number }> {
  if (g.__vapiLive && Date.now() - g.__vapiLive.at < 60_000) return g.__vapiLive;

  const KEY = process.env.VAPI_PRIVATE_API_KEY;
  if (!KEY) return { calls: [], usedUSD: 0 };

  const res = await fetch("https://api.vapi.ai/call?limit=100", {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) return { calls: [], usedUSD: 0 };
  const raw: Record<string, any>[] = await res.json();

  let usedUSD = 0;
  const calls: CallRecord[] = raw
    .filter((c) => c.startedAt)
    .map((c) => {
      const cost = Number(c.cost ?? c.costBreakdown?.total ?? 0);
      usedUSD += cost;
      const dur = c.endedAt
        ? Math.max(0, Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000))
        : 0;
      const transcript: TranscriptLine[] = ((c.artifact?.messages ?? []) as any[])
        .filter((m) => ["user", "assistant", "bot"].includes(m.role))
        .map((m) => ({
          speaker: m.role === "user" ? ("caller" as const) : ("ai" as const),
          text: String(m.message ?? m.content ?? "").trim(),
          timestampSeconds: 0,
        }))
        .filter((l) => l.text);
      return {
        id: `vlive_${c.id}`,
        customerId: "vapi_live",
        callerNumber: c.customer?.number ?? "web:browser",
        startTime: c.startedAt,
        endTime: c.endedAt ?? null,
        durationSeconds: dur,
        status: "completed" as const,
        costINR: Number((cost * USD_TO_INR).toFixed(2)),
        transcript,
        resolvedByAI: true,
        language: "en" as const,
      };
    });

  g.__vapiLive = { at: Date.now(), calls, usedUSD };
  return g.__vapiLive;
}

export async function getVapiLiveUsage() {
  const { calls, usedUSD } = await fetchVapiLive();
  const credit = Number(process.env.VAPI_FREE_CREDIT_USD ?? 10);
  const uniq = new Set(calls.map((c) => c.callerNumber)).size;
  const mins = Math.round(calls.reduce((s, c) => s + c.durationSeconds, 0) / 60);
  return {
    orgId: "vapi_live",
    month: new Date().toISOString().slice(0, 7),
    totalCalls: calls.length,
    totalMinutes: mins,
    callsRemaining: Math.max(0, 5000 - calls.length),
    minutesRemaining: Math.max(0, 10000 - mins),
    // Monthly Spend ring: real credit meter — used vs total free credit (INR)
    estimatedInfraCost: Math.round(usedUSD * USD_TO_INR),
    revenue: Math.round(credit * USD_TO_INR),
    activeCalls: 0,
    uniqueCallers: uniq,
  };
}

export function vapiLiveCallerUsage(calls: CallRecord[]): Record<string, CallerDailyUsage> {
  const usage: Record<string, CallerDailyUsage> = {};
  for (const c of calls) {
    const date = c.startTime.slice(0, 10);
    const key = `${c.callerNumber}_vapi_live_${date}`;
    const e = usage[key] ?? { callerNumber: c.callerNumber, customerId: "vapi_live", date, totalSecondsUsed: 0, callCount: 0, limitReached: false };
    e.totalSecondsUsed = Math.min(e.totalSecondsUsed + c.durationSeconds, 180);
    e.callCount += 1;
    e.limitReached = e.totalSecondsUsed >= 180;
    usage[key] = e;
  }
  return usage;
}
