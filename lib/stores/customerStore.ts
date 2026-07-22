import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type FileType = 'mysql_dump' | 'csv' | 'json' | 'pdf' | 'docx' | 'url';
export type KBStatus = 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'indexed' | 'failed';

export interface KnowledgeBaseItem {
  id: string;
  fileName: string;
  fileType: FileType;
  uploadedAt: string;
  status: KBStatus;
  progress: number; // 0–100
  chunkCount: number | null;
  vectorCount: number | null;
  errorMessage: string | null;
}

export interface VoiceConfig {
  sttModel: 'deepgram_nova2' | 'deepgram_nova3';
  language: 'en' | 'ml' | 'ar' | 'en_ml';
  llmPersonality: string;
  llmTemperature: number;
  maxResponseWords: number;
  ttsVoice: 'aria_en' | 'aria_hi' | 'zariyah_ar' | 'ravi_en';
  ttsSpeed: number;
  fallbackAfterSeconds: number;
  fallbackNumber: string;
  callerDailyLimitSeconds: number;
  greetingMessage: string;
}

interface CustomerStore {
  knowledgeBase: KnowledgeBaseItem[];
  uploadQueue: string[];
  voiceConfig: VoiceConfig;
  isDirty: boolean;
  loadKBList: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploadURL: (url: string) => Promise<void>;
  deleteKBItem: (id: string) => void;
  retryKBItem: (id: string) => Promise<void>;
  updateVoiceConfig: (partial: Partial<VoiceConfig>) => void;
  saveVoiceConfig: () => Promise<void>;
}

// ─── Default voice config ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: VoiceConfig = {
  sttModel: 'deepgram_nova2',
  language: 'en',
  llmPersonality:
    'You are a helpful hospital assistant for Mythra Hospital, Calicut. Answer in a friendly, professional tone.',
  llmTemperature: 0.3,
  maxResponseWords: 60,
  ttsVoice: 'aria_en',
  ttsSpeed: 1.0,
  fallbackAfterSeconds: 8,
  fallbackNumber: '+910495271234',
  callerDailyLimitSeconds: 180,
  greetingMessage: 'Hello! Thank you for calling Mythra Hospital. How can I help you today?',
};

// ─── File type detector ───────────────────────────────────────────────────────

function detectFileType(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'sql') return 'mysql_dump';
  if (ext === 'csv') return 'csv';
  if (ext === 'json') return 'json';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  return 'pdf';
}

// ─── Real-time pipeline status (SSE from /api/kb/stream) ─────────────────────
// One EventSource per orgId, shared across all in-flight uploads for that org.
// Each pushed record carries a fileId matching the KnowledgeBaseItem.id so we
// can patch the right row as n8n reports progress through the 5 stages.

interface KBStatusRecord {
  fileId: string;
  stage: KBStatus;
  progress: number;
  chunkCount: number | null;
  vectorCount: number | null;
  errorMessage: string | null;
}

let activeStreamOrgId: string | null = null;
let activeStream: EventSource | null = null;

// SSE events can beat the optimistic item insert (the server may mark an
// upload failed within milliseconds — e.g. when the n8n webhook is missing —
// before uploadFile() has added the row to state). Keep the latest record per
// fileId so the insert path can apply it immediately after adding the row.
const latestRecords = new Map<string, KBStatusRecord>();

function applyRecord(record: KBStatusRecord) {
  return (s: CustomerStore): Partial<CustomerStore> => ({
    knowledgeBase: s.knowledgeBase.map((k) =>
      k.id === record.fileId
        ? {
            ...k,
            status: record.stage,
            progress: record.progress,
            chunkCount: record.chunkCount,
            vectorCount: record.vectorCount,
            errorMessage: record.errorMessage,
          }
        : k,
    ),
    uploadQueue:
      record.stage === 'indexed' || record.stage === 'failed'
        ? s.uploadQueue.filter((q) => q !== record.fileId)
        : s.uploadQueue,
  });
}

function ensureStatusStream(
  orgId: string,
  set: (fn: (s: CustomerStore) => Partial<CustomerStore>) => void,
) {
  if (typeof window === 'undefined' || activeStreamOrgId === orgId) return;

  activeStream?.close();
  activeStream = new EventSource(`/api/kb/stream?orgId=${encodeURIComponent(orgId)}`);
  activeStreamOrgId = orgId;

  activeStream.onmessage = (evt) => {
    const record: KBStatusRecord = JSON.parse(evt.data);
    latestRecords.set(record.fileId, record);
    set(applyRecord(record));
  };
}

/** Apply any status update that raced ahead of the optimistic item insert. */
function flushPendingRecord(
  fileId: string,
  set: (fn: (s: CustomerStore) => Partial<CustomerStore>) => void,
) {
  const record = latestRecords.get(fileId);
  if (record) set(applyRecord(record));
}

async function ingest(
  payload: { file?: File; url?: string },
  set: (fn: (s: CustomerStore) => Partial<CustomerStore>) => void,
): Promise<string> {
  const orgId = useAuthStore.getState().user?.customerId ?? 'unknown_org';
  ensureStatusStream(orgId, set);

  const form = new FormData();
  form.set('orgId', orgId);
  if (payload.file) form.set('file', payload.file);
  if (payload.url) form.set('url', payload.url);

  const res = await fetch('/api/kb/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error ?? 'Upload failed');
  }
  const { fileId } = await res.json();
  return fileId;
}

