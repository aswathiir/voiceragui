"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";

interface AuditEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: "super_admin" | "customer" | "system";
  action: string;
  targetOrgId?: string;
  details?: string;
}

const ACTION_LABEL: Record<string, string> = {
  login: "Login",
  login_failed: "Failed login",
  org_suspended: "Organization suspended",
  org_status_changed: "Organization status changed",
  org_plan_changed: "Plan changed",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/audit")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const failedLogins = entries.filter((e) => e.action === "login_failed").length;
  const orgChanges = entries.filter((e) => e.action.startsWith("org_")).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Audit Log
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Every login and organization-level change, most recent first. File-backed and append-only.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 w-fit">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Total Events" value={entries.length} sub="Since server start / seed" icon={ShieldCheck} />
        <StatCard label="Failed Logins" value={failedLogins} sub="Invalid credential attempts" icon={ShieldCheck} accent={failedLogins > 0 ? "#f87171" : undefined} />
        <StatCard label="Org Changes" value={orgChanges} sub="Suspend / status / plan" icon={ShieldCheck} />
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {["When", "Actor", "Role", "Action", "Org", "Details"].map((h) => (
                <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id} className="border-white/5">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.timestamp)}</TableCell>
                <TableCell className="text-xs font-mono text-foreground">{e.actorEmail}</TableCell>
                <TableCell>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">
                    {e.actorRole}
                  </span>
                </TableCell>
                <TableCell className={`text-xs font-medium ${e.action === "login_failed" ? "text-red-400" : "text-foreground"}`}>
                  {ACTION_LABEL[e.action] ?? e.action}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.targetOrgId ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.details ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
