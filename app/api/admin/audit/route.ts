import { NextRequest, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/server/auditRepository";
import { requireRole, isNextResponse } from "@/lib/server/session";

// GET /api/admin/audit — super_admin only. Read-only trail of logins and
// org status/plan changes; has no write path from the call/voice pipeline.
export async function GET(req: NextRequest) {
  const session = requireRole(req, "super_admin");
  if (isNextResponse(session)) return session;

  return NextResponse.json({ entries: getAuditLog() });
}
