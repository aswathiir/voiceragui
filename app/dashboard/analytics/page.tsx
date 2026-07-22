"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Sparkles, Clock, BarChart2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCallStore } from "@/lib/stores/callStore";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";

const CYAN = "#fb923c";

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const { calls } = useCallStore();
  const customerId = user?.customerId ?? "cust_001";
  const customerCalls = useMemo(
    () => calls.filter((c) => c.customerId === customerId),
    [calls, customerId],
  );

  const [questions, setQuestions] = useState<string[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Peak call times — bucket by hour of day
  const hourlyVolume = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, calls: 0 }));
    customerCalls.forEach((c) => {
      const h = new Date(c.startTime).getHours();
      buckets[h].calls += 1;
    });
    return buckets.filter((b) => b.calls > 0).length ? buckets : buckets;
  }, [customerCalls]);

  const avgResolutionSeconds = useMemo(() => {
    const resolved = customerCalls.filter((c) => c.status === "completed" || c.status === "limit_reached");
    if (resolved.length === 0) return 0;
    return Math.round(resolved.reduce((s, c) => s + c.durationSeconds, 0) / resolved.length);
  }, [customerCalls]);

  const aiResolvedPct = useMemo(() => {
    if (customerCalls.length === 0) return 0;
    return Math.round((customerCalls.filter((c) => c.resolvedByAI).length / customerCalls.length) * 100);
  }, [customerCalls]);

  useEffect(() => {
    const withTranscripts = customerCalls.filter((c) => c.transcript.length > 0).slice(0, 15);
    if (withTranscripts.length === 0) return;

    setLoadingQuestions(true);
    fetch("/api/calls/top-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcripts: withTranscripts.map((c) => c.transcript) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setQuestionsError(data.error);
        else setQuestions(data.questions ?? []);
      })
      .catch(() => setQuestionsError("Could not load top questions"))
      .finally(() => setLoadingQuestions(false));
    // Only recompute when the customer's call set changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerCalls.length]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Analytics
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Peak call times, resolution speed, and recurring caller questions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Calls" value={customerCalls.length} icon={BarChart2} />
        <StatCard
          label="Avg Resolution Time"
          value={`${Math.floor(avgResolutionSeconds / 60)}:${String(avgResolutionSeconds % 60).padStart(2, "0")}`}
          icon={Clock}
        />
        <StatCard label="Resolved by AI" value={`${aiResolvedPct}%`} icon={Sparkles} />
      </div>

      <div className="glass-panel rounded-xl p-5">
        <p className="text-sm font-semibold mb-4 text-foreground">Calls by hour of day</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8b8fa3" }} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: "#8b8fa3" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "#0d0d1a",
                fontSize: 12,
                color: "#e2e8f0",
              }}
              cursor={{ fill: "rgba(251,146,60,0.06)" }}
            />
            <Bar dataKey="calls" fill={CYAN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <p className="text-sm font-semibold text-foreground">Top 5 recurring questions</p>
        </div>
        {loadingQuestions ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" style={{ maxWidth: `${95 - i * 8}%` }} />
            ))}
          </div>
        ) : questionsError ? (
          <p className="text-sm text-red-400">{questionsError}</p>
        ) : !questions || questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough transcripts yet — questions will appear here once calls come in.
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/90">
                <span className="font-bold text-cyan-400">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
