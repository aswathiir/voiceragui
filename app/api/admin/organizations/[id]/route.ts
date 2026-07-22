import { NextRequest, NextResponse } from "next/server";
import { updateOrganization, type OrgStatus, type OrgPlan } from "@/lib/server/adminRepository";
import { PLAN_META } from "@/lib/stores/adminStore";
import { requireRole, isNextResponse } from "@/lib/server/session";
import { addAuditEntry } from "@/lib/server/auditRepository";

interface PatchBody {
  status?: OrgStatus;
  plan?: OrgPlan;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireRole(req, "super_admin");
  if (isNextResponse(session)) return session;

  const body: PatchBody = await req.json();

  const patch: Parameters<typeof updateOrganization>[1] = {};
  if (body.status) patch.status = body.status;
  if (body.plan) {
    patch.plan = body.plan;
    patch.planCallsIncluded = PLAN_META[body.plan].calls;
    patch.monthlyFee = PLAN_META[body.plan].fee;
  }

  const updated = updateOrganization(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (body.status) {
    addAuditEntry({
      actorEmail: session.sub,
      actorRole: "super_admin",
      action: body.status === "suspended" ? "org_suspended" : "org_status_changed",
      targetOrgId: params.id,
      details: `status -> ${body.status}`,
    });
  }
  if (body.plan) {
    addAuditEntry({
      actorEmail: session.sub,
      actorRole: "super_admin",
      action: "org_plan_changed",
      targetOrgId: params.id,
      details: `plan -> ${body.plan}`,
    });
  }

  return NextResponse.json({ organization: updated });
}
