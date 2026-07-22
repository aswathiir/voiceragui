"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function maskNumber(n: string) { return n.slice(0, 4) + "***" + n.slice(-3); }
function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

export default function AdminCalls() {
  const { organizations } = useAdminStore();
  const { calls } = useCallStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const activeCalls = calls.filter((c) => c.status === "active");

  const getOrgName = (id: string) => organizations.find((o) => o.id === id)?.name ?? id;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Live Calls
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            {activeCalls.length} active call{activeCalls.length !== 1 ? "s" : ""} · caller daily limit 3 min
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-emerald-400"
            style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
          Refreshes every 2s
        </div>
      </div>

      {activeCalls.length === 0 ? (
        <div className="glass-panel rounded-xl flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">No active calls at the moment.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-white/5 border-white/10">
                {["Organization", "Caller (end-user)", "Duration", "Limit progress", "Language", "Status"].map((h) => (
                  <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCalls.map((call) => {
                const liveDuration = call.durationSeconds + tick;
                const atLimit = liveDuration >= 180;
                const pct = Math.min((liveDuration / 180) * 100, 100);
                return (
                  <TableRow key={call.id} className="border-white/5">
                    <TableCell className="font-medium text-xs text-foreground">{getOrgName(call.customerId)}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{maskNumber(call.callerNumber)}</TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm font-semibold ${atLimit ? "text-red-400" : "text-cyan-400"}`}>
                        {fmt(Math.min(liveDuration, 180))}
                      </span>
                      <span className="text-xs ml-1 text-muted-foreground">/ 3:00</span>
                    </TableCell>
                    <TableCell className="w-36">
                      <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: atLimit ? "#f87171" : pct > 75 ? "#fbbf24" : "#fb923c" }} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground">{call.language}</TableCell>
                    <TableCell>
                      {atLimit ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400">LIMIT HIT</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
