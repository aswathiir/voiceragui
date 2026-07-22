"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CornerDownLeft } from "lucide-react";
import { Textarea } from "@/components/ui/primitives";
import { useAuthStore } from "@/lib/stores/authStore";

interface Msg {
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
  ts?: number;
}

const SUGGESTED = [
  {
    label: "What schemes are available for women empowerment?",
    query: "government schemes for women empowerment",
  },
  { label: "Tell me about Beti Bachao Beti Padhao", query: "Beti Bachao Beti Padhao details" },
  {
    label: "How to apply for Mahila Samridhi Yojana?",
    query: "Mahila Samridhi Yojana application",
  },
  { label: "What is the Nandini Sahakar scheme?", query: "Nandini Sahakar" },
];

async function query(question: string): Promise<string> {
  // Logged-in customers query their own org's KB namespace; anonymous
  // visitors fall through to the shared demo knowledge base.
  const orgId = useAuthStore.getState().user?.customerId;
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orgId ? { question, orgId } : { question }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data.answer ?? "No answer returned.";
}

const CHAT_STORAGE_KEY = "chat_messages";

export default function ChatPage() {
  // Always start with empty state so SSR and client first-render match.
  // localStorage is loaded in a useEffect after hydration to avoid mismatch.
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load persisted state from localStorage after first client-side render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    const draft = localStorage.getItem("chat_draft_input");
    if (draft) setInput(draft);
    setHydrated(true);
  }, []);

  // Save messages to localStorage whenever they change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  // Save draft input to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chat_draft_input", input);
    }
  }, [input]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string, displayText?: string) => {
    if (!text.trim() || loading) return;
    const q = text.trim();
    const displayQ = (displayText || text).trim();
    setInput("");
    const ts = Date.now();
    setMessages((p) => [...p, { role: "user", text: displayQ, ts }]);
    setLoading(true);
    setMessages((p) => [...p, { role: "assistant", text: "", loading: true, ts: ts + 1 }]);
    try {
      const answer = await query(q);
      setMessages((p) => {
        const u = [...p];
        u[u.length - 1] = { role: "assistant", text: answer, ts: Date.now() };
        return u;
      });
    } catch (e: any) {
      setMessages((p) => {
        const u = [...p];
        u[u.length - 1] = {
          role: "assistant",
          text: `Error connecting to Assistant. ${e.message}`,
          ts: Date.now(),
        };
        return u;
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const formatTime = (ts?: number) =>
    ts ? new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Text Chat</h1>
          <p className="text-sm text-muted-foreground">Knowledge base queries via text</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6 py-8"
            >
              <div className="text-center">
                <p className="font-display text-base font-semibold text-foreground">Ask anything</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Queries run through the live RAG pipeline and return sourced answers.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.query, q.label)}
                    className="text-left text-xs bg-muted/40 hover:bg-muted/70 border border-border hover:border-primary/20 rounded-xl px-4 py-3 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border ${
                    msg.role === "user"
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? "U" : "R"}
                </div>
                <div
                  className={`flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary/10 border border-primary/15 text-foreground rounded-tr-sm"
                        : "bg-muted/50 border border-border text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 py-0.5">
                        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                        <span className="text-muted-foreground font-mono text-xs">
                          Assistant is thinking...
                        </span>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/40 px-1 font-mono">
                    {formatTime(msg.ts)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 bg-muted/20">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about a government scheme..."
                rows={1}
                className="bg-card border-border focus:border-primary/30 resize-none min-h-[44px] max-h-28 py-3 text-sm"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all disabled:opacity-30 shrink-0 mb-0.5"
            >
              <Send className="w-4 h-4 stroke-[1.5]" />
            </motion.button>
          </div>
          <div className="flex items-center gap-1.5 mt-2 px-1">
            <CornerDownLeft className="w-3 h-3 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground/30">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
