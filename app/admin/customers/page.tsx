"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminStore, PLAN_META } from "@/lib/stores/adminStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { StatusBadge } from "@/components/beyondforms/StatusBadge";
import { ChevronRight, Search, Users, UserCog, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AdminOrganizations() {
  const { organizations, usageByOrg } = useAdminStore();
  const { impersonate } = useAuthStore();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleImpersonate = (orgId: string) => {
    impersonate(orgId);
    router.push("/dashboard/home");
  };

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  const fmtINR = (v: number) =>
    "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

  const getQuotaColor = (used: number, total: number) => {
    const pct = total > 0 ? used / total : 0;
    if (pct >= 0.9) return "#f87171";
    if (pct >= 0.7) return "#fbbf24";
    return "#34d399";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Organizations
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            {organizations.length} organizations — each has N callers (end-users) with a 3-min/day limit
          </p>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground outline-none focus:border-cyan-400/50 transition-colors"
          />
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="bg-white/5 border-white/10">
              {["Organization", "Plan", "Status", "Unique Callers", "Calls Used / Quota", "Revenue", "Caller Limit", ""].map((h) => (
                <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((org) => {
              const u = usageByOrg[org.id];
              const planInfo = PLAN_META[org.plan];
              const usedCalls = u?.totalCalls ?? 0;
              const quotaColor = getQuotaColor(usedCalls, org.planCallsIncluded);

              return (
                <TableRow
                  key={org.id}
                  className="border-white/5 hover:bg-white/5"
                  style={{ opacity: org.status === "suspended" ? 0.55 : 1 }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-cyan-400/25">
                        <AvatarFallback className="text-[10px]">
                          {org.name
                            .split(/[\s,]+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{org.name}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">{org.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{ backgroundColor: planInfo.color + "22", color: planInfo.color }}
                    >
                      {planInfo.label}
                    </span>
                    {org.plan === "free" && (
                      <p className="text-[10px] mt-0.5 text-indigo-400">Free tier</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} pulse={org.status === "active"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-sm font-semibold text-foreground">
                        {u?.uniqueCallers?.toLocaleString("en-IN") ?? "0"}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-muted-foreground">end-users this month</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: quotaColor }}>
                        {usedCalls.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {org.planCallsIncluded.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="w-32 h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((usedCalls / org.planCallsIncluded) * 100, 100)}%`,
                          backgroundColor: quotaColor,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {org.monthlyFee === 0 ? (
                      <span className="font-semibold text-indigo-400">Free</span>
                    ) : (
                      <span className="font-semibold text-emerald-400">
                        {fmtINR(org.monthlyFee)}<span className="text-muted-foreground font-normal">/mo</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground">3 min</span>
                    <span className="text-[10px] ml-1">/ caller / day</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-neural border-white/10 text-foreground">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/customers/${org.id}`} className="flex items-center gap-2">
                            <ChevronRight className="w-3.5 h-3.5" /> View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImpersonate(org.id)} className="flex items-center gap-2">
                          <UserCog className="w-3.5 h-3.5" /> Log in as
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Free tier explainer */}
      <div className="mt-4 flex items-start gap-3 p-4 rounded-xl glass-panel">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-500/20">
          <span className="text-xs font-bold text-indigo-400">F</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Free tier — {PLAN_META.free.calls} calls/month, no charge</p>
          <p className="text-xs mt-1 text-muted-foreground">
            {PLAN_META.free.features.join(" · ")}. Free tier organizations are subsidised by BeyondForms to drive adoption.
            Monthly infra cost (~₹919 for 67 calls) is absorbed by BeyondForms until the org upgrades.
          </p>
        </div>
      </div>
    </div>
  );
}
