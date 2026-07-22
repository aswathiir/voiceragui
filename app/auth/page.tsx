"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"login" | "signup">(
    params.get("tab") === "signup" ? "signup" : "login"
  );
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulated auth
    router.push("/dashboard/call");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Card */}
      <div className="glass-panel rounded-2xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">VoiceRAG</p>
            <p className="text-xs text-muted-foreground">AI Voice Intelligence</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex p-1 bg-white/5 rounded-lg mb-8">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                tab === t
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {tab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Full Name
                </label>
                <Input
                  placeholder="Aswathi Ranjith"
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-11 font-medium mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full block"
                  />
                  {tab === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : tab === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {tab === "login" ? "No account? " : "Already registered? "}
              <button
                type="button"
                onClick={() => setTab(tab === "login" ? "signup" : "login")}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {tab === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </motion.form>
        </AnimatePresence>
      </div>

      <p className="text-center text-xs text-muted-foreground/40 mt-6 font-mono">
        Demo: any email + password works
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <main className="neural-bg min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>
      <Suspense>
        <AuthForm />
      </Suspense>
    </main>
  );
}
