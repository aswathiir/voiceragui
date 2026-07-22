"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { ShaderBackground } from "@/components/ui/shader-background";

function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.role === "super_admin") router.push("/admin/overview");
      else router.push("/dashboard/home");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      {/* Card */}
      <div className="glass-panel rounded-2xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">BeyondForms</p>
            <p className="text-xs text-muted-foreground">Voice AI Platform</p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-all mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </motion.form>
      </div>

      <p className="text-center text-xs text-muted-foreground/40 mt-6 font-mono">
        Demo password for all accounts: password
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="neural-bg min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <ShaderBackground className="pointer-events-none absolute inset-0 w-full h-full opacity-70" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
