import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";

// Live usage straight from the Vapi account: every real call with its actual
// billed cost, aggregated into a credit meter. Free tier credit is $10 by
// default (override with VAPI_FREE_CREDIT_USD). Cached for 60s.

interface UsageCall {
  id: string;
  type: string;
  startedAt: string | null;
  durationSeconds: number;
  costUSD: number;
  endedReason: string;
  toNumber: string | null;
}

const globalForUsage = globalThis as unknown as {
  __vapiUsage?: { at: number; data: unknown };
};

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const cached = globalForUsage.__vapiUsage;
  if (cached && Date.now() - cached.at < 60_000) {
    return NextResponse.json(cached.data);
  }

  const KEY = process.env.VAPI_PRIVATE_API_KEY;
  if (!KEY) return NextResponse.json({ error: "Vapi not configured" }, { status: 500 });

  const res = await fetch("https://api.vapi.ai/call?limit=100", {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Vapi returned ${res.status}` }, { status: 502 });
  }
  const raw: Record<string, unknown>[] = await res.json();

  const calls: UsageCall[] = raw.map((c) => {
    const started = c.startedAt as string | null;
    const ended = c.endedAt as string | null;
    const dur =
      started && ended
        ? Math.max(0, Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000))
        : 0;
    return {
      id: String(c.id),
      type: String(c.type ?? "call"),
      startedAt: started,
      durationSeconds: dur,
      costUSD: Number(c.cost ?? (c.costBreakdown as { total?: number })?.total ?? 0),
      endedReason: String(c.endedReason ?? c.status ?? ""),
      toNumber: ((c.customer as { number?: string }) ?? {}).number ?? null,
    };
  });

  const totalCost = calls.reduce((s, c) => s + c.costUSD, 0);
  const totalSeconds = calls.reduce((s, c) => s + c.durationSeconds, 0);
  const credit = Number(process.env.VAPI_FREE_CREDIT_USD ?? 10);

  const data = {
    creditUSD: credit,
    usedUSD: Number(totalCost.toFixed(4)),
    remainingUSD: Number(Math.max(0, credit - totalCost).toFixed(4)),
    totalCalls: calls.length,
    totalMinutes: Number((totalSeconds / 60).toFixed(1)),
    calls,
    fetchedAt: new Date().toISOString(),
  };
  globalForUsage.__vapiUsage = { at: Date.now(), data };
  return NextResponse.json(data);
}
