"use client";

export interface CallRecord {
  id: string;
  timestamp: string;
  duration: number; // seconds
  messages: { role: "user" | "assistant"; text: string }[];
  summary: string;
  topics: string[];
}

const STORAGE_KEY = "voice_rag_call_history";

export function getCallHistory(): CallRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : MOCK_CALL_HISTORY;
  } catch {
    return MOCK_CALL_HISTORY;
  }
}

export function saveCallRecord(record: Omit<CallRecord, "id" | "timestamp">): CallRecord {
  const full: CallRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const history = getCallHistory();
  const updated = [full, ...history].slice(0, 50); // keep last 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return full;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Mock data for UI demonstration
export const MOCK_CALL_HISTORY: CallRecord[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    duration: 142,
    messages: [
      { role: "user", text: "What schemes are available for women empowerment?" },
      {
        role: "assistant",
        text: "Several schemes exist including Beti Bachao Beti Padhao, Mahila Samridhi Yojana, and One-Stop Centres.",
      },
      { role: "user", text: "Tell me about Nandini Sahakar" },
      {
        role: "assistant",
        text: "Nandini Sahakar aims to improve socio-economic status of women through cooperatives, offering 2% interest subvention on term loans.",
      },
    ],
    summary:
      "Discussed women empowerment schemes including Beti Bachao, Nandini Sahakar, and Mahila Samridhi Yojana eligibility.",
    topics: ["Beti Bachao", "Nandini Sahakar", "Mahila Samridhi Yojana"],
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    duration: 89,
    messages: [
      { role: "user", text: "How do I apply for Mahila Samridhi Yojana?" },
      {
        role: "assistant",
        text: "MSY provides micro-finance to women entrepreneurs from backward backgrounds. Apply through NBCFDC channels.",
      },
    ],
    summary:
      "Queried MSY application process and eligibility criteria for backward class women entrepreneurs.",
    topics: ["Mahila Samridhi Yojana", "NBCFDC", "Micro-finance"],
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    duration: 210,
    messages: [
      { role: "user", text: "What is One Stop Centre?" },
      {
        role: "assistant",
        text: "One-Stop Centres provide integrated support services for women affected by violence - shelter, legal aid, psychological counselling.",
      },
      { role: "user", text: "Is it available in all states?" },
      {
        role: "assistant",
        text: "OSCs are being set up across states under Ministry of Women and Child Development.",
      },
    ],
    summary:
      "Detailed discussion on One-Stop Centres, services provided, and state-wise availability.",
    topics: ["One-Stop Centre", "MWCD", "Violence against women"],
  },
];