// ─── Store ───────────────────────────────────────────────────────────────────

// Remembers the original File/URL behind each KB item id so "Retry" can
// re-submit the same source to /api/kb/upload.
const pendingSources = new Map<string, { file?: File; url?: string }>();

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  knowledgeBase: [],
  uploadQueue: [],
  voiceConfig: DEFAULT_CONFIG,
  isDirty: false,

  // Loads the org's indexed documents from the durable server registry.
  // Called on org-switch and on the Knowledge page mount (covers the
  // already-logged-in case where no auth change fires).
  loadKBList: async () => {
    const res = await fetch('/api/kb/list');
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.files) return;
    const items: KnowledgeBaseItem[] = data.files.map(
      (f: {
        fileId: string; fileName: string; uploadedAt: string; status: KBStatus;
        chunkCount: number | null; vectorCount: number | null; errorMessage: string | null;
      }) => ({
        id: f.fileId,
        fileName: f.fileName,
        fileType: detectFileType(f.fileName),
        uploadedAt: f.uploadedAt,
        status: f.status,
        progress: f.status === 'indexed' ? 100 : f.status === 'failed' ? 0 : 50,
        chunkCount: f.chunkCount,
        vectorCount: f.vectorCount,
        errorMessage: f.errorMessage,
      }),
    );
    set({
      knowledgeBase: items,
      uploadQueue: items.filter((i) => i.status !== 'indexed' && i.status !== 'failed').map((i) => i.id),
    });
  },

  uploadFile: async (file: File) => {
    const fileId = await ingest({ file }, set);
    pendingSources.set(fileId, { file });

    const item: KnowledgeBaseItem = {
      id: fileId,
      fileName: file.name,
      fileType: detectFileType(file.name),
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      chunkCount: null,
      vectorCount: null,
      errorMessage: null,
    };

    set((s) => ({
      knowledgeBase: [...s.knowledgeBase, item],
      uploadQueue: [...s.uploadQueue, fileId],
    }));
    flushPendingRecord(fileId, set);
  },

  uploadURL: async (url: string) => {
    const fileId = await ingest({ url }, set);
    pendingSources.set(fileId, { url });

    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url.slice(0, 40);
      }
    })();

    const item: KnowledgeBaseItem = {
      id: fileId,
      fileName: hostname,
      fileType: 'url',
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      chunkCount: null,
      vectorCount: null,
      errorMessage: null,
    };

    set((s) => ({
      knowledgeBase: [...s.knowledgeBase, item],
      uploadQueue: [...s.uploadQueue, fileId],
    }));
    flushPendingRecord(fileId, set);
  },

  deleteKBItem: (id) => {
    pendingSources.delete(id);
    set((s) => ({
      knowledgeBase: s.knowledgeBase.filter((k) => k.id !== id),
      uploadQueue: s.uploadQueue.filter((q) => q !== id),
    }));
    // Also remove the file's vectors from the org's Pinecone namespace so
    // deleted knowledge actually stops appearing in AI answers.
    fetch('/api/kb/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: id }),
    }).catch(() => {});
  },

  retryKBItem: async (id) => {
    const source = pendingSources.get(id);
    if (!source) return;

    const newFileId = await ingest(source, set);
    pendingSources.delete(id);
    pendingSources.set(newFileId, source);

    set((s) => ({
      knowledgeBase: s.knowledgeBase.map((k) =>
        k.id === id
          ? {
              ...k,
              id: newFileId,
              status: 'uploading',
              progress: 0,
              errorMessage: null,
              chunkCount: null,
              vectorCount: null,
            }
          : k,
      ),
      uploadQueue: [...s.uploadQueue.filter((q) => q !== id), newFileId],
    }));
    flushPendingRecord(newFileId, set);
  },

  updateVoiceConfig: (partial) => {
    set((s) => ({
      voiceConfig: { ...s.voiceConfig, ...partial },
      isDirty: true,
    }));
  },

  saveVoiceConfig: async () => {
    const res = await fetch('/api/org/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: get().voiceConfig }),
    });
    if (res.ok) {
      const { config } = await res.json();
      set({ voiceConfig: config, isDirty: false });
    }
  },
}));

// ─── Org-switch hygiene ───────────────────────────────────────────────────────
// Reset org-scoped client state whenever the signed-in org changes (login,
// logout, impersonation) so one org's KB list and live upload stream never
// bleed into another org's UI within the same browser session. Also loads the
// org's persisted voice config from the server.
let lastOrgId: string | null | undefined;
useAuthStore.subscribe((state) => {
  const orgId = state.user?.customerId ?? null;
  if (orgId === lastOrgId) return;
  lastOrgId = orgId;

  activeStream?.close();
  activeStream = null;
  activeStreamOrgId = null;
  latestRecords.clear();
  pendingSources.clear();
  useCustomerStore.setState({
    knowledgeBase: [],
    uploadQueue: [],
    voiceConfig: DEFAULT_CONFIG,
    isDirty: false,
  });

  if (orgId) {
    fetch('/api/org/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) useCustomerStore.setState({ voiceConfig: data.config, isDirty: false });
      })
      .catch(() => {});

    useCustomerStore.getState().loadKBList();
  }
});
