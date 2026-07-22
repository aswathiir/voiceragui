"use client";

import { useState, useRef, useCallback } from "react";
import { PhoneCall, Loader2, CheckCircle, XCircle, PhoneOff } from "lucide-react";
import { RippleButton } from "@/components/ui/ripple-button";
import { VoicePoweredOrb } from "@/components/ui/voice-orb";
import { useAuthStore } from "@/lib/stores/authStore";
import { ASSISTANT_ID } from "@/lib/vapi";

type Tab = "browser" | "phone";
type CallState = "idle" | "connecting" | "live" | "ended";

export default function LiveCallPage() {
  const [tab, setTab] = useState<Tab>("browser");

  // ── Phone dial ─────────────────────────────────────────────
  const [to, setTo] = useState("+919746621918");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const dial = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/calls/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Dial failed");
      setResult({ ok: true, msg: `Ringing ${data.to} from ${data.from} · call ${String(data.callId).slice(0, 8)}… (${data.status})` });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Dial failed" });
    } finally {
      setLoading(false);
    }
  };

  // ── Browser voice call ─────────────────────────────────────
  const [callState, setCallState] = useState<CallState>("idle");
  const [lines, setLines] = useState<{ role: string; text: string }[]>([]);
  const [statusText, setStatusText] = useState("Tap to talk to your AI assistant");
  const vapiRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startBrowserCall = useCallback(async () => {
    setCallState("connecting");
    setStatusText("Connecting…");
    setLines([]);
    try {
      const { getVapi } = await import("@/lib/vapi");
      const vapi = getVapi();
      vapiRef.current = vapi;
      const orgId = useAuthStore.getState().user?.customerId ?? "";

      vapi.on("call-start", () => { setCallState("live"); setStatusText("Listening — speak now"); });
      vapi.on("speech-start", () => setStatusText("Listening…"));
      vapi.on("speech-end", () => setStatusText("Thinking…"));
      vapi.on("call-end", () => { setCallState("ended"); setStatusText("Call ended"); });
      vapi.on("error", () => { setCallState("ended"); setStatusText("Connection error"); });
      vapi.on("message", (m: any) => {
        // conversation-update carries the full running conversation — the most
        // reliable transcript source across Vapi SDK versions.
        if (m.type === "conversation-update" && Array.isArray(m.conversation)) {
          const next = m.conversation
            .filter((c: any) => c.role === "user" || c.role === "assistant")
            .map((c: any) => ({ role: c.role, text: String(c.content ?? "").trim() }))
            .filter((l: any) => l.text);
          if (next.length) setLines(next);
        } else if (m.type === "transcript" && m.transcriptType === "final") {
          setLines((prev) => [...prev, { role: m.role === "user" ? "user" : "assistant", text: m.transcript }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
      });

      // Use the SAME per-call overrides the phone dial builds, so browser and
      // phone calls behave identically (correct greeting, prompt, org KB tools).
      let overrides: any = { metadata: { orgId }, variableValues: { orgId } };
      try {
        const res = await fetch("/api/calls/overrides");
        if (res.ok) overrides = (await res.json()).overrides ?? overrides;
      } catch { /* fall back to metadata-only */ }
      await vapi.start(ASSISTANT_ID, overrides);
    } catch {
      setCallState("ended");
      setStatusText("Could not start call");
    }
  }, []);

  const endBrowserCall = () => {
    vapiRef.current?.stop();
    setCallState("ended");
    setStatusText("Call ended");
  };

  const isLive = callState === "live" || callState === "connecting";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
        Live Call
      </h1>
      <p className="text-sm mt-0.5 text-muted-foreground">
        Talk to your AI assistant in the browser, or place a real phone call from your toll-free line.
      </p>

      <div className="flex gap-1 rounded-xl p-1 w-fit border border-white/10 bg-white/5 mt-6">
        <button onClick={() => setTab("browser")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "browser" ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}>
          Browser call
        </button>
        <button onClick={() => setTab("phone")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "phone" ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}>
          Phone call
        </button>
      </div>

      {/* ── Browser call: orb + side transcript ── */}
      {tab === "browser" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Orb */}
          <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center min-h-[380px]">
            <div className="w-56 h-56 sm:w-64 sm:h-64">
              <VoicePoweredOrb hue={190} isActive={isLive} callState={callState === "live" ? "listening" : callState === "connecting" ? "connecting" : callState === "ended" ? "ended" : "idle"} />
            </div>
            <p className="text-sm text-muted-foreground mt-2 mb-4 text-center">{statusText}</p>
            {callState === "live" ? (
              <RippleButton variant="destructive" className="px-6 py-2.5" onClick={endBrowserCall}>
                <PhoneOff className="w-4 h-4" /> End call
              </RippleButton>
            ) : (
              <RippleButton variant="primary" className="px-6 py-2.5" onClick={startBrowserCall} disabled={callState === "connecting"}>
                {callState === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                {callState === "ended" ? "Call again" : "Start call"}
              </RippleButton>
            )}
          </div>

          {/* Transcript window */}
          <div className="glass-panel rounded-xl flex flex-col min-h-[380px]">
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-foreground">Live Transcript</p>
              <p className="text-xs text-muted-foreground">Real-time speech-to-text of your conversation</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
              {lines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  The conversation will appear here as you speak.
                </div>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className={`flex gap-3 ${l.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${l.role === "user" ? "bg-indigo-500/15 text-indigo-400" : "bg-cyan-400/15 text-cyan-400"}`}>
                      {l.role === "user" ? "You" : "AI"}
                    </div>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed text-foreground/90 ${l.role === "user" ? "bg-indigo-500/10 rounded-tr-sm" : "bg-cyan-400/10 rounded-tl-sm"}`}>
                      {l.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Phone dial ── */}
      {tab === "phone" && (
        <div className="glass-panel rounded-xl p-6 mt-4 space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">From</span>
            <span className="font-mono text-cyan-400">+1 (901) 669 3011</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">Twilio · toll-free</span>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Call to (international format)</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+919746621918"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors" />
          </div>
          <RippleButton variant="primary" className="w-full py-2.5" onClick={dial} disabled={loading || !to.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
            {loading ? "Placing call…" : "Call now"}
          </RippleButton>
          {result && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {result.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{result.msg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
