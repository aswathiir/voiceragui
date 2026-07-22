"use client";

interface Props {
  used: number;   // INR used
  total: number;  // INR plan total
  size?: number;  // SVG size in px, default 200
}

export function CostRing({ used, total, size = 200 }: Props) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);

  const color =
    pct > 0.85 ? "#EF4444" : pct > 0.6 ? "#F59E0B" : "#10B981";

  const fmtINR = (v: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
      </svg>
      {/* Inner text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <p className="text-xl font-bold leading-tight text-foreground">
          ₹{fmtINR(used)}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">
          used of ₹{fmtINR(total)}
        </p>
        <p className="text-sm font-semibold mt-1" style={{ color }}>
          {Math.round(pct * 100)}%
        </p>
      </div>
    </div>
  );
}
