import fs from "fs";
import path from "path";

// File-backed registry of every uploaded knowledge-base document, per org.
// The n8n pipeline callbacks update each record's stage and counts, so the
// dashboard's "Indexed" list reflects server truth (not client memory) and
// survives refreshes and restarts. Same pattern as the other repositories.

export type KBFileStatus = "uploading" | "parsing" | "chunking" | "embedding" | "indexed" | "failed";

export interface KBFileRecord {
  fileId: string;
  orgId: string;
  fileName: string;
  uploadedAt: string;
  status: KBFileStatus;
  chunkCount: number | null;
  vectorCount: number | null;
  errorMessage: string | null;
}

interface KBDB {
  files: KBFileRecord[];
}

const DB_PATH = path.join(process.cwd(), ".data", "kb-db.json");

const globalForKBRepo = globalThis as unknown as { __kbDB?: KBDB };

function loadDB(): KBDB {
  if (globalForKBRepo.__kbDB) return globalForKBRepo.__kbDB;
  if (fs.existsSync(DB_PATH)) {
    try {
      globalForKBRepo.__kbDB = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as KBDB;
      return globalForKBRepo.__kbDB!;
    } catch {
      // reseed on corrupt file
    }
  }
  globalForKBRepo.__kbDB = { files: [] };
  return globalForKBRepo.__kbDB;
}

function persist(db: KBDB) {
  globalForKBRepo.__kbDB = db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function listKBFiles(orgId: string): KBFileRecord[] {
  return loadDB().files.filter((f) => f.orgId === orgId);
}

export function createKBFile(input: { fileId: string; orgId: string; fileName: string }): KBFileRecord {
  const db = loadDB();
  const record: KBFileRecord = {
    ...input,
    uploadedAt: new Date().toISOString(),
    status: "uploading",
    chunkCount: null,
    vectorCount: null,
    errorMessage: null,
  };
  persist({ files: [...db.files, record] });
  return record;
}

export function updateKBFile(
  fileId: string,
  patch: Partial<Pick<KBFileRecord, "status" | "chunkCount" | "vectorCount" | "errorMessage">>,
): KBFileRecord | null {
  const db = loadDB();
  const idx = db.files.findIndex((f) => f.fileId === fileId);
  if (idx === -1) return null;
  const updated = { ...db.files[idx], ...patch };
  const next = [...db.files];
  next[idx] = updated;
  persist({ files: next });
  return updated;
}

export function deleteKBFile(fileId: string): boolean {
  const db = loadDB();
  const next = db.files.filter((f) => f.fileId !== fileId);
  if (next.length === db.files.length) return false;
  persist({ files: next });
  return true;
}
