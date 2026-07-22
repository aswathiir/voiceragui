"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronDown, Check, RefreshCw, Activity } from "lucide-react";
import { Input, Badge } from "@/components/ui/primitives";

type LogLevel = "info" | "warning" | "error" | "success";

interface Log {
  id: string;
  ts: string;
  level: LogLevel;
  node: string;
  message: string;
  duration: string;
  status: string;
}

const LOGS: Log[] = [
  {
    id: "1",
    ts: new Date(Date.now() - 120000).toISOString(),
    level: "success",
    node: "Pinecone Vector Store",
    message: "Vectors upserted successfully (47 chunks)",
    duration: "1.2s",
    status: "200",
  },
  {
    id: "2",
    ts: new Date(Date.now() - 180000).toISOString(),
    level: "success",
    node: "Extract Markdown",
    message: "NCW page scraped — 12,400 tokens extracted",
    duration: "3.1s",
    status: "200",
  },
  {
    id: "3",
    ts: new Date(Date.now() - 240000).toISOString(),
    level: "success",
    node: "HTTP Request (Firecrawl)",
    message: "Scrape completed successfully",
    duration: "4.8s",
    status: "200",
  },
  {
    id: "4",
    ts: new Date(Date.now() - 3600000).toISOString(),
    level: "info",
    node: "Webhook",
    message: "Tool call received from VAPI",
    duration: "—",
    status: "200",
  },
  {
    id: "5",
    ts: new Date(Date.now() - 3660000).toISOString(),
    level: "success",
    node: "AI Agent",
    message: "Query answered via RAG retrieval",
    duration: "2.3s",
    status: "200",
  },
  {
    id: "6",
    ts: new Date(Date.now() - 3720000).toISOString(),
    level: "success",
    node: "Format VAPI Response",
    message: "Response formatted, toolCallId matched",
    duration: "12ms",
    status: "200",
  },
  {
    id: "7",
    ts: new Date(Date.now() - 7200000).toISOString(),
    level: "warning",
    node: "Embeddings Ollama",
    message: "Ollama response slow — 4.2s",
    duration: "4.2s",
    status: "200",
  },
  {
    id: "8",
    ts: new Date(Date.now() - 7260000).toISOString(),
    level: "error",
    node: "Pinecone Vector Store",
    message: "Vector dimension mismatch — 3072 vs 768",
    duration: "—",
    status: "400",
  },
  {
    id: "9",
    ts: new Date(Date.now() - 86400000).toISOString(),
    level: "info",
    node: "Schedule Trigger",
    message: "Daily ingestion pipeline triggered",
    duration: "—",
    status: "—",
  },
  {
    id: "10",
    ts: new Date(Date.now() - 86520000).toISOString(),
    level: "success",
    node: "HTTP Request (Firecrawl)",
    message: "Website crawled — 1 page",
    duration: "5.1s",
    status: "200",
  },
];

const levelStyles: Record<LogLevel, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const statusColor: Record<string, string> = {
  "200": "text-emerald-400",
  "400": "text-destructive",
  "500": "text-destructive",
  "—": "text-muted-foreground",
};

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: Log;
  expanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(log.ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = new Date(log.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <motion.button
        onClick={onToggle}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
        className="w-full px-5 py-3.5 text-left flex items-center gap-4 transition-colors"
      >
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.div>

        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${levelStyles[log.level]} uppercase tracking-wider shrink-0`}
        >
          {log.level}
        </span>

        <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
          <span className="block">{time}</span>
          <span className="text-[10px] opacity-60">{date}</span>
        </span>

        <span className="w-44 shrink-0 text-xs font-medium text-indigo-400/80 truncate">
          {log.node}
        </span>

        <span className="flex-1 text-sm text-muted-foreground truncate">{log.message}</span>

        <span
          className={`shrink-0 font-mono text-xs font-semibold ${statusColor[log.status] ?? "text-muted-foreground"}`}
        >
          {log.status}
        </span>

        <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {log.duration}
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5 bg-white/2"
          >
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: "Node", value: log.node },
                  { label: "Status", value: log.status },
                  { label: "Duration", value: log.duration },
                  { label: "Timestamp", value: new Date(log.ts).toISOString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                      {label}
                    </p>
                    <p className="font-mono text-xs text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  Message
                </p>
                <p className="font-mono text-xs text-foreground bg-white/4 rounded-lg p-3">
                  {log.message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LogLevel[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    return LOGS.filter((l) => {
      const matchSearch =
        l.message.toLowerCase().includes(search.toLowerCase()) ||
        l.node.toLowerCase().includes(search.toLowerCase());
      const matchLevel = levelFilter.length === 0 || levelFilter.includes(l.level);
      return matchSearch && matchLevel;
    });
  }, [search, levelFilter]);

  const toggleLevel = (level: LogLevel) => {
    setLevelFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const counts = {
    success: LOGS.filter((l) => l.level === "success").length,
    error: LOGS.filter((l) => l.level === "error").length,
    warning: LOGS.filter((l) => l.level === "warning").length,
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Execution Logs</h1>
          <p className="text-sm text-muted-foreground">
            n8n workflow runs · {filtered.length} of {LOGS.length}
          </p>
        </div>
        <button className="glass-panel rounded-lg px-3 py-2 border border-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Successful",
            value: counts.success,
            color: "text-emerald-400",
            dot: "bg-emerald-400",
          },
          {
            label: "Warnings",
            value: counts.warning,
            color: "text-amber-400",
            dot: "bg-amber-400",
          },
          {
            label: "Errors",
            value: counts.error,
            color: "text-destructive",
            dot: "bg-destructive",
          },
        ].map(({ label, value, color, dot }) => (
          <div key={label} className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            <div>
              <p className="text-xs text-muted-foreground font-mono">{label}</p>
              <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by message or node..."
            className="pl-9 bg-white/5 border-white/10 focus:border-indigo-500/40 text-sm"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`glass-panel rounded-lg px-4 py-2.5 border text-sm flex items-center gap-2 transition-all ${
              levelFilter.length > 0
                ? "border-indigo-500/40 text-indigo-400"
                : "border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-4 h-4" />
            {levelFilter.length > 0 && (
              <span className="bg-indigo-500/20 text-indigo-400 text-xs font-mono rounded-full px-1.5">
                {levelFilter.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 top-full mt-2 glass-panel rounded-xl border border-white/10 p-3 z-50 w-40 space-y-1"
              >
                {(["success", "info", "warning", "error"] as LogLevel[]).map((level) => {
                  const sel = levelFilter.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => toggleLevel(level)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors capitalize ${
                        sel
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {level}
                      {sel && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Log table */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col min-h-0">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-4">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Execution Log
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/4">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No logs match your search.
              </div>
            ) : (
              filtered.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <LogRow
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
