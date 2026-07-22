import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrgPlan } from './adminStore';
import { useAdminStore } from './adminStore';

export type UserRole = 'super_admin' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId: string | null; // matches Organization.id
  plan: OrgPlan | null;
  planStartDate: string | null;
  planEndDate: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // Set while a super_admin is viewing the product as an organization.
  // Holds the admin's own user record so "Return to Admin" can restore it.
  impersonatedBy: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonate: (orgId: string) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthStore>()(
  // persist saves user + isAuthenticated to localStorage so page refreshes
  // don't log the user out — critical for proper routing to work.
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      impersonatedBy: null,
      login: async (email: string, password: string) => {
        // Credential check now happens server-side (app/api/auth/login) —
        // still the same plaintext mock check, but verifying it server-side
        // lets us issue a signed session cookie the API routes can trust,
        // instead of every route just believing whatever the client claims.
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Invalid email or password' }));
          throw new Error(body.error ?? 'Invalid email or password');
        }
        const { user } = await res.json();
        // Drop any cached data from a previous session on this browser —
        // a different org (or role) may be signing in.
        useAdminStore.getState().reset();
        set({ user, isAuthenticated: true, impersonatedBy: null });
      },
      logout: () => {
        fetch('/api/auth/logout', { method: 'POST' });
        useAdminStore.getState().reset();
        set({ user: null, isAuthenticated: false, impersonatedBy: null });
      },

      impersonate: (orgId: string) => {
        const { user, impersonatedBy } = get();
        if (!user || user.role !== 'super_admin' || impersonatedBy) return;

        const org = useAdminStore.getState().organizations.find((o) => o.id === orgId);
        if (!org) return;

        set({
          impersonatedBy: user,
          user: {
            id: `impersonated_${orgId}`,
            name: org.name,
            email: `${orgId}@impersonated.local`,
            role: 'customer',
            customerId: org.id,
            plan: org.plan,
            planStartDate: null,
            planEndDate: null,
          },
        });
      },

      stopImpersonation: () => {
        const { impersonatedBy } = get();
        if (!impersonatedBy) return;
        set({ user: impersonatedBy, impersonatedBy: null });
      },
    }),
    {
      name: 'beyondforms-auth', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields — don't persist functions
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        impersonatedBy: state.impersonatedBy,
      }),
    }
  )
);
