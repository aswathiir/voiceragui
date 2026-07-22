"use client";

import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

// Aceternity animated tooltip (21st.dev), adapted for initials avatars —
// this app has no caller profile photos, so `initials` replaces the image.

export interface TooltipItem {
  id: string | number;
  name: string;
  designation?: string;
  initials: string;
}

export function AnimatedTooltip({
  items,
  className,
}: {
  items: TooltipItem[];
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig);
  const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative -mr-3"
          onMouseEnter={() => setHovered(item.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <AnimatePresence mode="popLayout">
            {hovered === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 10 },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{ translateX, rotate, whiteSpace: "nowrap" }}
                className="absolute -top-14 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-lg bg-black/90 border border-white/10 px-3 py-1.5 shadow-xl"
              >
                <div className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <p className="text-xs font-semibold text-white">{item.name}</p>
                {item.designation && (
                  <p className="text-[10px] text-white/60">{item.designation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div
            onMouseMove={handleMouseMove}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-orange-500/20 text-[11px] font-bold text-cyan-300 transition duration-300 group-hover:z-30 group-hover:scale-110"
          >
            {item.initials}
          </div>
        </div>
      ))}
    </div>
  );
}
