"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Save, AlertTriangle } from "lucide-react";
import { useAdminStore, PLAN_META } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { StatusBadge } from "@/components/beyondforms/StatusBadge";
import { TranscriptPanel } from "@/components/beyondforms/TranscriptPanel";
import type { CallRecord } from "@/lib/stores/callStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { RippleButton } from "@/components/ui/ripple-button";

const CYAN = "#fb923c";

const CALLS_14D = [
  { date: "12 Jun", calls: 127 }, { date: "13 Jun", calls: 142 },
  { date: "14 Jun", calls: 138 }, { date: "15 Jun", calls: 156 },
  { date: "16 Jun", calls: 98 }, { date: "17 Jun", calls: 112 },
  { date: "18 Jun", calls: 163 }, { date: "19 Jun", calls: 174 },
  { date: "20 Jun", calls: 181 }, { date: "21 Jun", calls: 192 },
  { date: "22 Jun", calls: 145 }, { date: "23 Jun", calls: 167 },
  { date: "24 Jun", calls: 189 }, { date: "25 Jun", calls: 76 },
];

const CUMULATIVE_MINS = [
  { day: "1", minutes: 210 }, { day: "4", minutes: 860 },
  { day: "7", minutes: 1740 }, { day: "10", minutes: 2620 },
  { day: "13", minutes: 3600 }, { day: "16", minutes: 4620 },
  { day: "19", minutes: 5780 }, { day: "22", minutes: 7100 },
  { day: "25", minutes: 7684 },
];

const CHART_TICK = { fontSize: 10, fill: "#8b8fa3" };
const CHART_TOOLTIP = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "#0d0d1a",
  fontSize: 12,
  color: "#e2e8f0",
};

function maskNumber(n: string) { return n.slice(0, 4) + "***" + n.slice(-3); }
function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Tab = "usage" | "callers" | "calls" | "limits";

