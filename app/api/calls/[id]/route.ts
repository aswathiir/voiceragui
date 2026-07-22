import { NextRequest, NextResponse } from "next/server";
import { getCalls, updateCall } from "@/lib/server/callRepository";
import { requireSession, isNextResponse } from "@/lib/server/session";

// PATCH /api/calls/[id] — persist AI analysis results (summary/intent/sentiment)
// onto a call record. Customers can only touch their own org's calls.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const existing = getCalls().find((c) => c.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  if (session.role !== "super_admin" && existing.customerId !== session.customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const patch: Parameters<typeof updateCall>[1] = {};
  if (typeof body.aiSummary === "string") patch.aiSummary = body.aiSummary;
  if (typeof body.aiIntent === "string") patch.aiIntent = body.aiIntent;
  if (["positive", "neutral", "negative", "frustrated"].includes(body.sentiment)) {
    patch.sentiment = body.sentiment;
  }

  const updated = updateCall(params.id, patch);
  return NextResponse.json({ call: updated });
}
