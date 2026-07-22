"use client";

import { useState } from "react";
import { useAdminStore, PLAN_META } from "@/lib/stores/adminStore";
import { StatusBadge } from "@/components/beyondforms/StatusBadge";
import { Save } from "lucide-react";
import { RippleButton } from "@/components/ui/ripple-button";
import type { OrgPlan } from "@/lib/stores/adminStore";

const PLAN_OPTIONS: OrgPlan[] = ["free", "starter", "growth", "scale", "enterprise"];

export default function AdminLimits() {
  const { organizations, usageByOrg, updatePlan } = useAdminStore();
  const [hardStops, setHardStops] = useState<Record<string, boolean>>({});
  const [caps, setCaps] = useState<Record<string, number>>(() =>
    Object.fromEntries(organizations.map((o) => [o.id, PLAN_META[o.plan].calls])),
  );
  const [savedId, setSavedId] = useState<string | null>(null);

  const saveRow = (id: string) => {
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Plan Limits
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Configure monthly call quotas and enforcement per organization. Caller daily limit is globally 3 min.
        </p>
      </div>

      {/* Global caller limit banner */}
      <div className="mb-6 flex items-start gap-3 p-4 rounded-xl glass-panel">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-cyan-400/15">
          <span className="text-xs font-bold text-cyan-400">3m</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Global Caller Limit: 180 seconds / caller / day</p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Every end-user (caller) who dials any organization&apos;s AI line is limited to 3 minutes total per day.
            This limit is keyed by <code className="bg-white/10 px-1 rounded">callerNumber + orgId + date</code>.
            It applies uniformly across all plans including Free.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {organizations.map((org) => {
          const u = usageByOrg[org.id];
          const cap = caps[org.id] ?? PLAN_META[org.plan].calls;
          const hard = hardStops[org.id] ?? false;
          const isSaved = savedId === org.id;
          const isFree = org.plan === "free";
          const nearLimit = u && cap > 0 && u.totalCalls / cap > 0.8;

          return (
            <div key={org.id} className="glass-panel rounded-xl p-5"
              style={{ opacity: org.status === "suspended" ? 0.6 : 1 }}>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-sm text-foreground">{org.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={org.status} />
                    {isFree && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-400">
                        Free Tier — 100 calls/mo · No charge
                      </span>
                    )}
                    {u && (
                      <span className={`text-xs ${nearLimit ? "text-red-400" : "text-muted-foreground"}`}>
                        {u.totalCalls.toLocaleString("en-IN")} / {cap.toLocaleString("en-IN")} calls used
                        {nearLimit && " ⚠"}
                      </span>
                    )}
                  </div>
                </div>
                <select value={org.plan}
                  onChange={(e) => updatePlan(org.id, e.target.value as OrgPlan)}
                  className="text-sm px-3 py-1.5 rounded-lg outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 [&>option]:bg-neural"
                  disabled={org.status === "suspended"}>
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_META[p].label} — {PLAN_META[p].fee === 0 ? (p === "enterprise" ? "Custom" : "Free") : `₹${(PLAN_META[p].fee / 100).toFixed(0).replace(/\B(?=(\d+)+(?!\d))/g, ",")}₀₀/mo`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Free tier feature list */}
              {isFree && (
                <div className="mb-4 p-3 rounded-lg text-xs border border-indigo-400/25 bg-indigo-500/10">
                  <p className="font-semibold mb-1 text-indigo-300">Free tier restrictions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {PLAN_META.free.features.map((f) => (
                      <p key={f} className="text-indigo-400">• {f}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs font-medium block mb-1.5 text-muted-foreground">
                    Monthly Call Quota
                  </label>
                  <input type="number" value={cap}
                    onChange={(e) => setCaps((v) => ({ ...v, [org.id]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 transition-colors"
                    disabled={org.status === "suspended"} />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5 text-muted-foreground">
                    Caller Daily Limit
                  </label>
                  <div className="px-3 py-2 rounded-lg text-sm border border-white/10 bg-white/5 text-muted-foreground">
                    180s (3 min) — global
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium mb-0.5 text-muted-foreground">Hard stop at quota</p>
                    <button onClick={() => setHardStops((v) => ({ ...v, [org.id]: !v[org.id] }))}
                      disabled={org.status === "suspended"}
                      className={`w-11 h-6 rounded-full transition-colors relative ${hard ? "bg-cyan-400" : "bg-white/15"}`}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                        style={{ transform: hard ? "translateX(22px)" : "translateX(2px)" }} />
                    </button>
                  </div>
                  <RippleButton
                    variant="primary"
                    className={`text-sm px-4 py-2 ${isSaved ? "!bg-emerald-400" : ""}`}
                    onClick={() => saveRow(org.id)}
                    disabled={org.status === "suspended"}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaved ? "Saved!" : "Save"}
                  </RippleButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
