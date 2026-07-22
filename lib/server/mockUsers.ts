import type { OrgPlan } from "./adminRepository";

export type UserRole = "super_admin" | "customer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId: string | null;
  plan: OrgPlan | null;
  planStartDate: string | null;
  planEndDate: string | null;
}

interface MockUser extends AuthUser {
  password: string;
}

// Server-side only — mirrors the previous client-side MOCK_USERS that used
// to live in lib/stores/authStore.ts. Still a plaintext mock per the
// explicit decision to keep mock login; the only change is that credential
// verification now happens server-side (in app/api/auth/login) instead of
// in the browser, so a session cookie can be issued after a real check.
export const MOCK_USERS: Record<string, MockUser> = {
  "demo@beyondforms.in": {
    id: "usr_demo_001",
    name: "Demo (Live Vapi)",
    email: "demo@beyondforms.in",
    password: "password",
    role: "customer",
    customerId: "vapi_live",
    plan: "growth",
    planStartDate: "2026-07-01",
    planEndDate: null,
  },
  "admin@beyondforms.in": {
    id: "usr_admin_001",
    name: "BeyondForms Admin",
    email: "admin@beyondforms.in",
    password: "password",
    role: "super_admin",
    customerId: null,
    plan: null,
    planStartDate: null,
    planEndDate: null,
  },
  "mythra@hospital.in": {
    id: "usr_cust_001",
    name: "Mythra Hospital, Calicut",
    email: "mythra@hospital.in",
    password: "password",
    role: "customer",
    customerId: "cust_001",
    plan: "growth",
    planStartDate: "2024-01-01",
    planEndDate: "2024-12-31",
  },
  "apollo@clinics.in": {
    id: "usr_cust_002",
    name: "Apollo Clinics, Kochi",
    email: "apollo@clinics.in",
    password: "password",
    role: "customer",
    customerId: "cust_002",
    plan: "scale",
    planStartDate: "2024-02-01",
    planEndDate: "2025-01-31",
  },
  "citycare@thrissur.in": {
    id: "usr_cust_003",
    name: "City Care, Thrissur",
    email: "citycare@thrissur.in",
    password: "password",
    role: "customer",
    customerId: "cust_003",
    plan: "starter",
    planStartDate: "2024-06-01",
    planEndDate: "2024-07-01",
  },
  "wellness@hub.in": {
    id: "usr_cust_005",
    name: "Wellness Hub, Kochi",
    email: "wellness@hub.in",
    password: "password",
    role: "customer",
    customerId: "cust_005",
    plan: "free",
    planStartDate: "2024-06-20",
    planEndDate: null,
  },
};
