"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mic, Database, Zap, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Zap,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-500/20",
    title: "Welcome to VoiceRAG",
    description:
      "A voice-first interface connected to a live knowledge base. Ask questions naturally — get precise answers from verified sources.",
    visual: "onboarding-1",
  },
  {
    icon: Mic,
    iconColor: "text-cyan-400",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    title: "Start a Voice Call",
    description:
      "Go to Live Call and press the phone button. The assistant listens, retrieves relevant information, and responds instantly.",
    visual: "onboarding-2",
  },
  {
    icon: Database,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    title: "Or Chat by Text",
    description:
      "Prefer typing? Use the Text Chat page to query the same knowledge base without voice — same RAG pipeline, instant results.",
    visual: "onboarding-3",
  },
  {
    icon: CheckCircle,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    title: "You're all set",
    description:
      "Check Call History to replay past conversations and Logs to monitor the pipeline. Configure your API keys in Settings.",
    visual: "onboarding-4",
  },
];

// Mini visual previews for each step
function StepVisual({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="flex items-center justify-center h-full gap-4">
        {["Voice", "RAG", "Answer"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="glass-panel rounded-lg px-3 py-2 text-xs font-mono text-indigo-400 border border-indigo-500/20">
              {label}
            </div>
            {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
          </div>
        ))}
      </div>
    );

  if (step === 1)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Mic className="w-8 h-8 text-indigo-400" />
          </div>
          {[1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-indigo-500/20"
              animate={{ scale: 1 + i * 0.4, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: "easeOut" }}
            />
          ))}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-indigo-400/60 rounded-full"
                animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.06 }}
              />
            ))}
          </div>
        </div>
      </div>
    );

  if (step === 2)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
        {[
          { role: "user", text: "What is Beti Bachao scheme?" },
          {
            role: "ai",
            text: "It addresses declining child sex ratios and promotes girl education.",
          },
        ].map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3 }}
            className={`flex gap-2 w-full ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-foreground"
                  : "bg-white/5 border border-white/8 text-muted-foreground"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>
    );

  return (
    <div className="grid grid-cols-2 gap-2 px-4 h-full items-center">
      {[
        { label: "History", color: "indigo" },
        { label: "Logs", color: "emerald" },
        { label: "Chat", color: "cyan" },
        { label: "Settings", color: "amber" },
      ].map(({ label, color }) => (
        <div
          key={label}
          className={`glass-panel rounded-xl p-3 border border-${color}-500/20 flex items-center gap-2`}
        >
          <div className={`w-2 h-2 rounded-full bg-${color}-400`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_done");
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("onboarding_done", "1");
    setOpen(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleClose();
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="p-0 gap-0 border-white/10">
        {/* Visual area */}
        <div className="h-44 bg-gradient-to-br from-indigo-500/8 via-transparent to-orange-500/5 border-b border-white/5 relative overflow-hidden">
          {/* Grid bg */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(129,140,248,0.3) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <StepVisual step={step} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${current.iconBg}`}
            >
              <Icon className={`w-5 h-5 ${current.iconColor}`} />
            </div>
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                    {current.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {current.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-indigo-400" : "w-1.5 bg-white/20 hover:bg-white/30"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <button
                  onClick={handleClose}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  Skip
                </button>
              </DialogClose>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-all font-medium"
              >
                {step === STEPS.length - 1 ? "Get started" : "Next"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
