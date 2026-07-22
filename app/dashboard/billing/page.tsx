"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { PLAN_META } from "@/lib/stores/adminStore";
import { PricingCard } from "@/components/ui/pricing-card";
import { ContainerScroll } from "@/components/ui/container-scroll";

type Duration = "monthly" | "quarterly" | "annual";
type PlanKey = "free" | "starter" | "growth" | "scale" | "enterprise";

const DISCOUNT: Record<Duration, number> = {
  monthly: 0,
  quarterly: 0.05,
  annual: 0.15,
};

const PLANS: PlanKey[] = ["free", "starter", "growth", "scale", "enterprise"];

const PLAN_DESCRIPTIONS: Record<PlanKey, string> = {
  free: "Try the AI line, no charge.",
  starter: "For clinics getting started.",
  growth: "Multi-language + analytics.",
  scale: "High volume, full suite.",
  enterprise: "Custom contracts & SLA.",
};

function fmtINR(v: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);
}

export default function BillingPage() {
  const { user } = useAuthStore();
  const currentPlan = (user?.plan ?? "growth") as PlanKey;

  const [duration, setDuration] = useState<Duration>("monthly");
  const [projCalls, setProjCalls] = useState(4500);
  const [projDuration, setProjDuration] = useState(3);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const discountRate = DISCOUNT[duration];
  const getPrice = (plan: PlanKey): number | null => {
    if (plan === "enterprise") return null;
    if (plan === "free") return 0;
    return Math.round(PLAN_META[plan].fee * (1 - discountRate));
  };

  // Cost projector
  const totalMinutes = projCalls * projDuration;
  const infraCost = Math.round(totalMinutes * 6.86);
  const planFee = getPrice(currentPlan) ?? 0;
  const totalCost = infraCost + planFee;
  const payPerCall = projCalls * 12;
  const saving = Math.max(0, payPerCall - totalCost);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Billing &amp; Plans
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Manage your subscription · All plans include a <strong>3-min / caller / day</strong> limit for your end-users
        </p>
      </div>

      {/* Duration toggle */}
      <div className="flex gap-1 rounded-xl p-1 w-fit border border-white/10 bg-white/5">
        {(["monthly", "quarterly", "annual"] as Duration[]).map((d) => (
          <button key={d} onClick={() => setDuration(d)}
            className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-2 ${
              duration === d ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"
            }`}>
            {d}
            {d !== "monthly" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                duration === d ? "bg-black/15 text-black" : "bg-cyan-400/10 text-cyan-400"
              }`}>
                -{DISCOUNT[d] * 100}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan grid — glassy pricing cards, scroll-tilts into view */}
      <ContainerScroll>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 xl:gap-3 pt-3">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan];
          const price = getPrice(plan);
          const isCurrent = plan === currentPlan;
          const isFree = plan === "free";
          const isEnterprise = plan === "enterprise";

          return (
            <PricingCard
              key={plan}
              planName={meta.label}
              description={PLAN_DESCRIPTIONS[plan]}
              price={isEnterprise ? "Custom" : price === 0 ? "Free" : fmtINR(price!)}
              features={[
                isEnterprise ? "Talk to us" : `${meta.calls.toLocaleString("en-IN")} calls/month`,
                "3-min limit / end-user / day",
                ...meta.features.slice(1, 4),
              ]}
              buttonText={
                isFree ? "You are above free" : isEnterprise ? "Contact us" : plan === "starter" ? "Downgrade" : "Upgrade"
              }
              isPopular={plan === "growth" && !isCurrent}
              isCurrent={isCurrent}
              onSelect={() => {
                if (isCurrent || isFree) return;
                showToast(`Contact support to ${plan === "starter" ? "downgrade" : "upgrade"}: support@beyondforms.in`);
              }}
              className="xl:scale-100"
            />
          );
        })}
      </div>
      </ContainerScroll>

      {/* Free tier detail box */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500/15">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold mb-1 text-foreground">
              Free Tier — What&apos;s included and what&apos;s not
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold mb-1 text-foreground">✓ Included</p>
                {["100 calls / month", "3-minute caller daily limit (same as paid)", "English language STT", "1 knowledge base file", "Basic call analytics"].map((f) => (
                  <p key={f} className="flex items-start gap-1.5 mb-0.5">
                    <span className="text-emerald-400">✓</span> {f}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold mb-1 text-foreground">✗ Not included (upgrade to unlock)</p>
                {["Malayalam / Arabic STT", "Multiple KB files", "Priority / dedicated support", "API access & webhooks", "Custom branding (BeyondForms logo shown)"].map((f) => (
                  <p key={f} className="flex items-start gap-1.5 mb-0.5">
                    <span className="text-red-400">✗</span> {f}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost projector */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-bold mb-5 text-foreground">Cost Projector</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium block mb-1.5 text-muted-foreground">Expected calls / month</label>
            <input type="number" value={projCalls} onChange={(e) => setProjCalls(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 transition-colors" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-muted-foreground">Avg call duration</label>
              <span className="text-sm font-semibold text-cyan-400">{projDuration} min</span>
            </div>
            <input type="range" min={1} max={3} step={0.5} value={projDuration}
              onChange={(e) => setProjDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer mt-2.5"
              style={{ accentColor: "#fb923c" }} />
            <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
              <span>1 min</span>
              <span className="text-red-400 font-semibold">3 min ← caller limit</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: "Total minutes", value: `${totalMinutes.toLocaleString("en-IN")} min` },
                { label: "Infrastructure cost (₹6.86/min)", value: fmtINR(infraCost), sub: true },
                { label: `${PLAN_META[currentPlan].label} plan fee`, value: planFee === 0 ? "Free" : fmtINR(planFee), sub: true },
                { label: "Your total monthly cost", value: fmtINR(totalCost), bold: true },
                { label: "vs pay-per-call (est. ₹12/call)", value: saving > 0 ? `Save ${fmtINR(saving)}` : "Similar cost", green: true },
              ].map(({ label, value, sub, bold, green }) => (
                <tr key={label} className={`border-t border-white/10 ${bold ? "bg-emerald-500/5" : ""}`}>
                  <td className={`px-5 py-3 text-sm ${sub ? "text-muted-foreground pl-7" : "text-foreground"} ${bold ? "font-bold" : ""}`}>
                    {sub ? `↳ ${label}` : label}
                  </td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${
                    green ? "text-emerald-400" : bold ? "text-cyan-400" : "text-foreground"
                  }`}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-xl z-50 glass-panel border border-cyan-400/25 text-foreground">
          {toast}
        </motion.div>
      )}
    </div>
  );
}
