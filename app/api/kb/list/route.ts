import { NextRequest, NextResponse } from "next/server";
import { listKBFiles } from "@/lib/server/kbRepository";
import { requireSession, isNextResponse } from "@/lib/server/session";

// GET /api/kb/list — the org's uploaded documents from the durable registry.
export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const orgId =
    session.role === "super_admin"
      ? req.nextUrl.searchParams.get("orgId")
      : session.customerId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  return NextResponse.json({ files: listKBFiles(orgId) });
}
