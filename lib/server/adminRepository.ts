import fs from "fs";
import path from "path";

// "Customer" = an Organization that subscribes to BeyondForms.
// Each Organization has N end-users ("callers") who call their AI phone line.
export type OrgPlan = "free" | "starter" | "growth" | "scale" | "enterprise";
export type OrgStatus = "active" | "trial" | "suspended";

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
  planCallsIncluded: number;
  status: OrgStatus;
  joinedAt: string;
  monthlyFee: number;
  callerDailyLimitSeconds: number;
}

export interface OrgUsage {
  orgId: string;
  month: string;
  totalCalls: number;
  totalMinutes: number;
  callsRemaining: number;
  minutesRemaining: number;
  estimatedInfraCost: number;
  revenue: number;
  activeCalls: number;
  uniqueCallers: number;
}

interface AdminDB {
  organizations: Organization[];
  usageByOrg: Record<string, OrgUsage>;
}

const DB_PATH = path.join(process.cwd(), ".data", "admin-db.json");

const now = new Date();
const CURRENT_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// First-run seed — identical to the previous hardcoded mock data in
// lib/stores/adminStore.ts, now the seed for the file-backed store instead
// of the permanent source of truth.
const SEED: AdminDB = {
  organizations: [
    { id: "cust_001", name: "Mythra Hospital, Calicut", plan: "growth", planCallsIncluded: 5000, status: "active", joinedAt: "2024-01-15", monthlyFee: 149400, callerDailyLimitSeconds: 180 },
    { id: "cust_002", name: "Apollo Clinics, Kochi", plan: "scale", planCallsIncluded: 10000, status: "active", joinedAt: "2024-02-01", monthlyFee: 262500, callerDailyLimitSeconds: 180 },
    { id: "cust_003", name: "City Care, Thrissur", plan: "starter", planCallsIncluded: 2500, status: "trial", joinedAt: "2024-06-01", monthlyFee: 74700, callerDailyLimitSeconds: 180 },
    { id: "cust_004", name: "Sunrise Hospital, Kozhikode", plan: "growth", planCallsIncluded: 5000, status: "suspended", joinedAt: "2023-11-20", monthlyFee: 149400, callerDailyLimitSeconds: 180 },
    { id: "cust_005", name: "Wellness Hub, Kochi", plan: "free", planCallsIncluded: 100, status: "active", joinedAt: "2024-06-20", monthlyFee: 0, callerDailyLimitSeconds: 180 },
  ],
  usageByOrg: {
    cust_001: { orgId: "cust_001", month: CURRENT_MONTH, totalCalls: 3842, totalMinutes: 7684, callsRemaining: 1158, minutesRemaining: 2316, estimatedInfraCost: 52712, revenue: 149400, activeCalls: 2, uniqueCallers: 284 },
    cust_002: { orgId: "cust_002", month: CURRENT_MONTH, totalCalls: 9640, totalMinutes: 19280, callsRemaining: 360, minutesRemaining: 720, estimatedInfraCost: 132259, revenue: 262500, activeCalls: 3, uniqueCallers: 812 },
    cust_003: { orgId: "cust_003", month: CURRENT_MONTH, totalCalls: 312, totalMinutes: 624, callsRemaining: 2188, minutesRemaining: 4376, estimatedInfraCost: 4281, revenue: 74700, activeCalls: 0, uniqueCallers: 47 },
    cust_004: { orgId: "cust_004", month: CURRENT_MONTH, totalCalls: 0, totalMinutes: 0, callsRemaining: 5000, minutesRemaining: 10000, estimatedInfraCost: 0, revenue: 0, activeCalls: 0, uniqueCallers: 0 },
    cust_005: { orgId: "cust_005", month: CURRENT_MONTH, totalCalls: 67, totalMinutes: 134, callsRemaining: 33, minutesRemaining: 66, estimatedInfraCost: 919, revenue: 0, activeCalls: 0, uniqueCallers: 31 },
  },
};

// Anchored on globalThis for the same reason as kbStatusStore/rateLimiter —
// Next.js bundles each route handler separately in dev, so a plain
// module-level cache would be duplicated per route. The actual durable
// state is the JSON file; this is just a read-through cache of it.
const globalForAdmin = globalThis as unknown as { __adminDB?: AdminDB };

function loadDB(): AdminDB {
  if (globalForAdmin.__adminDB) return globalForAdmin.__adminDB;

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      globalForAdmin.__adminDB = JSON.parse(raw) as AdminDB;
      return globalForAdmin.__adminDB;
    } catch {
      // Fall through to reseed if the file is corrupt.
    }
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));
  globalForAdmin.__adminDB = SEED;
  return SEED;
}

function persist(db: AdminDB) {
  globalForAdmin.__adminDB = db;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Public repository API — the seam to swap for a real DB client later ────

export function getOrganizations(): Organization[] {
  return loadDB().organizations;
}

export function getUsage(): Record<string, OrgUsage> {
  return loadDB().usageByOrg;
}

export function updateOrganization(
  id: string,
  patch: Partial<Pick<Organization, "status" | "plan" | "planCallsIncluded" | "monthlyFee">>,
): Organization | null {
  const db = loadDB();
  const idx = db.organizations.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  const updated = { ...db.organizations[idx], ...patch };
  const nextOrgs = [...db.organizations];
  nextOrgs[idx] = updated;
  persist({ ...db, organizations: nextOrgs });
  return updated;
}
