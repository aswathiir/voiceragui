"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCallStore } from "@/lib/stores/callStore";
import { Search, Shield, ShieldOff, Users, Clock, Phone } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const CYAN = "#fb923c";

function maskNumber(n: string) {
  return n.slice(0, 4) + " " + n.slice(4, 7) + "*** " + n.slice(-3);
}

function fmt(s: number) {
  if (s === 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type FilterStatus = "all" | "active" | "near_limit" | "limit_reached" | "blocked";

interface CallerProfile {
  number: string;
  totalCalls: number;
  totalSecondsAllTime: number;
  firstSeenDate: string;
  lastSeenDate: string;
  todaySecondsUsed: number;
  todayLimitReached: boolean;
  isBlocked: boolean;
  isVIP: boolean; // VIPs get double the daily limit in this config
}

export default function UsersPage() {
  const { user } = useAuthStore();
  const { calls, callerDailyUsage } = useCallStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const [vip, setVip] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const customerId = user?.customerId ?? "cust_001";
  const today = new Date().toISOString().slice(0, 10);

  // Build caller profile map from all calls
  const profileMap: Record<string, CallerProfile> = {};

  calls
    .filter((c) => c.customerId === customerId)
    .forEach((c) => {
      if (!profileMap[c.callerNumber]) {
        profileMap[c.callerNumber] = {
          number: c.callerNumber,
          totalCalls: 0,
          totalSecondsAllTime: 0,
          firstSeenDate: c.startTime,
          lastSeenDate: c.startTime,
          todaySecondsUsed: 0,
          todayLimitReached: false,
          isBlocked: false,
          isVIP: false,
        };
      }
      const p = profileMap[c.callerNumber];
      p.totalCalls++;
      p.totalSecondsAllTime += c.durationSeconds;
      if (c.startTime < p.firstSeenDate) p.firstSeenDate = c.startTime;
      if (c.startTime > p.lastSeenDate) p.lastSeenDate = c.startTime;
    });

  // Overlay today's daily usage
  Object.values(callerDailyUsage)
    .filter((u) => u.customerId === customerId && u.date === today)
    .forEach((u) => {
      if (profileMap[u.callerNumber]) {
        profileMap[u.callerNumber].todaySecondsUsed = u.totalSecondsUsed;
        profileMap[u.callerNumber].todayLimitReached = u.limitReached;
      }
    });

  const profiles = Object.values(profileMap)
    .map((p) => ({
      ...p,
      isBlocked: blocked[p.number] ?? false,
      isVIP: vip[p.number] ?? false,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls);

  // Filter
  const filtered = profiles.filter((p) => {
    const matchSearch = p.number.includes(search.replace(/\s/g, ""));
    const todayUsed = p.todaySecondsUsed;
    const matchFilter =
      filter === "all" ? true :
      filter === "blocked" ? p.isBlocked :
      filter === "limit_reached" ? p.todayLimitReached :
      filter === "near_limit" ? todayUsed >= 90 && !p.todayLimitReached :
      filter === "active" ? calls.some((c) => c.callerNumber === p.number && c.status === "active") :
      true;
    return matchSearch && matchFilter;
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const toggleBlock = (number: string) => {
    setBlocked((b) => {
      const next = { ...b, [number]: !b[number] };
      showToast(!b[number] ? `${maskNumber(number)} blocked — calls will be rejected` : `${maskNumber(number)} unblocked`);
      return next;
    });
  };

  const toggleVIP = (number: string) => {
    setVip((v) => {
      const next = { ...v, [number]: !v[number] };
      showToast(!v[number] ? `${maskNumber(number)} set as VIP — 6-min daily limit` : `${maskNumber(number)} removed from VIP`);
      return next;
    });
  };

  // Stats
  const totalCallers = profiles.length;
  const activeToday = profiles.filter((p) => p.todaySecondsUsed > 0).length;
  const limitHitToday = profiles.filter((p) => p.todayLimitReached).length;
  const blockedCount = profiles.filter((p) => p.isBlocked).length;

  // Top 5 callers as animated-tooltip avatars
  const topCallers = profiles.slice(0, 5).map((p, i) => ({
    id: p.number,
    name: maskNumber(p.number),
    designation: `${p.totalCalls} calls · ${fmt(p.totalSecondsAllTime)} total`,
    initials: `#${i + 1}`,
  }));

  const getStatusBadge = (p: typeof profiles[0]) => {
    if (p.isBlocked) return { label: "Blocked", className: "bg-red-500/15 text-red-400" };
    const live = calls.some((c) => c.callerNumber === p.number && c.status === "active");
    if (live) return { label: "On call", className: "bg-emerald-500/15 text-emerald-400" };
    if (p.todayLimitReached) return { label: "Limit reached", className: "bg-red-500/15 text-red-400" };
    if (p.todaySecondsUsed >= 90) return { label: "Near limit", className: "bg-amber-500/15 text-amber-400" };
    if (p.todaySecondsUsed > 0) return { label: "Active today", className: "bg-cyan-400/10 text-cyan-400" };
    return { label: "No activity", className: "bg-white/10 text-muted-foreground" };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Callers
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            All end-users who have called your AI line · Each has a 3-min daily limit
          </p>
        </div>
        {topCallers.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Top callers</span>
            <AnimatedTooltip items={topCallers} className="pr-3" />
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total unique callers" value={totalCallers} icon={Users} accent="#818cf8" />
        <StatCard label="Active today" value={activeToday} icon={Phone} accent={CYAN} />
        <StatCard label="Hit limit today" value={limitHitToday} icon={Clock} accent="#f87171" />
        <StatCard label="Blocked" value={blockedCount} icon={ShieldOff} accent="#fbbf24" />
      </div>

      {/* Caller limit policy card */}
      <div className="glass-panel rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-cyan-400/15">
          <Clock className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Caller Daily Limit Policy — set by BeyondForms
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Standard: <strong>3 minutes (180 seconds)</strong> per unique caller per day ·
            VIP callers: <strong>6 minutes (360 seconds)</strong> ·
            Blocked callers: <strong>0 seconds — calls rejected immediately</strong>.
            The limit resets at midnight IST.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors"
          />
        </div>
        <div className="flex gap-1 rounded-lg p-1 border border-white/10 bg-white/5 overflow-x-auto">
          {([
            ["all", "All"],
            ["active", "On call"],
            ["near_limit", "Near limit"],
            ["limit_reached", "Limit hit"],
            ["blocked", "Blocked"],
          ] as [FilterStatus, string][]).map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                filter === val ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"
              }`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow className="bg-white/5 border-white/10">
              {["Caller (end-user)", "Total calls", "All-time duration", "Today used / limit", "Today's bar", "First seen", "Last seen", "Status", "Actions"].map((h) => (
                <TableHead key={h} className="whitespace-nowrap text-muted-foreground">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  No callers match the current filter.
                </TableCell>
              </TableRow>
            ) : filtered.map((p) => {
              const badge = getStatusBadge(p);
              const dailyLimit = p.isVIP ? 360 : 180;
              const liveSecs = (() => {
                const activeCall = calls.find((c) => c.callerNumber === p.number && c.status === "active");
                return activeCall ? activeCall.durationSeconds + tick : p.todaySecondsUsed;
              })();
              const liveUsed = Math.min(liveSecs, dailyLimit);
              const pct = (liveUsed / dailyLimit) * 100;
              const barColor = pct >= 100 ? "#f87171" : pct >= 75 ? "#fbbf24" : CYAN;

              return (
                <TableRow key={p.number}
                  className={`border-white/5 ${p.isBlocked ? "bg-red-500/5 opacity-60" : ""}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{p.number.slice(-2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-xs font-medium text-foreground">
                        {maskNumber(p.number)}
                      </span>
                      {p.isVIP && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-400">VIP</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{p.totalCalls}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {fmt(p.totalSecondsAllTime)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className={pct >= 100 ? "text-red-400" : "text-foreground"}>{fmt(liveUsed)}</span>
                    <span className="text-muted-foreground"> / {p.isVIP ? "6:00" : "3:00"}</span>
                  </TableCell>
                  <TableCell className="w-24">
                    <div className="h-1.5 w-20 rounded-full overflow-hidden bg-white/10">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(p.firstSeenDate)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(p.lastSeenDate)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* VIP toggle */}
                      <button
                        onClick={() => toggleVIP(p.number)}
                        disabled={p.isBlocked}
                        title={p.isVIP ? "Remove VIP (6-min → 3-min limit)" : "Mark VIP (extends limit to 6 min)"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30 ${
                          p.isVIP ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-muted-foreground"
                        }`}>
                        <span className="text-xs">{p.isVIP ? "★" : "☆"}</span>
                      </button>
                      {/* Block toggle */}
                      <button
                        onClick={() => toggleBlock(p.number)}
                        title={p.isBlocked ? "Unblock caller" : "Block caller — all calls rejected"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 ${
                          p.isBlocked ? "bg-red-500/15" : "bg-white/5"
                        }`}>
                        {p.isBlocked
                          ? <ShieldOff className="w-3.5 h-3.5 text-red-400" />
                          : <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-xl z-50 glass-panel border border-cyan-400/25 text-foreground">
          {toast}
        </div>
      )}
    </div>
  );
}
