"use client";

import { X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallStore } from "@/lib/stores/callStore";
import type { CallRecord } from "@/lib/stores/callStore";
import { SentimentBadge } from "./SentimentBadge";

function maskNumber(n: string): string {
  if (n.length < 6) return n;
  return n.slice(0, 4) + "***" + n.slice(-3);
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  call: CallRecord | null;
  onClose: () => void;
}

export function TranscriptPanel({ call, onClose }: Props) {
  const analyzeCall = useCallStore((s) => s.analyzeCall);

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 w-full sm:w-96 shadow-2xl flex flex-col z-50 glass-panel border-l border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
            <div>
              <p className="font-semibold text-sm text-foreground">
                Call Transcript
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {maskNumber(call.callerNumber)} &middot; {fmt(call.durationSeconds)} &middot;{" "}
                {call.language.toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* AI Analysis */}
          <div className="px-5 py-4 border-b border-white/10">
            {call.aiSummary ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">AI Summary</p>
                  {call.sentiment && <SentimentBadge sentiment={call.sentiment} />}
                </div>
                <p className="text-sm text-foreground/90">{call.aiSummary}</p>
                {call.aiIntent && (
                  <p className="text-xs text-muted-foreground">
                    Intent: <span className="text-foreground">{call.aiIntent}</span>
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => analyzeCall(call.id)}
                disabled={call.analyzing || call.transcript.length === 0}
                className="flex items-center gap-2 text-xs font-medium disabled:opacity-50 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {call.analyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {call.analyzing ? "Analyzing transcript…" : "Generate AI summary & sentiment"}
              </button>
            )}
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {call.transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No transcript available for this call.
              </div>
            ) : (
              call.transcript.map((line, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${line.speaker === "caller" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      line.speaker === "ai"
                        ? "bg-cyan-400/15 text-cyan-400"
                        : "bg-indigo-500/15 text-indigo-400"
                    }`}
                  >
                    {line.speaker === "ai" ? "AI" : "C"}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed text-foreground/90 ${
                      line.speaker === "caller"
                        ? "rounded-tr-sm bg-indigo-500/10"
                        : "rounded-tl-sm bg-cyan-400/10"
                    }`}
                  >
                    <p>{line.text}</p>
                    <p className="text-[10px] mt-1 text-muted-foreground">
                      {fmt(line.timestampSeconds)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resolved by AI: <strong>{call.resolvedByAI ? "Yes" : "No"}</strong></span>
              <span>Cost: <strong>₹{call.costINR.toFixed(2)}</strong></span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
