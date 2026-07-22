import fs from "fs";
import path from "path";

// File-backed call log — same pattern as adminRepository: the JSON file is
// the durable state, globalThis is a read-through cache shared across route
// bundles. Swap for a real DB table later behind the same function seam.

export type CallStatus = "active" | "completed" | "dropped" | "limit_reached";
export type Sentiment = "positive" | "neutral" | "negative" | "frustrated";

export interface TranscriptLine {
  speaker: "caller" | "ai";
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
  language: "en" | "ml" | "ar";
  aiSummary?: string;
  aiIntent?: string;
  sentiment?: Sentiment;
}

export interface CallerDailyUsage {
  callerNumber: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  totalSecondsUsed: number;
  callCount: number;
  limitReached: boolean;
}

interface CallsDB {
  calls: CallRecord[];
}

const DB_PATH = path.join(process.cwd(), ".data", "calls-db.json");

// ── Seed transcripts (Mythra Hospital demo content) ──────────────────────────

const T: Record<string, TranscriptLine[]> = {
  opd: [
    { speaker: "ai", text: "Hello! Thank you for calling Mythra Hospital. How can I help you today?", timestampSeconds: 0 },
    { speaker: "caller", text: "Hi, what are the OPD timings for the cardiology department?", timestampSeconds: 5 },
    { speaker: "ai", text: "Cardiology OPD is open Monday to Saturday, 9 AM to 1 PM. Dr. Krishnan is available on Tuesdays and Thursdays. Shall I help you book an appointment?", timestampSeconds: 9 },
    { speaker: "caller", text: "Can I book for next Tuesday?", timestampSeconds: 22 },
    { speaker: "ai", text: "Certainly! Call 0495-2712345 or visit the front desk. Is there anything else?", timestampSeconds: 26 },
    { speaker: "caller", text: "No, thank you.", timestampSeconds: 40 },
  ],
  lab: [
    { speaker: "ai", text: "Welcome to Mythra Hospital helpline. How may I assist you?", timestampSeconds: 0 },
    { speaker: "caller", text: "What is the cost for a complete blood count test?", timestampSeconds: 4 },
    { speaker: "ai", text: "CBC is priced at ₹350. Results are available within 4 hours. Would you like to know about other tests?", timestampSeconds: 8 },
    { speaker: "caller", text: "What about fasting blood sugar?", timestampSeconds: 20 },
    { speaker: "ai", text: "Fasting blood glucose is ₹120. Please fast for 8 hours. Samples collected 7 AM–10 AM.", timestampSeconds: 24 },
    { speaker: "caller", text: "Okay, thank you.", timestampSeconds: 38 },
  ],
  ml: [
    { speaker: "ai", text: "നമസ്കാരം! മിഥ്ര ഹോസ്പിറ്റലിലേക്ക് വിളിച്ചതിന് നന്ദി. എങ്ങനെ സഹായിക്കാം?", timestampSeconds: 0 },
    { speaker: "caller", text: "ഡോക്ടർ ഷൈനിയെ കാണണമെന്നുണ്ട്. ഓർത്തോ ഡിപ്പാർട്ട്മെന്റ്.", timestampSeconds: 6 },
    { speaker: "ai", text: "ഡോ. ഷൈനി ദേവദാസ് തിങ്കൾ, ബുധൻ, വെള്ളി ദിവസങ്ങളിൽ രാവിലെ 10 മുതൽ 1 വരെ ലഭ്യമാണ്.", timestampSeconds: 10 },
    { speaker: "caller", text: "ശരി, നന്ദി.", timestampSeconds: 28 },
  ],
  gynec: [
    { speaker: "ai", text: "Hello, Mythra Hospital helpline. How can I help?", timestampSeconds: 0 },
    { speaker: "caller", text: "Is there a gynaecology department?", timestampSeconds: 4 },
    { speaker: "ai", text: "Yes! Our Women's Health Department is led by Dr. Reetha Nair, available Monday–Saturday 10 AM–4 PM.", timestampSeconds: 7 },
    { speaker: "caller", text: "Do I need an appointment or can I walk in?", timestampSeconds: 22 },
    { speaker: "ai", text: "Walk-ins are accepted but appointments reduce waiting time.", timestampSeconds: 26 },
  ],
  icu: [
    { speaker: "ai", text: "Good morning, Mythra Hospital. How can I assist you?", timestampSeconds: 0 },
    { speaker: "caller", text: "My father was admitted to ICU yesterday. How can I get updates?", timestampSeconds: 5 },
    { speaker: "ai", text: "ICU updates are provided by the duty doctor during rounds at 9 AM and 5 PM. Please visit the ICU waiting area on the 3rd floor.", timestampSeconds: 10 },
    { speaker: "caller", text: "Can I speak to the doctor directly?", timestampSeconds: 28 },
    { speaker: "ai", text: "Yes, during visiting hours 12 PM–1 PM. Please carry a valid ID.", timestampSeconds: 32 },
  ],
};