export default function OrgDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organizations, usageByOrg, suspendOrg, updatePlan } = useAdminStore();
  const { calls, callerDailyUsage } = useCallStore();

  const [tab, setTab] = useState<Tab>("usage");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [hardStop, setHardStop] = useState(false);
  const [monthlyCap, setMonthlyCap] = useState(6000);
  const [saved, setSaved] = useState(false);

  const org = organizations.find((o) => o.id === id);
  const usage = usageByOrg[id ?? ""];
  const orgCalls = calls.filter((c) => c.customerId === id);

  if (!org) return (
    <div className="p-8 text-sm text-muted-foreground">
      Organization not found.{" "}
      <button onClick={() => router.push("/admin/customers")} className="text-cyan-400 hover:text-cyan-300">
        Back
      </button>
    </div>
  );

  // Build per-caller breakdown from callerDailyUsage + orgCalls
  const callerMap: Record<string, { calls: number; seconds: number; limitHit: boolean }> = {};
  orgCalls.forEach((c) => {
    if (!callerMap[c.callerNumber]) callerMap[c.callerNumber] = { calls: 0, seconds: 0, limitHit: false };
    callerMap[c.callerNumber].calls++;
    callerMap[c.callerNumber].seconds += c.durationSeconds;
  });
  // Mark limit hits from callerDailyUsage
  Object.values(callerDailyUsage).forEach((u) => {
    if (u.customerId === id && u.limitReached && callerMap[u.callerNumber]) {
      callerMap[u.callerNumber].limitHit = true;
    }
  });
  const callerRows = Object.entries(callerMap)
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .slice(0, 20);

  const planInfo = PLAN_META[org.plan];
  const fmtINR = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);
  const PLAN_LIMIT_MINS = org.planCallsIncluded * 2;
  const isFree = org.plan === "free";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/overview">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/customers">Organizations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{org.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header card */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
              {org.name}
            </h1>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Joined {new Date(org.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              {" "}·{" "}
              <span style={{ color: planInfo.color, fontWeight: 600 }}>{planInfo.label} plan</span>
              {isFree && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-400">
                  Free Tier
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={org.status} pulse={org.status === "active"} />
            {org.status !== "suspended" && (
              <RippleButton variant="destructive" className="text-xs px-3 py-1.5" onClick={() => suspendOrg(org.id)}>
                Suspend
              </RippleButton>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Plan", value: planInfo.label },
            { label: "Monthly Fee", value: org.monthlyFee === 0 ? "Free" : fmtINR(org.monthlyFee) },
            { label: "Calls Included", value: org.planCallsIncluded.toLocaleString("en-IN") },
            { label: "Unique Callers", value: (usage?.uniqueCallers ?? callerRows.length).toLocaleString("en-IN") },
            { label: "Caller Daily Limit", value: `${org.callerDailyLimitSeconds}s (3 min)` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold mt-0.5 text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Free tier warning */}
        {isFree && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg border border-indigo-400/25 bg-indigo-500/10 text-xs text-indigo-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-indigo-400" />
            <span>
              Free tier: <strong>100 calls/month, English only, 1 KB file</strong>.
              BeyondForms absorbs infra cost (~₹919/mo at current usage).
              Prompt upgrade to Starter (₹74,700/mo) when calls approach 80.
            </span>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
      <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
        {(["usage", "callers", "calls", "limits"] as Tab[]).map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="capitalize data-[state=active]:bg-cyan-400 data-[state=active]:text-black text-muted-foreground"
          >
            {t === "callers" ? `Callers (${callerRows.length})` : t}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ── Usage tab ─────────────────────────────────────────────────────── */}
      <TabsContent value="usage">
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-panel rounded-xl p-5">
              <p className="text-sm font-semibold mb-4 text-foreground">Calls — Last 14 Days</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CALLS_14D} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: "rgba(251,146,60,0.06)" }} />
                  <Bar dataKey="calls" fill={CYAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel rounded-xl p-5">
              <p className="text-sm font-semibold mb-4 text-foreground">Cumulative Minutes — This Month</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={CUMULATIVE_MINS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <ReferenceLine y={PLAN_LIMIT_MINS} stroke="#f87171" strokeDasharray="4 4" label={{ value: "Plan cap", fontSize: 10, fill: "#f87171" }} />
                  <Line type="monotone" dataKey="minutes" stroke={CYAN} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ── Callers tab — per end-user breakdown ──────────────────────────── */}
      <TabsContent value="callers">
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-foreground">End-User (Caller) Breakdown</p>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Each row = one unique phone number that called this org&apos;s AI. 3-min/day limit applies per caller.
            </p>
          </div>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-white/5 border-white/10">
                {["Rank", "Caller (masked)", "Total Calls", "Total Duration", "Avg Duration", "Limit Hit Today"].map((h) => (
                  <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {callerRows.map(([number, data], i) => (
                <TableRow key={number} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-xs text-muted-foreground">#{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{maskNumber(number)}</TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{data.calls}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{fmt(data.seconds)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{fmt(Math.round(data.seconds / data.calls))}</TableCell>
                  <TableCell>
                    {data.limitHit ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ── Calls tab ─────────────────────────────────────────────────────── */}
      <TabsContent value="calls">
        <div className="glass-panel rounded-xl overflow-hidden">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-white/5 border-white/10">
                {["Date / Time", "Caller (end-user)", "Duration", "Status", "Cost", "Resolved", "Lang", ""].map((h) => (
                  <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgCalls.map((c) => (
                <TableRow key={c.id} className="border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelectedCall(c)}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(c.startTime)}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{maskNumber(c.callerNumber)}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{fmt(c.durationSeconds)}</TableCell>
                  <TableCell><StatusBadge status={c.status} pulse={c.status === "active"} /></TableCell>
                  <TableCell className="text-xs font-semibold text-emerald-400">₹{c.costINR.toFixed(2)}</TableCell>
                  <TableCell className={`text-xs ${c.resolvedByAI ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {c.resolvedByAI ? "✓" : "No"}
                  </TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{c.language}</TableCell>
                  <TableCell className="text-xs text-cyan-400">Transcript →</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ── Limits tab ────────────────────────────────────────────────────── */}
      <TabsContent value="limits">
        <div className="max-w-lg space-y-5">
          <div className="glass-panel rounded-xl p-5">
            <p className="text-sm font-semibold mb-2 text-foreground">Caller Daily Limit</p>
            <p className="text-sm text-muted-foreground">
              Each unique end-user (caller) is limited to <strong>3 minutes (180 seconds)</strong> per day.
              This applies across all calls made by that phone number to this organization&apos;s AI line.
            </p>
            <div className="mt-3 flex items-center gap-3 text-sm font-bold text-cyan-400">
              180s per caller per day &mdash; enforced at the call router level
            </div>
          </div>

          <div className="glass-panel rounded-xl p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Monthly Call Quota Override</p>
            <div>
              <label className="text-xs font-medium block mb-1.5 text-muted-foreground">Cap (calls/month)</label>
              <input type="number" value={monthlyCap}
                onChange={(e) => setMonthlyCap(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 transition-colors" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Hard stop at quota</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Off = warning email; On = calls blocked at limit</p>
              </div>
              <button onClick={() => setHardStop((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${hardStop ? "bg-cyan-400" : "bg-white/15"}`}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: hardStop ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>
            <RippleButton
              variant="primary"
              className={saved ? "!bg-emerald-400" : ""}
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
            >
              <Save className="w-4 h-4" />
              {saved ? "Saved!" : "Save Limits"}
            </RippleButton>
          </div>

          {/* Plan upgrade nudge for free tier */}
          {isFree && (
            <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-4 text-xs text-indigo-300">
              <p className="font-semibold mb-1">Free tier limits</p>
              <ul className="space-y-1">
                {PLAN_META.free.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
              <p className="mt-2 text-indigo-400">
                Upgrade to Starter (₹74,700/mo) to unlock 2,500 calls + multi-language.
              </p>
            </div>
          )}
        </div>
      </TabsContent>
      </Tabs>

      <TranscriptPanel
        call={selectedCall ? calls.find((c) => c.id === selectedCall.id) ?? selectedCall : null}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}
