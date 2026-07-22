"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Semi-circle multi-orbit (21st.dev @ruixenui/multi-orbit-semi-circle):
// concentric half-rings with chips orbiting a centerpiece. Used to visualize
// callers orbiting the org's AI line.

export interface OrbitItem {
  id: string;
  label: string; // short text shown in the chip (initials / rank)
}

interface Ring {
  size: number;
  duration: number;
  items: OrbitItem[];
}

function OrbitRing({ size, duration, items }: Ring) {
  return (
    <div
      className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 rounded-full border border-cyan-400/15"
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration, ease: "linear" }}
      >
        {items.map((item, i) => {
          const angle = (360 / items.length) * i;
          return (
            <div
              key={item.id}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `rotate(${angle}deg) translateY(${-size / 2}px)` }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration, ease: "linear" }}
                className="-translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-400/15 border border-cyan-400/30 backdrop-blur flex items-center justify-center text-[10px] font-bold text-cyan-300 shadow-[0_0_12px_rgba(251,146,60,0.25)]"
                style={{ rotate: -angle }}
              >
                {item.label}
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export function MultiOrbit({
  items,
  center,
  className,
}: {
  items: OrbitItem[];
  center: React.ReactNode;
  className?: string;
}) {
  const inner = items.slice(0, 3);
  const outer = items.slice(3, 8);

  return (
    <div className={cn("relative h-44 overflow-hidden", className)}>
      {inner.length > 0 && <OrbitRing size={170} duration={22} items={inner} />}
      {outer.length > 0 && <OrbitRing size={280} duration={38} items={outer} />}
      {/* centerpiece */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-24 h-24 rounded-full bg-cyan-400/10 border border-cyan-400/30 shadow-[0_0_35px_rgba(251,146,60,0.25)]" />
      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 flex flex-col items-center text-center">
        {center}
      </div>
    </div>
  );
}