const CALLERS = {
  A: "+919876543210",
  B: "+919812345678",
  C: "+919823456789",
  D: "+919834567890",
  E: "+919845678901",
};

function cost(seconds: number): number {
  return parseFloat(((seconds / 60) * 6.86).toFixed(2));
}

function buildSeed(): CallRecord[] {
  const now = new Date();
  const ago = (days: number, hours: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };
  // [id, caller, daysAgo, hoursAgo, seconds, status, transcript, resolvedByAI, language]
  const rows: [string, string, number, number, number, CallStatus, string, boolean, CallRecord["language"]][] = [
    ["call_today_01", CALLERS.B, 0, 0, 45, "active", "", false, "en"],
    ["call_today_02", CALLERS.C, 0, 0, 30, "active", "", false, "ml"],
    ["call_today_03", CALLERS.A, 0, 2, 180, "limit_reached", "opd", true, "en"],
    ["call_today_04", CALLERS.D, 0, 3, 95, "completed", "lab", true, "en"],
    ["call_today_05", CALLERS.E, 0, 4, 72, "completed", "ml", true, "ml"],
    ["call_today_06", CALLERS.D, 0, 5, 18, "dropped", "", false, "en"],
    ["call_d1_01", CALLERS.A, 1, 1, 120, "completed", "opd", true, "en"],
    ["call_d1_02", CALLERS.B, 1, 2, 87, "completed", "lab", true, "en"],
    ["call_d1_03", CALLERS.C, 1, 3, 145, "completed", "ml", false, "ml"],
    ["call_d1_04", CALLERS.D, 1, 4, 60, "completed", "gynec", true, "en"],
    ["call_d1_05", CALLERS.E, 1, 5, 95, "completed", "icu", true, "en"],
    ["call_d2_01", CALLERS.A, 2, 1, 155, "completed", "lab", true, "en"],
    ["call_d2_02", CALLERS.B, 2, 2, 80, "completed", "ml", true, "ml"],
    ["call_d2_03", CALLERS.C, 2, 3, 110, "completed", "gynec", false, "en"],
    ["call_d2_04", CALLERS.E, 2, 4, 45, "completed", "opd", true, "ar"],
    ["call_d3_01", CALLERS.A, 3, 1, 180, "limit_reached", "icu", false, "en"],
    ["call_d3_02", CALLERS.B, 3, 2, 130, "completed", "opd", true, "en"],
    ["call_d3_03", CALLERS.D, 3, 3, 75, "completed", "ml", true, "ml"],
    ["call_d3_04", CALLERS.E, 3, 4, 100, "completed", "lab", true, "en"],
    ["call_d4_01", CALLERS.A, 4, 1, 90, "completed", "gynec", true, "en"],
    ["call_d4_02", CALLERS.B, 4, 2, 165, "completed", "icu", false, "en"],
    ["call_d4_03", CALLERS.C, 4, 3, 120, "completed", "opd", true, "ar"],
    ["call_d4_04", CALLERS.D, 4, 4, 55, "completed", "ml", true, "ml"],
    ["call_d5_01", CALLERS.C, 5, 1, 180, "limit_reached", "lab", false, "en"],
    ["call_d5_02", CALLERS.A, 5, 2, 70, "completed", "opd", true, "en"],
    ["call_d5_03", CALLERS.E, 5, 3, 140, "completed", "gynec", true, "en"],
    ["call_d5_04", CALLERS.D, 5, 4, 85, "completed", "ml", true, "ml"],
    ["call_d6_01", CALLERS.B, 6, 1, 105, "completed", "icu", true, "en"],
    ["call_d6_02", CALLERS.C, 6, 2, 150, "completed", "lab", false, "en"],
    ["call_d6_03", CALLERS.D, 6, 3, 65, "completed", "gynec", true, "en"],
  ];
  return rows.map(([id, caller, days, hours, seconds, status, tKey, resolved, language]) => {
    const startTime = ago(days, hours);
    return {
      id,
      customerId: "cust_001",
      callerNumber: caller,
      startTime,
      endTime:
        status === "active" ? null : new Date(new Date(startTime).getTime() + seconds * 1000).toISOString(),
      durationSeconds: seconds,
      status,
      costINR: cost(seconds),
      transcript: tKey ? T[tKey] : [],
      resolvedByAI: resolved,
      language,
    };
  });
}

