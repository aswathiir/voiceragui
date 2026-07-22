import { create } from 'zustand';

// "Customer" = an Organization that subscribes to BeyondForms.
// Each Organization has N end-users ("callers") who call their AI phone line.
// Each caller gets a 3-minute daily limit, enforced by the call store.
//
// State here is a thin client cache over /api/admin/organizations and
// /api/admin/usage, which read/write a file-backed repository
// (lib/server/adminRepository.ts) instead of holding mock data directly —
// suspend/unsuspend/plan changes now survive a server restart.

export type OrgPlan = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise';
export type OrgStatus = 'active' | 'trial' | 'suspended';

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
  planCallsIncluded: number;   // monthly call quota
  status: OrgStatus;
  joinedAt: string;
  monthlyFee: number;          // INR (0 for free)
  callerDailyLimitSeconds: number; // per end-user per day
}

export interface OrgUsage {
  orgId: string;
  month: string;            // 'YYYY-MM'
  totalCalls: number;
  totalMinutes: number;
  callsRemaining: number;
  minutesRemaining: number;
  estimatedInfraCost: number; // INR — BeyondForms' cost
  revenue: number;            // INR — what org pays
  activeCalls: number;
  uniqueCallers: number;      // unique end-user phone numbers this month
}

interface AdminStore {
  organizations: Organization[];
  usageByOrg: Record<string, OrgUsage>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Clears the cached data so the next authenticated session refetches fresh. */
  reset: () => void;
  suspendOrg: (id: string) => void;
  unsuspendOrg: (id: string) => void;
  updatePlan: (id: string, plan: OrgPlan) => void;
}

export const PLAN_META: Record<OrgPlan, {
  calls: number;
  fee: number;
  label: string;
  color: string;
  features: string[];
}> = {
  free: {
    calls: 100,
    fee: 0,
    label: 'Free',
    color: '#6366F1',
    features: [
      '100 calls/month',
      'English only',
      '1 KB file upload',
      'Community support',
      '3-min caller daily limit',
      'BeyondForms watermark',
    ],
  },
  starter: {
    calls: 2500,
    fee: 74700,
    label: 'Starter',
    color: '#0EA5E9',
    features: [
      '2,500 calls/month',
      'English + 1 language',
      '10 KB file uploads',
      'Email support',
      '3-min caller daily limit',
      'Custom greeting',
    ],
  },
  growth: {
    calls: 5000,
    fee: 149400,
    label: 'Growth',
    color: '#00A693',
    features: [
      '5,000 calls/month',
      'English + Malayalam',
      'Unlimited KB uploads',
      'Priority support',
      '3-min caller daily limit',
      'Advanced analytics',
      'API access',
    ],
  },
  scale: {
    calls: 10000,
    fee: 262500,
    label: 'Scale',
    color: '#0F2C5C',
    features: [
      '10,000 calls/month',
      'All languages (En, Ml, Ar)',
      'Unlimited KB uploads',
      'Dedicated SLA',
      '3-min caller daily limit',
      'Full analytics suite',
      'Custom integrations',
    ],
  },
  enterprise: {
    calls: 25000,
    fee: 0,
    label: 'Enterprise',
    color: '#7C3AED',
    features: [
      '25,000+ calls/month',
      'All languages',
      'White-glove onboarding',
      'Custom SLA & contracts',
      'Configurable caller limit',
      'Custom branding',
    ],
  },
};

export const useAdminStore = create<AdminStore>((set, get) => ({
  organizations: [],
  usageByOrg: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const [orgsRes, usageRes] = await Promise.all([
      fetch('/api/admin/organizations'),
      fetch('/api/admin/usage'),
    ]);
    // Not authenticated yet (e.g. called before login completes) — leave
    // hydrated:false so a later call (post-login) retries instead of
    // permanently caching an empty/undefined state for the session.
    if (!orgsRes.ok || !usageRes.ok) return;

    const { organizations } = await orgsRes.json();
    const { usageByOrg } = await usageRes.json();
    set({ organizations, usageByOrg, hydrated: true });
  },

  reset: () => {
    set({ organizations: [], usageByOrg: {}, hydrated: false });
  },

  suspendOrg: (id) => {
    set((s) => ({
      organizations: s.organizations.map((o) =>
        o.id === id ? { ...o, status: 'suspended' as OrgStatus } : o,
      ),
    }));
    fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });
  },

  unsuspendOrg: (id) => {
    set((s) => ({
      organizations: s.organizations.map((o) =>
        o.id === id ? { ...o, status: 'active' as OrgStatus } : o,
      ),
    }));
    fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
  },

  updatePlan: (id, plan) => {
    set((s) => ({
      organizations: s.organizations.map((o) =>
        o.id === id
          ? { ...o, plan, planCallsIncluded: PLAN_META[plan].calls, monthlyFee: PLAN_META[plan].fee }
          : o,
      ),
    }));
    fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
  },
}));
