import fs from "fs";
import path from "path";

// Per-org voice-assistant configuration, file-backed like the other repos.

export interface VoiceConfig {
  sttModel: "deepgram_nova2" | "deepgram_nova3";
  language: "en" | "ml" | "ar" | "en_ml";
  llmPersonality: string;
  llmTemperature: number;
  maxResponseWords: number;
  ttsVoice: "aria_en" | "aria_hi" | "zariyah_ar" | "ravi_en";
  ttsSpeed: number;
  fallbackAfterSeconds: number;
  fallbackNumber: string;
  callerDailyLimitSeconds: number;
  greetingMessage: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  sttModel: "deepgram_nova2",
  language: "en",
  llmPersonality:
    "You are a helpful assistant for this organization. Answer in a friendly, professional tone.",
  llmTemperature: 0.3,
  maxResponseWords: 60,
  ttsVoice: "aria_en",
  ttsSpeed: 1.0,
  fallbackAfterSeconds: 8,
  fallbackNumber: "",
  callerDailyLimitSeconds: 180,
  greetingMessage: "Hello! Thank you for calling. How can I help you today?",
};

const DB_PATH = path.join(process.cwd(), ".data", "voice-config.json");

const globalForConfig = globalThis as unknown as {
  __voiceConfigDB?: Record<string, VoiceConfig>;
};

function loadDB(): Record<string, VoiceConfig> {
  if (globalForConfig.__voiceConfigDB) return globalForConfig.__voiceConfigDB;
  if (fs.existsSync(DB_PATH)) {
    try {
      globalForConfig.__voiceConfigDB = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      return globalForConfig.__voiceConfigDB!;
    } catch {
      // reseed on corrupt file
    }
  }
  globalForConfig.__voiceConfigDB = {};
  return globalForConfig.__voiceConfigDB;
}

export function getVoiceConfig(orgId: string): VoiceConfig {
  return { ...DEFAULT_VOICE_CONFIG, ...loadDB()[orgId] };
}

export function saveVoiceConfig(orgId: string, config: Partial<VoiceConfig>): VoiceConfig {
  const db = loadDB();
  const merged = { ...DEFAULT_VOICE_CONFIG, ...db[orgId], ...config };
  db[orgId] = merged;
  globalForConfig.__voiceConfigDB = db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  return merged;
}