const globalForCalls = globalThis as unknown as { __callsDB?: CallsDB };

function loadDB(): CallsDB {
  if (globalForCalls.__callsDB) return globalForCalls.__callsDB;

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      globalForCalls.__callsDB = JSON.parse(raw) as CallsDB;
      return globalForCalls.__callsDB;
    } catch {
      // fall through to reseed if corrupt
    }
  }

  const db: CallsDB = { calls: buildSeed() };
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  globalForCalls.__callsDB = db;
  return db;
}

function persist(db: CallsDB) {
  globalForCalls.__callsDB = db;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Public repository API ────────────────────────────────────────────────────

export function getCalls(orgId?: string): CallRecord[] {
  const { calls } = loadDB();
  return orgId ? calls.filter((c) => c.customerId === orgId) : calls;
}

export function addCall(
  input: Omit<CallRecord, "id" | "costINR"> & { id?: string },
): CallRecord {
  const db = loadDB();
  const record: CallRecord = {
    ...input,
    id: input.id ?? `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    costINR: cost(input.durationSeconds),
  };
  persist({ calls: [...db.calls, record] });
  return record;
}

export function updateCall(
  id: string,
  patch: Partial<Pick<CallRecord, "aiSummary" | "aiIntent" | "sentiment" | "status" | "endTime" | "durationSeconds" | "transcript" | "resolvedByAI">>,
): CallRecord | null {
  const db = loadDB();
  const idx = db.calls.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...db.calls[idx], ...patch };
  const next = [...db.calls];
  next[idx] = updated;
  persist({ calls: next });
  return updated;
}

/** Per-caller per-day usage, derived from the call log (single source of truth). */
export function getCallerDailyUsage(orgId?: string): Record<string, CallerDailyUsage> {
  const usage: Record<string, CallerDailyUsage> = {};
  for (const c of getCalls(orgId)) {
    const date = c.startTime.slice(0, 10);
    const key = `${c.callerNumber}_${c.customerId}_${date}`;
    const entry =
      usage[key] ??
      { callerNumber: c.callerNumber, customerId: c.customerId, date, totalSecondsUsed: 0, callCount: 0, limitReached: false };
    entry.totalSecondsUsed = Math.min(entry.totalSecondsUsed + c.durationSeconds, 180);
    entry.callCount += 1;
    if (entry.totalSecondsUsed >= 180 || c.status === "limit_reached") entry.limitReached = true;
    usage[key] = entry;
  }
  return usage;
}
