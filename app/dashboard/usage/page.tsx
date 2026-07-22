"use client";

import { useEffect, useState } from "react";
import { Gauge, PhoneCall, Clock, Wallet, BarChart2, RefreshCw, FileDown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useAuthStore } from "@/lib/stores/authStore";
import { downloadCSV } from "@/lib/utils/exportCsv";

interface UsageCall {
  id: string; type: string; startedAt: string | null;
  durationSeconds: number; costUSD: number; endedReason: string; toNumber: string | null;
}
interface Usage {
  creditUSD: number; usedUSD: number; remainingUSD: number;
  totalCalls: number; totalMinutes: number; calls: UsageCall[]; fetchedAt: string;
}

function fmtDur(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

export default function UsagePage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/vapi/usage")
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e.error))))
      .then(setData)
      .catch((e) => setError(String(e ?? "Failed to load usage")))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayCalls = data?.calls.filter((c) => c.startedAt?.slice(0, 10) === today) ?? [];
  const todayMinutes = todayCalls.reduce((s, c) => s + c.durationSeconds, 0) / 60;

  const pct = data ? Math.min(100, (data.usedUSD / data.creditUSD) * 100) : 0;
  const barColor = pct >= 90 ? "#f87171" : pct >= 70 ? "#fbbf24" : "#fb923c";

  const exportCSV = () => {
    if (!data) return;
    downloadCSV(
      `usage_${new Date().toISOString().slice(0, 10)}.csv`,
      ["When", "Type", "To", "Duration (s)", "Cost (USD)", "Ended Reason"],
      data.calls.map((c) => [c.startedAt ?? "", c.type, c.toNumber ?? "", c.durationSeconds, c.costUSD.toFixed(4), c.endedReason]),
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header — same format as Home */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Live Usage — {user?.name ?? "Your Account"}
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Straight from your Vapi account — real calls, real billed cost. Nothing static.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportCSV} disabled={!data} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed w-fit">
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 w-fit">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="glass-panel rounded-xl p-4 text-sm text-red-400">{error}</div>}

      {data && (
        <>
          {/* KPI cards — same grid as Home, real values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard label="Calls Today" value={todayCalls.length} sub="Real Vapi calls" icon={PhoneCall} />
            <StatCard label="Minutes Today" value={todayMinutes.toFixed(1)} sub="Billed talk time" icon={Clock} />
            <StatCard label="Total Calls" value={data.totalCalls} sub="All time on this account" icon={BarChart2} accent="#818cf8" />
            <StatCard label="Credit Left" value={`$${data.remainingUSD.toFixed(2)}`} sub={`of $${data.creditUSD.toFixed(2)} free tier`} icon={Wallet} accent={barColor} />
          </div>

          {/* Meter panel + call table — same split as Home */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4 text-cyan-400" /> Usage Meter
              </p>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold" style={{ color: barColor }}>${data.usedUSD.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">used of ${data.creditUSD.toFixed(2)} credit</p>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 12px ${barColor}66` }} />
              </div>
              <p className="text-xs mt-3 text-center text-muted-foreground">
                <span className="text-emerald-400 font-semibold">${data.remainingUSD.toFixed(2)} remaining</span> · {pct.toFixed(1)}% consumed
              </p>
              <p className="text-[10px] mt-2 text-center text-muted-foreground/60">
                {data.totalMinutes} min total · updated {new Date(data.fetchedAt).toLocaleTimeString("en-IN")}
              </p>
            </div>

            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-sm font-semibold text-foreground">Call Ledger</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Every call Vapi billed — cost deducts from your credit above</p>
              </div>
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    {["When", "Type", "To", "Duration", "Cost"].map((h) => (
                      <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.calls.map((c) => (
                    <TableRow key={c.id} className="border-white/5">
                      <TableCell className="text-xs text-muted-foreground">
                        {c.startedAt ? new Date(c.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === "webCall" ? "bg-indigo-500/15 text-indigo-400" : "bg-cyan-400/10 text-cyan-400"}`}>
                          {c.type === "webCall" ? "Browser" : "Phone"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{c.toNumber ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{fmtDur(c.durationSeconds)}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-cyan-400">${c.costUSD.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
