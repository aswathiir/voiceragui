"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomerStore } from "@/lib/stores/customerStore";
import { Info, AlertTriangle, Volume2, Check } from "lucide-react";
import { RippleButton } from "@/components/ui/ripple-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-6 space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function RadioCard({
  value, current, onChange, label, sub,
}: { value: string; current: string; onChange: (v: string) => void; label: string; sub?: string }) {
  const selected = value === current;
  return (
    <button
      onClick={() => onChange(value)}
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all w-full text-left ${
        selected ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
          selected ? "border-cyan-400" : "border-white/20"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
      </div>
    </button>
  );
}

function SliderField({
  label, value, min, max, step = 1, onChange, format,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm font-semibold text-cyan-400">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
        style={{ accentColor: "#fb923c" }}
      />
    </div>
  );
}

const INPUT_CLS =
  "w-full px-3 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors";

export default function ConfigurePage() {
  const { voiceConfig, updateVoiceConfig, saveVoiceConfig, isDirty } = useCustomerStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    await saveVoiceConfig();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const playVoice = (voice: string) => {
    setVoicePlaying(voice);
    setTimeout(() => setVoicePlaying(null), 2000);
  };

  const VOICES = [
    { value: "aria_en", label: "Aria (English)", sub: "Female, Azure Neural" },
    { value: "ravi_en", label: "Ravi (English, Male)", sub: "Male, Azure Neural" },
    { value: "aria_hi", label: "Aria Hindi", sub: "Female, Hindi accent" },
    {
      value: "zariyah_ar",
      label: "Zariyah (Arabic)",
      sub: "Requires Arabic language selected",
      disabled: voiceConfig.language !== "ar",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-36 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
            Configure
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">Voice assistant settings</p>
        </div>
        {isDirty && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-amber-500/15 text-amber-400 w-fit"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Unsaved changes
          </motion.span>
        )}
      </div>

      {/* A — Speech Recognition */}
      <Section title="A — Speech Recognition">
        <div>
          <p className="text-sm font-medium mb-3 text-foreground">STT Model</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RadioCard
              value="deepgram_nova2"
              current={voiceConfig.sttModel}
              onChange={(v) => updateVoiceConfig({ sttModel: v as any })}
              label="Deepgram Nova-2"
              sub="Supports English, Malayalam, Arabic"
            />
            <RadioCard
              value="deepgram_nova3"
              current={voiceConfig.sttModel}
              onChange={(v) => updateVoiceConfig({ sttModel: v as any })}
              label="Deepgram Nova-3"
              sub="Higher accuracy — English only"
            />
          </div>
          {voiceConfig.sttModel === "deepgram_nova3" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-amber-400/25 bg-amber-500/10 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              Malayalam is not supported on Nova-3. Use Nova-2 for Malayalam.
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-2 text-foreground">Language</label>
          <select
            value={voiceConfig.language}
            onChange={(e) => updateVoiceConfig({ language: e.target.value as any })}
            className={`${INPUT_CLS} [&>option]:bg-neural`}
          >
            <option value="en">English</option>
            <option value="ml">Malayalam</option>
            <option value="en_ml">English + Malayalam (mixed)</option>
            <option value="ar">Arabic</option>
          </select>
          <AnimatePresence>
            {voiceConfig.language === "ar" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-amber-400/25 bg-amber-500/10 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  Arabic requires one-time setup (₹25,000–40,000). Contact support to activate.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      {/* B — AI Behaviour */}
      <Section title="B — AI Behaviour">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Personality Prompt</label>
            <span className={`text-xs ${voiceConfig.llmPersonality.length > 1400 ? "text-red-400" : "text-muted-foreground"}`}>
              {voiceConfig.llmPersonality.length}/1500
            </span>
          </div>
          <textarea
            value={voiceConfig.llmPersonality}
            onChange={(e) => updateVoiceConfig({ llmPersonality: e.target.value.slice(0, 1500) })}
            rows={3}
            className={`${INPUT_CLS} resize-none`}
          />
        </div>

        <SliderField
          label="Max Response Length"
          value={voiceConfig.maxResponseWords}
          min={20}
          max={120}
          onChange={(v) => updateVoiceConfig({ maxResponseWords: v })}
          format={(v) => `${v} words`}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-foreground">Temperature</label>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                {voiceConfig.llmTemperature.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span>Consistent</span>
              <span>Creative</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={voiceConfig.llmTemperature}
            onChange={(e) => updateVoiceConfig({ llmTemperature: Number(e.target.value) })}
            className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
            style={{ accentColor: "#fb923c" }}
          />
        </div>
      </Section>

      {/* C — Voice Output */}
      <Section title="C — Voice Output">
        <div>
          <p className="text-sm font-medium mb-3 text-foreground">TTS Voice</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICES.map(({ value, label, sub, disabled }) => (
              <div key={value} className="relative">
                <button
                  onClick={() => !disabled && updateVoiceConfig({ ttsVoice: value as any })}
                  disabled={disabled}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    disabled
                      ? "border-white/5 bg-white/[0.01] opacity-50"
                      : voiceConfig.ttsVoice === value
                      ? "border-cyan-400/60 bg-cyan-400/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      voiceConfig.ttsVoice === value ? "border-cyan-400" : "border-white/20"
                    }`}
                  >
                    {voiceConfig.ttsVoice === value && (
                      <span className="block w-2 h-2 rounded-full m-auto mt-0.5 bg-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{label}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>
                  </div>
                </button>
                <button
                  onClick={() => playVoice(value)}
                  disabled={disabled}
                  className="absolute right-3 top-3 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-cyan-400/10 hover:bg-cyan-400/20"
                >
                  {voicePlaying === value ? (
                    <span className="text-[10px] font-bold text-cyan-400">▌▌</span>
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </button>
                {voicePlaying === value && (
                  <p className="text-[10px] mt-1 text-center text-cyan-400">Playing sample…</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <SliderField
          label="Speech Speed"
          value={voiceConfig.ttsSpeed}
          min={0.75}
          max={1.25}
          step={0.05}
          onChange={(v) => updateVoiceConfig({ ttsSpeed: v })}
          format={(v) => `${v.toFixed(2)}×`}
        />
      </Section>

      {/* D — Call Behaviour */}
      <Section title="D — Call Behaviour">
        <div>
          <label className="text-sm font-medium block mb-1.5 text-foreground">Greeting Message</label>
          <input
            type="text"
            value={voiceConfig.greetingMessage}
            onChange={(e) => updateVoiceConfig({ greetingMessage: e.target.value })}
            className={INPUT_CLS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5 text-foreground">
              Transfer to human after (seconds)
            </label>
            <input
              type="number"
              value={voiceConfig.fallbackAfterSeconds}
              onChange={(e) => updateVoiceConfig({ fallbackAfterSeconds: Number(e.target.value) })}
              className={INPUT_CLS}
            />
            <p className="text-xs mt-1 text-muted-foreground">If AI is unsure for this long</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5 text-foreground">
              Human fallback number
            </label>
            <input
              type="tel"
              value={voiceConfig.fallbackNumber}
              onChange={(e) => updateVoiceConfig({ fallbackNumber: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5 text-foreground">Daily Caller Limit</label>
          <div className="px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 border border-white/10 bg-white/5 text-muted-foreground">
            <span>180 seconds (3 minutes) — set by BeyondForms</span>
            <div className="relative group ml-auto">
              <Info className="w-4 h-4 cursor-help text-muted-foreground/60" />
              <div className="absolute bottom-6 right-0 w-64 p-3 rounded-xl shadow-xl text-xs glass-panel text-muted-foreground z-10 hidden group-hover:block">
                Each unique caller can use a maximum of 3 minutes per day. This limit protects your monthly call quota.
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 lg:left-56 right-0 px-4 sm:px-8 py-4 border-t border-white/10 flex items-center justify-between glass-panel z-40">
        {isDirty ? (
          <p className="text-xs text-muted-foreground">You have unsaved changes</p>
        ) : (
          <p className="text-xs text-emerald-400">All settings saved</p>
        )}
        <RippleButton
          variant="primary"
          className={`px-6 py-2.5 ${saved ? "!bg-emerald-400" : ""}`}
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saved && <Check className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </RippleButton>
      </div>
    </div>
  );
}
