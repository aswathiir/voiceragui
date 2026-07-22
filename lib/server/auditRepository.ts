import fs from "fs";
import path from "path";

// File-backed audit trail of admin/security-relevant actions — logins, org
// suspensions, plan changes. Same repository pattern as adminRepository.ts
// (anchored on globalThis, JSON file at .data/). Purely additive: nothing
// in the call/voice path writes here, so this cannot affect a live call.
export interface AuditEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: "super_admin" | "customer" | "system";
  action: string;
  targetOrgId?: string;
  details?: string;
}

const DB_PATH = path.join(process.cwd(), ".data", "audit-log.json");
const MAX_ENTRIES = 2000;

const globalForAudit = globalThis as unknown as { __auditLog?: AuditEntry[] };

function load(): AuditEntry[] {
  if (globalForAudit.__auditLog) return globalForAudit.__auditLog;

  if (fs.existsSync(DB_PATH)) {
    try {
      globalForAudit.__auditLog = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      return globalForAudit.__auditLog!;
    } catch {
      // fall through to reseed on corrupt file
    }
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, "[]");
  globalForAudit.__auditLog = [];
  return globalForAudit.__auditLog;
}

function persist(entries: AuditEntry[]) {
  globalForAudit.__auditLog = entries;
  fs.writeFileSync(DB_PATH, JSON.stringify(entries, null, 2));
}

export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const entries = load();
  entries.unshift({
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  persist(entries);
}

export function getAuditLog(limit = 500): AuditEntry[] {
  return load().slice(0, limit);
}
