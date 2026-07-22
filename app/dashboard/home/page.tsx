"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { CostRing } from "@/components/beyondforms/CostRing";
import { PhoneCall, Clock, BarChart2, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { MultiOrbit } from "@/components/ui/multi-orbit";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function maskNumber(n: string) {
  return n.slice(0, 4) + "***" + n.slice(-3);
}

export default function CustomerHome() {
  const { user } = useAuthStore();
  const { usageByOrg } = useAdminStore();
  const { calls, callerDailyUsage } = useCallStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const customerId = user?.customerId ?? "cust_001";
  const today = new Date().toISOString().slice(0, 10);

  const usage = usageByOrg[customerId];

  const todayCalls = calls.filter(
    (c) => c.customerId === customerId && c.startTime.slice(0, 10) === today,
  );

  const todayMinutes = todayCalls.reduce((s, c) => s + c.durationSeconds, 0) / 60;
  const monthCallCount = usage?.totalCalls ?? 0;

  // Unique callers today with their usage
  const callerKeys = Object.keys(callerDailyUsage).filter(
    (k) => k.includes(`_${customerId}_${today}`),
  );

  const callerRows = callerKeys.map((key) => {
    const u = callerDailyUsage[key];
    const activeCalls = calls.filter(
      (c) => c.callerNumber === u.callerNumber && c.status === "active",
    );
    const isActive = activeCalls.length > 0;
    const liveDuration = isActive ? activeCalls[0].durationSeconds + tick : u.totalSecondsUsed;
    const liveRemaining = Math.max(0, 180 - liveDuration);
    return { ...u, remaining: liveRemaining, isActive };
  });

  const planFee = usage?.revenue ?? 149400;
  const monthCost = usage?.estimatedInfraCost ?? 0;
  const uniqueCallers = usage?.uniqueCallers ?? callerRows.length;

  const remainingColor = (rem: number) => {
    if (rem === 0) return "#f87171";
    if (rem < 120) return "#fbbf24";
    return "#34d399";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Welcome back, {user?.name ?? "Hospital"}
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Calls Today" value={todayCalls.length} sub="All statuses" icon={PhoneCall} />
        <StatCard label="Minutes Today" value={todayMinutes.toFixed(1)} sub="Billable minutes" icon={Clock} />
        <StatCard label="Unique Callers" value={uniqueCallers.toLocaleString("en-IN")} sub="End-users this month" icon={Users} accent="#818cf8" />
        <StatCard label="Calls This Month" value={monthCallCount.toLocaleString("en-IN")} sub="Across this org" icon={BarChart2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost ring + live caller orbit */}
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-semibold mb-4 text-foreground">Monthly Spend</p>
            <CostRing used={monthCost} total={planFee} size={180} />
            <p className="text-xs mt-4 text-center text-muted-foreground">
              Plan: ₹{(planFee / 100).toFixed(0).replace(/\B(?=(\d+)+(?!\d))/g, ",")} / month
            </p>
          </div>

          <div className="glass-panel rounded-xl p-6 pb-0 overflow-hidden">
            <p className="text-sm font-semibold text-foreground">Your AI Line</p>
            <p className="text-xs text-muted-foreground mb-2">
              {callerRows.length > 0 ? "Callers orbiting today" : "Recent callers on your line"}
            </p>
            {(() => {
              const orbitNumbers =
                callerRows.length > 0
                  ? callerRows.map((r) => r.callerNumber)
                  : Array.from(
                      new Set(
                        calls.filter((c) => c.customerId === customerId).map((c) => c.callerNumber),
                      ),
                    );
              return (
                <MultiOrbit
                  items={orbitNumbers.slice(0, 8).map((n) => ({ id: n, label: n.slice(-2) }))}
                  center={
                    <>
                      <PhoneCall className="w-5 h-5 text-cyan-400" />
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {orbitNumbers.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-none">
                        {callerRows.length > 0 ? "callers today" : "recent callers"}
                      </p>
                    </>
                  }
                />
              );
            })()}
          </div>
        </div>

        {/* Caller activity table */}
        <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-foreground">Today&apos;s End-User (Caller) Activity</p>
            <p className="text-xs mt-0.5 text-muted-foreground">Each unique caller (end-user) is limited to <strong>3 minutes / day</strong> on your AI line</p>
          </div>
          {callerRows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No caller activity yet today.
            </div>
          ) : (
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="bg-white/5 border-white/10">
                  {["Caller", "Calls", "Used", "Remaining", "Status"].map((h) => (
                    <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {callerRows.map((row) => {
                  const statusLabel =
                    row.remaining === 0
                      ? "Limit reached"
                      : row.remaining < 60
                      ? "Near limit"
                      : "OK";
                  const statusClass =
                    row.remaining === 0
                      ? "bg-red-500/15 text-red-400"
                      : row.remaining < 60
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-emerald-500/15 text-emerald-400";
                  return (
                    <TableRow key={row.callerNumber} className="border-white/5">
                      <TableCell className="font-mono text-xs text-foreground">
                        {maskNumber(row.callerNumber)}
                        {row.isActive && (
                          <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.callCount}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {fmt(Math.min(180 - row.remaining, 180))}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold" style={{ color: remainingColor(row.remaining) }}>
                        {row.remaining === 0 ? "—" : fmt(row.remaining)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
