"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCallStore } from "@/lib/stores/callStore";
import { StatusBadge } from "@/components/beyondforms/StatusBadge";
import { SentimentBadge } from "@/components/beyondforms/SentimentBadge";
import { TranscriptPanel } from "@/components/beyondforms/TranscriptPanel";
import type { CallRecord } from "@/lib/stores/callStore";
import { Search, PhoneCall, Sparkles, Wallet, Download, FileDown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { downloadCSV, downloadText } from "@/lib/utils/exportCsv";

function maskNumber(n: string) {
  return n.slice(0, 4) + "***" + n.slice(-3);
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function CallsPage() {
  const { user } = useAuthStore();
  const { calls } = useCallStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const customerId = user?.customerId ?? "cust_001";

  const customerCalls = calls
    .filter((c) => c.customerId === customerId)
    .filter((c) => {
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchSearch =
        c.callerNumber.includes(search) || c.language.includes(search.toLowerCase());
      return matchStatus && matchSearch;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Summary stats
  const total = calls.filter((c) => c.customerId === customerId);
  const resolved = total.filter((c) => c.resolvedByAI).length;
  const totalCost = total.reduce((s, c) => s + c.costINR, 0);

  const exportCSV = () => {
    downloadCSV(
      `calls_${customerId}_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date/Time", "Caller", "Duration (s)", "Status", "Sentiment", "Cost (INR)", "AI Resolved", "Language"],
      customerCalls.map((c) => [
        c.startTime, maskNumber(c.callerNumber), c.durationSeconds, c.status,
        c.sentiment ?? "", c.costINR.toFixed(2), c.resolvedByAI ? "Yes" : "No", c.language,
      ]),
    );
  };

  const exportTranscript = (c: CallRecord) => {
    const lines = c.transcript.map((t) => `[${t.speaker}] ${t.text}`).join("\n");
    downloadText(`transcript_${c.id}.txt`, `Call ${c.id} — ${maskNumber(c.callerNumber)} — ${fmtDate(c.startTime)}\n\n${lines}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Call History
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            All calls for your account — last 7 days
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={customerCalls.length === 0}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed w-fit"
        >
          <FileDown className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Calls" value={total.length} icon={PhoneCall} />
        <StatCard label="Resolved by AI" value={`${resolved} (${total.length ? Math.round((resolved / total.length) * 100) : 0}%)`} icon={Sparkles} />
        <StatCard label="Total Cost" value={`₹${totalCost.toFixed(0)}`} icon={Wallet} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 [&>option]:bg-neural w-fit"
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="limit_reached">Limit reached</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>

      {/* Call table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-white/5 border-white/10">
              {["Date / Time", "Caller", "Duration", "Status", "Sentiment", "Cost", "AI Resolved", "Lang", ""].map((h) => (
                <TableHead key={h} className="text-muted-foreground">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerCalls.map((c) => (
              <TableRow
                key={c.id}
                className="border-white/5 hover:bg-white/5 cursor-pointer"
                onClick={() => setSelectedCall(c)}
              >
                <TableCell className="text-xs text-muted-foreground">{fmtDate(c.startTime)}</TableCell>
                <TableCell className="font-mono text-xs text-foreground">{maskNumber(c.callerNumber)}</TableCell>
                <TableCell className="font-mono text-xs text-foreground">{fmt(c.durationSeconds)}</TableCell>
                <TableCell><StatusBadge status={c.status} pulse={c.status === "active"} /></TableCell>
                <TableCell>{c.sentiment ? <SentimentBadge sentiment={c.sentiment} /> : <span className="text-xs text-muted-foreground/50">—</span>}</TableCell>
                <TableCell className="text-xs font-semibold text-emerald-400">₹{c.costINR.toFixed(2)}</TableCell>
                <TableCell className={`text-xs ${c.resolvedByAI ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {c.resolvedByAI ? "✓ Yes" : "No"}
                </TableCell>
                <TableCell className="text-xs uppercase text-muted-foreground">{c.language}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-cyan-400">Transcript →</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportTranscript(c); }}
                      title="Download transcript"
                      className="text-muted-foreground hover:text-cyan-400 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resolve the selected call from the live store so AI analysis results
          (summary/sentiment/analyzing spinner) appear in the open panel the
          moment they land — a stale snapshot here made the Generate button
          look broken. */}
      <TranscriptPanel
        call={selectedCall ? calls.find((c) => c.id === selectedCall.id) ?? selectedCall : null}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}
