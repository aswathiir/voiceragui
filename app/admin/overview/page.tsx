"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { TrendingUp, Users, PhoneCall, Activity, ExternalLink, Link2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { MultiOrbit } from "@/components/ui/multi-orbit";
import { Badge } from "@/components/ui/primitives";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function maskNumber(n: string) {
  return n.slice(0, 4) + "***" + n.slice(-3);
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtINR(v: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-indigo-500/15 text-indigo-300",
  starter: "bg-sky-500/15 text-sky-300",
  growth: "bg-emerald-500/15 text-emerald-300",
  scale: "bg-purple-500/15 text-purple-300",
  enterprise: "bg-amber-500/15 text-amber-300",
};

export default function AdminOverview() {
  const { organizations, usageByOrg, suspendOrg, unsuspendOrg } = useAdminStore();
  const { calls } = useCallStore();
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState("");
  const [billing, setBilling] = useState<{ configured: boolean; mrr?: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((res) => res.json())
      .then(setBilling)
      .catch(() => setBilling({ configured: false }));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const totalMRR = organizations.reduce((s, o) => s + o.monthlyFee, 0);
  const totalActiveCalls = Object.values(usageByOrg).reduce((s, u) => s + u.activeCalls, 0);
  const totalCallsMonth = Object.values(usageByOrg).reduce((s, u) => s + u.totalCalls, 0);
  const totalUniqueCallers = Object.values(usageByOrg).reduce((s, u) => s + u.uniqueCallers, 0);

  const activeCalls = calls.filter((c) => c.status === "active");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 relative">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Platform Overview
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          {organizations.length} organizations · {totalUniqueCallers.toLocaleString("en-IN")} unique callers this month
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {billing?.configured && billing.mrr !== undefined ? (
          <StatCard variant="glass" label="Monthly Revenue" value={fmtINR(billing.mrr)} sub="Live from Stripe" icon={TrendingUp} accent="#818cf8" />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Revenue</p>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#818cf822" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "#818cf8" }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{fmtINR(totalMRR)}</p>
            <p className="text-xs mt-0.5 text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Plan estimate — add STRIPE_SECRET_KEY for live revenue
            </p>
          </motion.div>
        )}
        <StatCard variant="glass" label="Unique Callers" value={totalUniqueCallers.toLocaleString("en-IN")} sub="All orgs this month" icon={Users} accent="#34d399" />
        <StatCard variant="glass" label="Active Calls" value={String(totalActiveCalls + activeCalls.length)} sub="Right now" icon={Activity} accent="#f87171" />
        <StatCard variant="glass" label="Calls This Month" value={totalCallsMonth.toLocaleString("en-IN")} sub="Across all orgs" icon={PhoneCall} accent="#60a5fa" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Orgs table — 3 cols */}
        <div className="xl:col-span-3 glass-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-sm font-semibold text-foreground">Organizations</p>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Callers are capped at 3 min/day individually · click row to drill-down
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/6">
                {["Organization", "Plan", "Callers", "Calls used", "Revenue", "Status", ""].map((h) => (
                  <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org, i) => {
                const u = usageByOrg[org.id];
                const pct = u ? u.totalCalls / org.planCallsIncluded : 0;
                const nearLimit = pct > 0.9;
                const suspended = org.status === "suspended";

                return (
                  <motion.tr
                    key={org.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    style={{ opacity: suspended ? 0.45 : 1 }}
                  >
                    <TableCell>
                      <p className="text-xs font-semibold text-foreground">{org.name}</p>
                      {suspended && <p className="text-[10px] text-red-400 mt-0.5">Suspended</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize border-transparent ${PLAN_BADGE[org.plan] ?? PLAN_BADGE.starter}`}>
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold" style={{ color: "#34d399" }}>
                      {u?.uniqueCallers?.toLocaleString("en-IN") ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: nearLimit ? "#fbbf24" : "#e2e8f0" }}>
                      {u ? `${u.totalCalls.toLocaleString()} / ${org.planCallsIncluded.toLocaleString()}` : "—"}
                      {nearLimit && <span className="ml-1 text-[10px] font-bold text-amber-400">⚠ Near limit</span>}
                    </TableCell>
                    <TableCell className="text-xs font-semibold" style={{ color: org.monthlyFee === 0 ? "#a5b4fc" : "#6ee7b7" }}>
                      {org.monthlyFee === 0 ? "Free" : fmtINR(org.monthlyFee)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${suspended ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                        {suspended ? "Suspended" : org.status === "trial" ? "Trial" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0d0d1a] border-white/10 text-foreground">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/customers/${org.id}`} className="flex items-center gap-2">
                              <ExternalLink className="w-3.5 h-3.5" /> View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive={!suspended}
                            onClick={() => {
                              if (suspended) {
                                unsuspendOrg(org.id);
                                showToast(`${org.name} reactivated`);
                              } else {
                                suspendOrg(org.id);
                                showToast(`${org.name} suspended`);
                              }
                            }}
                          >
                            {suspended ? "Reactivate" : "Suspend"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Live call monitor — 2 cols */}
        <div className="xl:col-span-2 glass-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-400"
              style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
            <p className="text-sm font-semibold text-foreground">Live Calls</p>
            <span className="ml-auto text-xs text-muted-foreground">Ticks every 2s</span>
          </div>
          <div>
            {activeCalls.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No active calls right now.
              </div>
            ) : (
              activeCalls.map((call) => {
                const org = organizations.find((o) => o.id === call.customerId);
                const liveDuration = call.durationSeconds + tick;
                const atLimit = liveDuration >= 180;
                const pct = Math.min((liveDuration / 180) * 100, 100);
                const barColor = atLimit ? "#f87171" : pct > 75 ? "#fbbf24" : "#34d399";
                return (
                  <div key={call.id} className="px-5 py-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{org?.name ?? call.customerId}</p>
                        <p className="text-xs text-muted-foreground">
                          Caller: {maskNumber(call.callerNumber)} · {call.language.toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold" style={{ color: barColor }}>
                          {fmt(Math.min(liveDuration, 180))} / 3:00
                        </p>
                        {atLimit && (
                          <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                            LIMIT HIT
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <p className="text-[10px] mt-1 text-muted-foreground">
                      {atLimit ? "Caller reached daily limit" : `${Math.round(180 - liveDuration)}s remaining today`}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Platform orbit + how limit works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-5 pb-0 overflow-hidden">
          <p className="text-sm font-semibold text-foreground">Platform</p>
          <p className="text-xs text-muted-foreground mb-2">Organizations on BeyondForms</p>
          <MultiOrbit
            items={organizations.map((o) => ({
              id: o.id,
              label: o.name
                .split(/[\s,]+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase(),
            }))}
            center={
              <>
                <Activity className="w-5 h-5 text-cyan-400" />
                <p className="text-lg font-bold text-foreground leading-tight">
                  {totalActiveCalls + activeCalls.length}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none">live calls</p>
              </>
            }
          />
        </div>

      <div className="lg:col-span-2 glass-panel rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-3">How the caller limit works</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
          {[
            { n: "1", title: "Organization subscribes", body: "to a BeyondForms plan (e.g., Growth = 5,000 calls/mo)" },
            { n: "2", title: "Any caller (end-user)", body: "dials the AI phone line — no login required" },
            { n: "3", title: "Each unique caller", body: "is limited to 3 minutes total per day across all calls" },
            { n: "4", title: "Monthly quota", body: "decrements; admin sets hard-stop or warning threshold" },
          ].map(({ n, title, body }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 bg-indigo-500/20 text-indigo-400">
                {n}
              </span>
              <p><strong className="text-foreground">{title}</strong> {body}</p>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-xl glass-panel border border-white/15 text-foreground z-50">
          {toast}
        </motion.div>
      )}
    </div>
  );
}
