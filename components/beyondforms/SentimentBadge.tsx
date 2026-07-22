"use client";

import { cn } from "@/lib/utils";
import type { Sentiment } from "@/lib/stores/callStore";

const STYLES: Record<Sentiment, { className: string; label: string }> = {
  positive: { className: "bg-emerald-500/15 text-emerald-400", label: "Positive" },
  neutral: { className: "bg-white/10 text-muted-foreground", label: "Neutral" },
  negative: { className: "bg-red-500/15 text-red-400", label: "Negative" },
  frustrated: { className: "bg-red-500/15 text-red-400", label: "Frustrated" },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const s = STYLES[sentiment];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", s.className)}>
      {s.label}
    </span>
  );
}
