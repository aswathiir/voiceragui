"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = string;

// Status-semantic colors (success/danger/warning) stay as their conventional
// hues; the "in-progress" group (uploading/parsing/chunking/embedding) is
// tinted off the cyan-400 accent so it matches the dark glass theme.
const STYLES: Record<string, { className: string; dot?: string }> = {
  active: { className: "bg-emerald-500/15 text-emerald-400", dot: "#34d399" },
  completed: { className: "bg-white/10 text-muted-foreground" },
  limit_reached: { className: "bg-red-500/15 text-red-400" },
  dropped: { className: "bg-amber-500/15 text-amber-400" },
  trial: { className: "bg-blue-500/15 text-blue-400" },
  suspended: { className: "bg-red-500/15 text-red-400" },
  uploading: { className: "bg-cyan-400/10 text-cyan-400", dot: "#fb923c" },
  parsing: { className: "bg-cyan-400/10 text-cyan-400", dot: "#fb923c" },
  chunking: { className: "bg-cyan-400/10 text-cyan-400", dot: "#fb923c" },
  embedding: { className: "bg-cyan-400/10 text-cyan-400", dot: "#fb923c" },
  indexed: { className: "bg-emerald-500/15 text-emerald-400" },
  failed: { className: "bg-red-500/15 text-red-400" },
};

const LABEL: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  limit_reached: "Limit Reached",
  dropped: "Dropped",
  trial: "Trial",
  suspended: "Suspended",
  uploading: "Uploading",
  parsing: "Parsing",
  chunking: "Chunking",
  embedding: "Embedding",
  indexed: "Indexed",
  failed: "Failed",
};

interface Props {
  status: BadgeVariant;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse }: Props) {
  const s = STYLES[status] ?? { className: "bg-gray-100 text-gray-700" };
  const label = LABEL[status] ?? status;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", s.className)}
    >
      {s.dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", pulse && "animate-pulse")}
          style={{ backgroundColor: s.dot }}
        />
      )}
      {label}
    </span>
  );
}
