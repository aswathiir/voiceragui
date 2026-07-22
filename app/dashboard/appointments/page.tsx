"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface Appt { id: string; name: string; datetime: string; reason: string; createdAt: string; }

export default function AppointmentsPage() {
  const orgId = useAuthStore((s) => s.user?.customerId);
  const [rows, setRows] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/appointments?orgId=${orgId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRows((d?.appointments ?? []).reverse()))
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
        Appointments
      </h1>
      <p className="text-sm mt-0.5 text-muted-foreground">
        Booking requests the AI captured during calls.
      </p>

      <div className="glass-panel rounded-xl overflow-hidden mt-6">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <CalendarCheck className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No appointments booked yet.</p>
            <p className="text-xs text-muted-foreground/70">When a caller books via the AI, it appears here.</p>
          </div>
        ) : (
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                {["Name", "Date / Time", "Reason", "Booked at"].map((h) => (
                  <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id} className="border-white/5">
                  <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                  <TableCell className="text-cyan-400 font-medium">{a.datetime}</TableCell>
                  <TableCell className="text-muted-foreground">{a.reason || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
