"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, Trash2, Phone, Tag, MessageSquare } from "lucide-react";
import { getCallHistory, clearHistory, type CallRecord } from "@/lib/store";
import { formatDuration, formatDate } from "@/lib/utils";

function CallCard({
  record,
  expanded,
  onToggle,
}: {
  record: CallRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-4 hover:bg-muted/20 transition-colors"
      >
        {/* Left accent line */}
        <div className="w-0.5 self-stretch rounded-full bg-primary/30 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {record.summary}
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 mt-0.5"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
            </motion.div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 stroke-[1.5]" /> {formatDuration(record.duration)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 stroke-[1.5]" /> {record.messages.length}
            </span>
            <span className="font-mono">{formatDate(record.timestamp)}</span>
          </div>

          {record.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {record.topics.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-[10px] font-mono bg-muted/50 text-muted-foreground border border-border rounded-md px-2 py-0.5"
                >
                  <Tag className="w-2.5 h-2.5 stroke-[1.5]" /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Transcript
              </p>
              {record.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border ${
                      msg.role === "user"
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {msg.role === "user" ? "U" : "R"}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm leading-relaxed border ${
                      msg.role === "user"
                        ? "bg-primary/8 border-primary/12 text-foreground"
                        : "bg-muted/40 border-border text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setCalls(getCallHistory());
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">{calls.length} conversations recorded</p>
        </div>
        {calls.length > 0 && (
          <button
            onClick={() => {
              clearHistory();
              setCalls([]);
            }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors border border-border hover:border-destructive/30 rounded-lg px-3 py-2"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" /> Clear all
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Calls", value: calls.length.toString() },
          { label: "Total Time", value: formatDuration(calls.reduce((a, c) => a + c.duration, 0)) },
          {
            label: "Avg Duration",
            value: calls.length
              ? formatDuration(Math.round(calls.reduce((a, c) => a + c.duration, 0) / calls.length))
              : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-mono mb-1.5">{label}</p>
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0">
        <AnimatePresence>
          {calls.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 gap-3"
            >
              <Phone className="w-8 h-8 text-muted-foreground/20 stroke-[1.5]" />
              <p className="text-sm text-muted-foreground">No calls yet.</p>
            </motion.div>
          ) : (
            calls.map((call, i) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <CallCard
                  record={call}
                  expanded={expandedId === call.id}
                  onToggle={() => setExpandedId(expandedId === call.id ? null : call.id)}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
