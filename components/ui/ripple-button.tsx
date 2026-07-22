"use client";

import React, { useState, MouseEvent, CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Material-style click ripple (21st.dev multi-type-ripple-buttons, trimmed to
// the two variants this app uses). The ripple color adapts via currentColor
// alpha so it works on both the cyan primary and destructive red buttons.

interface RippleState {
  key: number;
  x: number;
  y: number;
  size: number;
}

export interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "ghost";
  rippleDuration?: number;
}

const VARIANT_CLASSES: Record<NonNullable<RippleButtonProps["variant"]>, string> = {
  primary:
    "bg-orange-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_20px_rgba(251,146,60,0.25)]",
  destructive:
    "bg-red-500/90 hover:bg-red-500 text-white font-semibold",
  ghost:
    "bg-white/5 hover:bg-white/10 text-foreground border border-white/10 hover:border-cyan-400/40",
};

export function RippleButton({
  children,
  className,
  variant = "primary",
  rippleDuration = 600,
  onClick,
  disabled,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<RippleState[]>([]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple: RippleState = {
      key: Date.now(),
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
      size,
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((current) => current.filter((r) => r.key !== ripple.key));
    }, rippleDuration);
    onClick?.(event);
  };

  return (
    <button
      className={cn(
        "relative isolate overflow-hidden rounded-xl px-4 py-2 text-sm transition-all duration-200 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 pointer-events-none flex items-center justify-center gap-2">
        {children}
      </span>
      <span className="absolute inset-0 pointer-events-none z-[5]">
        {ripples.map((r) => (
          <span
            key={r.key}
            className="absolute rounded-full bg-current opacity-20 animate-ripple"
            style={
              {
                left: r.x,
                top: r.y,
                width: r.size,
                height: r.size,
                "--ripple-duration": `${rippleDuration}ms`,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </button>
  );
}
