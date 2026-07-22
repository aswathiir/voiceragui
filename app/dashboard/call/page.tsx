"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Vapi from "@vapi-ai/web";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  MessageSquare,
} from "lucide-react";
import { VoicePoweredOrb } from "@/components/ui/voice-orb";
import { ASSISTANT_ID, type CallState } from "@/lib/vapi";
import { formatDuration } from "@/lib/utils";
import { saveCallRecord } from "@/lib/store";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCallStore } from "@/lib/stores/callStore";

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState("Ready to connect");
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stateLabel: Record<CallState, string> = {
    idle: "Ready to connect",
    connecting: "Connecting to assistant...",
    listening: "Listening...",
    processing: "Processing your question...",
    speaking: "Speaking...",
    ended: "Call ended",
    error: "Connection error",
  };

  const stateColor: Record<CallState, string> = {
    idle: "text-muted-foreground",
    connecting: "text-amber-400",
    listening: "text-cyan-400",
    processing: "text-amber-400",
    speaking: "text-indigo-400",
    ended: "text-muted-foreground",
    error: "text-destructive",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startCall = useCallback(async () => {
    try {
      setCallState("connecting");
      setStatusText(stateLabel.connecting);
      setMessages([]);
      setDuration(0);

      const { getVapi } = await import("@/lib/vapi");
      const vapi = getVapi();
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setCallState("listening");
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      });

      vapi.on("speech-start", () => setCallState("listening"));
      vapi.on("speech-end", () => setCallState("processing"));

      vapi.on("message", (msg: any) => {
        // Only handle final transcript messages — ignore tool-calls, tool-call-result,
        // function-call, hang, and any other internal VAPI message types.
        if (msg.type !== "transcript" || msg.transcriptType !== "final") return;
        setMessages((prev) => [...prev, { role: msg.role, text: msg.transcript, ts: Date.now() }]);
        if (msg.role === "assistant") setCallState("speaking");
        else setCallState("listening");
      });

      vapi.on("call-end", () => {
        setCallState("ended");
        clearInterval(timerRef.current);
      });

      vapi.on("error", () => {
        setCallState("error");
        clearInterval(timerRef.current);
      });

      // Bind this call to the logged-in org so the RAG tool queries the
      // caller's own Pinecone namespace. The metadata rides along on every
      // Vapi webhook (message.call.metadata) and /api/query reads it — this
      // overrides any static ?orgId= baked into the shared assistant's tool
      // URL, so each new client automatically gets their own KB without a
      // per-org Vapi assistant.
      const orgId = useAuthStore.getState().user?.customerId ?? "";

      if (ASSISTANT_ID) {
        await vapi.start(ASSISTANT_ID, {
          metadata: { orgId },
          variableValues: { orgId },
        } as Parameters<typeof vapi.start>[1]);
        return;
      }

      await vapi.start(
        {
          // Fallback inline config when no assistant ID is set
          transcriber: { provider: "deepgram", model: "nova-2", language: "en-IN" },
          model: {
            provider: "groq",
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a voice assistant for Indian government welfare schemes. Follow these rules strictly:
1. For EVERY user question, call voice_rag_query EXACTLY ONCE with the user's full question. Never call it more than once per message.
2. After getting the tool result, respond in 2 short spoken sentences max — simple, clear language.
3. NEVER read out any URLs, website addresses, domain names, or links. If the answer contains a URL, skip it entirely.
4. NEVER say things like 'according to the tool' or 'the result shows'. Just answer naturally as if you knew it.
5. If unsure, say 'I don't have details on that, but you can check the NCW website for more information.' and stop.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "voice_rag_query",
                  description:
                    "Search the knowledge base for information about women government schemes",
                  parameters: {
                    type: "object",
                    properties: {
                      user_question: { type: "string", description: "The user's question" },
                    },
                    required: ["user_question"],
                  },
                },
                // ✅ Route through the Next.js proxy so CORS is bypassed and n8n URL stays server-side
                // timeoutSeconds: 20 → VAPI waits up to 20s before saying "Sorry, a few more seconds"
                server: {
                  url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/query${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`,
                  timeoutSeconds: 20,
                },
              },
            ],
          },
          voice: { provider: "azure", voiceId: "en-US-AriaNeural" },
          name: "VoiceRAG Assistant",
          firstMessage:
            "Hello! I'm your voice assistant for women-centric government schemes. What would you like to know?",
        }
      );
    } catch (err) {
      console.error("Call start failed:", err);
      setCallState("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    clearInterval(timerRef.current);
    if (messages.length > 0) {
      saveCallRecord({
        duration,
        messages,
        summary: messages.find((m) => m.role === "assistant")?.text ?? "No summary",
        topics: [],
      });

      // Persist to the org's server-side call log so the call shows up in
      // /dashboard/calls, analytics, and the admin views.
      if (useAuthStore.getState().user?.customerId) {
        const startTs = messages[0]?.ts ?? Date.now() - duration * 1000;
        useCallStore.getState().saveWebCall({
          transcript: messages.map((m) => ({
            speaker: m.role === "assistant" ? ("ai" as const) : ("caller" as const),
            text: m.text,
            timestampSeconds: Math.max(0, Math.round((m.ts - startTs) / 1000)),
          })),
          durationSeconds: duration,
          resolvedByAI: true,
        });
      }
    }
    setCallState("idle");
    setDuration(0);
  }, [messages, duration]);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.setMuted(!muted);
      setMuted(!muted);
    }
  }, [muted]);

  const isActive = ["listening", "processing", "speaking", "connecting"].includes(callState);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Live Call</h1>
          <p className="text-sm text-muted-foreground">VAPI Voice Assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${stateColor[callState]}`}>
            {stateLabel[callState]}
          </span>
          {isActive && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-sm text-foreground">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: Orb + controls */}
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center gap-8 p-8">
          {/* Orb */}
          <div className="relative">
            <motion.div
              animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="w-56 h-56 relative"
            >
              <VoicePoweredOrb callState={callState} className="w-full h-full" />
            </motion.div>

            {/* Pulse rings when active */}
            <AnimatePresence>
              {isActive && (
                <>
                  {[1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-indigo-500/20"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.4 + i * 0.3, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: i * 0.4,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Status */}
          <div className="text-center">
            <motion.p
              key={callState}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-medium ${stateColor[callState]}`}
            >
              {stateLabel[callState]}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {isActive ? formatDuration(duration) : "—"}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {isActive && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMute}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    muted
                      ? "bg-destructive/20 border-destructive/40 text-destructive"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-full flex items-center justify-center border bg-white/5 border-white/10 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                </motion.button>
              </>
            )}

            {/* Main call button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={isActive ? endCall : startCall}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all font-medium shadow-lg ${
                isActive
                  ? "bg-destructive hover:bg-destructive/90 text-white glow-indigo"
                  : callState === "ended" || callState === "idle" || callState === "error"
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white glow-indigo"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              disabled={callState === "connecting"}
            >
              {isActive ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </motion.button>
          </div>

          {/* AI badge */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>VAPI · Groq Llama 3.3 70B · Pinecone RAG</span>
          </motion.div>
        </div>

        {/* Right: Live transcript */}
        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-foreground">Live Transcript</span>
            {isActive && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="status-dot-active" />
                <span className="text-xs text-cyan-400 font-mono">live</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <AnimatePresence>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-indigo-400/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start a call to see live transcript
                  </p>
                  <p className="text-xs font-mono text-muted-foreground/40">
                    Try: &ldquo;What schemes are available for women?&rdquo;
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        msg.role === "user"
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-orange-500/20 text-cyan-400 border border-orange-500/30"
                      }`}
                    >
                      {msg.role === "user" ? "U" : "AI"}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-500/10 border border-indigo-500/20 text-foreground"
                          : "bg-white/5 border border-white/8 text-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
