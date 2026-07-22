import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { getOrganizations } from "@/lib/server/adminRepository";
import { buildAssistantOverrides, resolvePublicOrigin } from "@/lib/server/assistantOverrides";

// GET /api/calls/overrides — returns the per-call Vapi assistantOverrides for
// a browser call, so it matches the phone-call behaviour exactly. Logged-in
// dashboard uses the session org; the public patient page passes ?orgId=.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  const orgId = session?.customerId ?? req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const org = getOrganizations().find((o) => o.id === orgId);
  if (org?.status === "suspended") {
    return NextResponse.json({ error: "This line is currently unavailable" }, { status: 403 });
  }

  const overrides = buildAssistantOverrides(orgId, resolvePublicOrigin(req.nextUrl.origin));
  return NextResponse.json({ overrides });
}
