"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { RippleButton } from "@/components/ui/ripple-button";

// Glassy pricing card (21st.dev animated-glassy-pricing), minus the
// full-screen WebGL shader — billing renders inside the dashboard shell,
// not as a standalone page.

export interface PricingCardProps {
  planName: string;
  description: string;
  /** Pre-formatted price, e.g. "₹74,700" or "Free". */
  price: string;
  period?: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  isCurrent?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function PricingCard({
  planName,
  description,
  price,
  period = "/mo",
  features,
  buttonText,
  isPopular = false,
  isCurrent = false,
  onSelect,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl px-6 py-7 backdrop-blur-[14px] transition-all duration-300",
        "bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-xl",
        isPopular && "ring-2 ring-cyan-400/30 border-cyan-400/30 from-white/[0.15] shadow-2xl lg:scale-105",
        isCurrent && "ring-2 ring-emerald-400/30 border-emerald-400/30",
        className,
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 right-4 rounded-full bg-cyan-400 px-3 py-0.5 text-[11px] font-semibold text-black">
          Most Popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4 rounded-full bg-emerald-400 px-3 py-0.5 text-[11px] font-semibold text-black">
          Current Plan
        </div>
      )}

      <div className="mb-2">
        <h2 className="text-2xl font-light tracking-tight text-foreground">{planName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="my-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-light text-foreground">{price}</span>
        {price !== "Free" && <span className="text-xs text-muted-foreground">{period}</span>}
      </div>

      <div className="mb-5 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09)_20%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.09)_80%,transparent)]" />

      <ul className="mb-6 flex flex-col gap-2 text-sm text-foreground/90">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0 text-cyan-400" strokeWidth={3} />
            {feature}
          </li>
        ))}
      </ul>

      <RippleButton
        variant={isPopular ? "primary" : "ghost"}
        className="mt-auto w-full py-2.5"
        onClick={onSelect}
        disabled={isCurrent}
      >
        {isCurrent ? "Active" : buttonText}
      </RippleButton>
    </div>
  );
}
