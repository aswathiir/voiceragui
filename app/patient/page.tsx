"use client";

// Patient-facing portal: the hospital's END USERS talk to the AI about their
// reports, timings, doctors — via an in-browser voice call, or by having the
// toll-free line call their phone. No dashboard login required.

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneCall, Loader2, CheckCircle, XCircle, PhoneOff } from "lucide-react";
import { RippleButton } from "@/components/ui/ripple-button";
import { VoicePoweredOrb } from "@/components/ui/voice-orb";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { ASSISTANT_ID } from "@/lib/vapi";

type Tab = "browser" | "phone";
type CallState = "idle" | "connecting" | "live" | "ended";

function PatientPortal() {
  const params = useSearchParams();
  const orgId = params.get("org") ?? "cust_001";
  const orgLabel = params.get("name") ?? "Mythra Hospital";
  const [tab, setTab] = useState<Tab>("browser");

  // ── Phone "call me back" ──
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const requestCall = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/patient/dial", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: to, orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place call");
      setResult({ ok: true, msg: `Calling ${data.to} now — please answer.` });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Could not place call" });
    } finally { setLoading(false); }
  };

  // ── Browser voice call ──
  const [callState, setCallState] = useState<CallState>("idle");
  const [lines, setLines] = useState<{ role: string; text: string }[]>([]);
  const [statusText, setStatusText] = useState("Tap to talk to the assistant");
  const vapiRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startBrowserCall = useCallback(async () => {
    setCallState("connecting"); setStatusText("Connecting…"); setLines([]);
    try {
      const { getVapi } = await import("@/lib/vapi");
      const vapi = getVapi(); vapiRef.current = vapi;
      vapi.on("call-start", () => { setCallState("live"); setStatusText("Listening — speak now"); });
      vapi.on("speech-start", () => setStatusText("Listening…"));
      vapi.on("speech-end", () => setStatusText("Thinking…"));
      vapi.on("call-end", () => { setCallState("ended"); setStatusText("Call ended"); });
      vapi.on("error", () => { setCallState("ended"); setStatusText("Connection error"); });
      vapi.on("message", (m: any) => {
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
      let overrides: any = { metadata: { orgId }, variableValues: { orgId } };
      try {
        const res = await fetch(`/api/calls/overrides?orgId=${encodeURIComponent(orgId)}`);
        if (res.ok) overrides = (await res.json()).overrides ?? overrides;
      } catch { /* fall back to metadata-only */ }
      await vapi.start(ASSISTANT_ID, overrides);
    } catch { setCallState("ended"); setStatusText("Could not start"); }
  }, [orgId]);

  const endBrowserCall = () => { vapiRef.current?.stop(); setCallState("ended"); setStatusText("Call ended"); };

  return (
    <div className="relative min-h-screen neural-bg text-foreground overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20"><ShaderAnimation /></div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-400 text-black font-bold text-sm flex items-center justify-center shadow-[0_0_16px_rgba(251,146,60,0.4)]">BF</div>
            <span className="font-semibold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">BeyondForms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Talk to {orgLabel}&apos;s AI assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">Ask about your reports, timings, doctors, or book an appointment — by voice.</p>
        </div>

        <div className="flex gap-1 rounded-xl p-1 w-fit mx-auto border border-white/10 bg-white/5 mb-4">
          <button onClick={() => setTab("browser")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "browser" ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}>Talk here</button>
          <button onClick={() => setTab("phone")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "phone" ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}>Call me back</button>
        </div>

        {tab === "browser" && (
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center">
            <div className="w-56 h-56 sm:w-64 sm:h-64">
              <VoicePoweredOrb hue={190} isActive={callState === "live" || callState === "connecting"}
                callState={callState === "live" ? "listening" : callState === "connecting" ? "connecting" : callState === "ended" ? "ended" : "idle"} />
            </div>
            <p className="text-sm text-muted-foreground mt-2 mb-4">{statusText}</p>
            {callState === "live" ? (
              <RippleButton variant="destructive" className="px-8 py-3" onClick={endBrowserCall}><PhoneOff className="w-4 h-4" /> End</RippleButton>
            ) : (
              <RippleButton variant="primary" className="px-8 py-3" onClick={startBrowserCall} disabled={callState === "connecting"}>
                {callState === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                {callState === "ended" ? "Talk again" : "Start talking"}
              </RippleButton>
            )}
            {lines.length > 0 && (
              <div ref={scrollRef} className="w-full mt-5 max-h-56 overflow-y-auto border-t border-white/10 pt-4 space-y-2 text-left">
                {lines.map((l, i) => (
                  <p key={i} className={`text-sm ${l.role === "user" ? "text-foreground" : "text-cyan-300"}`}>
                    <span className="text-[10px] uppercase text-muted-foreground mr-2">{l.role === "user" ? "You" : "AI"}</span>{l.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "phone" && (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Enter your number and the AI will call you from the hospital&apos;s toll-free line.</p>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+91 97466 21918"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors" />
            <RippleButton variant="primary" className="w-full py-3" onClick={requestCall} disabled={loading || !to.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
              {loading ? "Calling…" : "Call me now"}
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
    </div>
  );
}

export default function PatientPage() {
  return <Suspense><PatientPortal /></Suspense>;
}
