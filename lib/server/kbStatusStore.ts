import { EventEmitter } from "events";

export type KBStage = "uploading" | "parsing" | "chunking" | "embedding" | "indexed" | "failed";

export interface KBStatusRecord {
  fileId: string;
  orgId: string;
  fileName: string;
  stage: KBStage;
  progress: number; // 0-100
  chunkCount: number | null;
  vectorCount: number | null;
  errorMessage: string | null;
  updatedAt: string;
}

// In-memory only — fine for a single Next.js server instance / local dev.
// Swap to Redis (key per fileId + a pub/sub channel per orgId) for a
// multi-instance production deployment; the get/set/subscribe interface
// below is the seam to swap behind.
//
// Anchored on globalThis: Next.js bundles each API route handler into its
// own module graph, so a plain module-level singleton ends up duplicated
// per route (the upload route and the webhook callback route would each
// see an empty Map). globalThis is the one thing actually shared across
// route bundles within a single server process.
const globalForKB = globalThis as unknown as {
  __kbRecords?: Map<string, KBStatusRecord>;
  __kbEmitter?: EventEmitter;
  __kbWatchdogs?: Map<string, ReturnType<typeof setTimeout>>;
};

const records = globalForKB.__kbRecords ?? new Map<string, KBStatusRecord>();
const emitter = globalForKB.__kbEmitter ?? new EventEmitter();
const watchdogs = globalForKB.__kbWatchdogs ?? new Map<string, ReturnType<typeof setTimeout>>();
globalForKB.__kbRecords = records;
globalForKB.__kbEmitter = emitter;
globalForKB.__kbWatchdogs = watchdogs;
emitter.setMaxListeners(0);

// If n8n accepts a file but never posts a progress callback (workflow paused,
// crashed mid-run, wrong callbackUrl), the record would sit in a non-terminal
// stage forever and the dashboard would show "processing" indefinitely. The
// watchdog re-arms on every update and fails the record after 3 idle minutes.
const WATCHDOG_MS = 3 * 60_000;

function armWatchdog(fileId: string) {
  const existing = watchdogs.get(fileId);
  if (existing) clearTimeout(existing);

  const record = records.get(fileId);
  if (!record || record.stage === "indexed" || record.stage === "failed") {
    watchdogs.delete(fileId);
    return;
  }

  const timer = setTimeout(() => {
    watchdogs.delete(fileId);
    const current = records.get(fileId);
    if (current && current.stage !== "indexed" && current.stage !== "failed") {
      updateKBStatus(fileId, {
        stage: "failed",
        errorMessage:
          "No progress from the ingestion pipeline for 3 minutes. " +
          "Check that the n8n kb-ingest workflow is active and posting callbacks.",
      });
    }
  }, WATCHDOG_MS);
  // Don't hold the process open just for a watchdog timer.
  timer.unref?.();
  watchdogs.set(fileId, timer);
}

function channelFor(orgId: string) {
  return `org:${orgId}`;
}

export function createKBStatus(input: {
  fileId: string;
  orgId: string;
  fileName: string;
}): KBStatusRecord {
  const record: KBStatusRecord = {
    fileId: input.fileId,
    orgId: input.orgId,
    fileName: input.fileName,
    stage: "uploading",
    progress: 0,
    chunkCount: null,
    vectorCount: null,
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  };
  records.set(input.fileId, record);
  emitter.emit(channelFor(input.orgId), record);
  armWatchdog(input.fileId);
  return record;
}

export function updateKBStatus(
  fileId: string,
  patch: Partial<Pick<KBStatusRecord, "stage" | "progress" | "chunkCount" | "vectorCount" | "errorMessage">>,
): KBStatusRecord | null {
  const existing = records.get(fileId);
  if (!existing) return null;
  const updated: KBStatusRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  records.set(fileId, updated);
  emitter.emit(channelFor(updated.orgId), updated);
  armWatchdog(fileId);
  return updated;
}

export function getKBStatus(fileId: string): KBStatusRecord | undefined {
  return records.get(fileId);
}

/** Current records for an org — replayed to SSE clients on connect so a
 *  subscriber that arrives after a status change (e.g. an instant failure
 *  when the n8n webhook is missing) still sees the latest state. */
export function getOrgRecords(orgId: string): KBStatusRecord[] {
  return Array.from(records.values()).filter((r) => r.orgId === orgId);
}

export function subscribeToOrg(orgId: string, onUpdate: (record: KBStatusRecord) => void): () => void {
  const channel = channelFor(orgId);
  emitter.on(channel, onUpdate);
  return () => emitter.off(channel, onUpdate);
}
