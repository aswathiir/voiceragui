import { NextRequest, NextResponse } from "next/server";
import { getOrganizations } from "@/lib/server/adminRepository";
import { requireSession, isNextResponse } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  return NextResponse.json({ organizations: getOrganizations() });
}
