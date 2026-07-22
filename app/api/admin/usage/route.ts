import { NextRequest, NextResponse } from "next/server";
import { getUsage } from "@/lib/server/adminRepository";
import { getVapiLiveUsage } from "@/lib/server/vapiLive";
import { requireSession, isNextResponse } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const usageByOrg = { ...getUsage() };
  try {
    usageByOrg["vapi_live"] = await getVapiLiveUsage();
  } catch { /* demo org just shows zeros if Vapi is unreachable */ }
  return NextResponse.json({ usageByOrg });
}
