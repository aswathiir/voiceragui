import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Thin client cache over /api/calls — the call log now lives server-side in
// a file-backed repository (lib/server/callRepository.ts), so records survive
// restarts and web calls made on /dashboard/call are persisted for real.
// callerDailyUsage is derived server-side from the same log.

export type CallStatus = 'active' | 'completed' | 'dropped' | 'limit_reached';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface TranscriptLine {
  speaker: 'caller' | 'ai';
  text: string;
  timestampSeconds: number;
}

export interface CallRecord {
  id: string;
  customerId: string;
  callerNumber: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  status: CallStatus;
  costINR: number;
  transcript: TranscriptLine[];
  resolvedByAI: boolean;
  language: 'en' | 'ml' | 'ar';
  aiSummary?: string;
  aiIntent?: string;
  sentiment?: Sentiment;
  analyzing?: boolean;
}

export interface CallerDailyUsage {
  callerNumber: string;
  customerId: string;
  date: string; // 'YYYY-MM-DD'
  totalSecondsUsed: number;
  callCount: number;
  limitReached: boolean;
}

interface CallStore {
  calls: CallRecord[];
  callerDailyUsage: Record<string, CallerDailyUsage>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Persist a finished web call (Vapi browser call) to the server log. */
  saveWebCall: (input: {
    transcript: TranscriptLine[];
    durationSeconds: number;
    language?: 'en' | 'ml' | 'ar';
    resolvedByAI?: boolean;
  }) => Promise<void>;
  analyzeCall: (callId: string) => Promise<void>;
}

export const useCallStore = create<CallStore>((set, get) => ({
  calls: [],
  callerDailyUsage: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const res = await fetch('/api/calls');
    // Not authenticated yet — leave hydrated:false so a post-login call retries.
    if (!res.ok) return;
    const { calls, callerDailyUsage } = await res.json();
    set({ calls, callerDailyUsage, hydrated: true });
  },

  saveWebCall: async ({ transcript, durationSeconds, language = 'en', resolvedByAI = true }) => {
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, durationSeconds, language, resolvedByAI }),
    });
    if (!res.ok) return;
    const { call } = await res.json();
    set((s) => ({ calls: [...s.calls, call] }));
  },

  analyzeCall: async (callId) => {
    const call = get().calls.find((c) => c.id === callId);
    if (!call || call.transcript.length === 0) return;

    set((s) => ({
      calls: s.calls.map((c) => (c.id === callId ? { ...c, analyzing: true } : c)),
    }));

    try {
      const res = await fetch('/api/calls/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: call.transcript }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const { summary, intent, sentiment } = await res.json();

      set((s) => ({
        calls: s.calls.map((c) =>
          c.id === callId
            ? { ...c, aiSummary: summary, aiIntent: intent, sentiment, analyzing: false }
            : c,
        ),
      }));

      // Persist so the analysis survives reloads and shows for the admin too.
      fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: summary, aiIntent: intent, sentiment }),
      });
    } catch {
      set((s) => ({
        calls: s.calls.map((c) => (c.id === callId ? { ...c, analyzing: false } : c)),
      }));
    }
  },
}));

// Refetch when the signed-in user changes — a different org (or the admin)
// must never see the previous session's cached call log.
let lastUserId: string | null | undefined;
useAuthStore.subscribe((state) => {
  const userId = state.user?.id ?? null;
  if (userId === lastUserId) return;
  lastUserId = userId;
  useCallStore.setState({ calls: [], callerDailyUsage: {}, hydrated: false });
  // Re-hydrate immediately for the new user — this also closes the ordering
  // race on hard page loads where auth rehydration can land after the
  // layout's hydrate() call and would otherwise leave the store empty.
  if (userId) void useCallStore.getState().hydrate();
});
