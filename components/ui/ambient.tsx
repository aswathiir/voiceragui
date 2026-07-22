"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// ─── Wave Canvas Background ────────────────────────────────────────────────
export function WaveBackground({ intensity = 0.3 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let time = 0;

    const waves = Array.from({ length: 6 }).map(() => ({
      value: Math.random() * 0.4 + 0.1,
      target: Math.random() * 0.4 + 0.1,
      speed: Math.random() * 0.015 + 0.008,
    }));

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    }

    function draw() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      waves.forEach((w, i) => {
        if (Math.random() < 0.008) w.target = Math.random() * 0.5 + 0.1;
        w.value += (w.target - w.value) * w.speed;

        const freq = w.value * 6;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 2) {
          const nx = (x / canvas.width) * 2 - 1;
          const px = nx + i * 0.05 + freq * 0.04;
          const py =
            Math.sin(px * 8 + time) * Math.cos(px * 1.5) * freq * 0.09 * ((i + 1) / 6) * intensity;
          const y = (py + 1) * (canvas.height / 2);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        const alpha = 0.25 + (i / 6) * 0.15;
        const r = 100 + i * 12;
        const g = 80 + i * 18;
        ctx.lineWidth = 0.8 + i * 0.25;
        ctx.strokeStyle = `rgba(${r},${g},229,${alpha})`;
        ctx.shadowColor = `rgba(99,102,241,0.3)`;
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      time += 0.015;
      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  );
}

// ─── Floating Log Cards ────────────────────────────────────────────────────
interface FloatingLog {
  node: string;
  status: "success" | "info" | "warning";
  message: string;
  duration: string;
}

const AMBIENT_LOGS: FloatingLog[] = [
  { node: "Webhook", status: "info", message: "Tool call received", duration: "—" },
  { node: "AI Agent", status: "success", message: "Query answered via RAG", duration: "2.1s" },
  { node: "Pinecone", status: "success", message: "3 chunks retrieved", duration: "340ms" },
  { node: "Groq LLM", status: "success", message: "Response generated", duration: "1.4s" },
  { node: "Firecrawl", status: "info", message: "Page scraped — NCW", duration: "4.8s" },
  { node: "Embeddings", status: "success", message: "47 vectors upserted", duration: "1.2s" },
];

const statusDot: Record<FloatingLog["status"], string> = {
  success: "bg-emerald-400",
  info: "bg-indigo-400",
  warning: "bg-amber-400",
};

export function FloatingLogCards() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {AMBIENT_LOGS.map((log, i) => {
        const x = 8 + (i % 3) * 30 + (i % 2 === 0 ? 5 : -5);
        const yStart = 15 + Math.floor(i / 3) * 40;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: [0, 0.7, 0.7, 0],
              y: [30, 0, 0, -20],
            }}
            transition={{
              duration: 6,
              delay: i * 1.8,
              repeat: Infinity,
              repeatDelay: AMBIENT_LOGS.length * 1.8 - 6,
              ease: "easeInOut",
            }}
            style={{ left: `${x}%`, top: `${yStart}%` }}
            className="absolute"
          >
            <div className="glass-panel rounded-xl px-3.5 py-2.5 border border-white/8 shadow-xl min-w-[160px]">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot[log.status]}`} />
                <span className="text-[10px] font-mono text-indigo-400">{log.node}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
                  {log.duration}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{log.message}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
