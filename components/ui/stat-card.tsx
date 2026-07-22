"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  /** "glass" is the full-size KPI card; "light" (legacy name) is the compact variant — both share the dark glass look. */
  variant?: "glass" | "light";
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, accent = "#fb923c", variant = "light", className }: StatCardProps) {
  if (variant === "glass") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        className={cn(
          "group glass-panel rounded-xl p-5 transition-all duration-300",
          "hover:border-cyan-400/30 hover:shadow-[0_8px_30px_rgba(251,146,60,0.08)]",
          className,
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: accent + "22" }}
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "group glass-panel rounded-xl p-4 transition-all duration-300",
        "hover:border-cyan-400/30 hover:shadow-[0_6px_24px_rgba(251,146,60,0.07)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-125"
          style={{ color: accent }}
        />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold mt-1 text-foreground">{value}</p>
      {sub && <p className="text-[11px] mt-0.5 text-muted-foreground/80">{sub}</p>}
    </motion.div>
  );
}
