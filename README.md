# VoiceRAG — Voice-Powered Government Scheme Assistant

A **Next.js 14** web UI that lets citizens query Indian government welfare schemes by **voice or text**, powered by a live RAG (Retrieval-Augmented Generation) pipeline.

---

## What's Implemented

### 🏠 Landing Page (`/`)
- Animated hero with a cycling word ticker: *Welfare Schemes → Government Programs → Benefits & Grants → Policy Details → Eligibility Criteria*
- Wave background with floating log cards (ambient UI)
- Feature badges: Voice-first interface · Verified source data · Live pipeline monitoring
- Sign in / Get access navigation buttons

### 💬 Text Chat (`/dashboard/chat`)
- Full chat interface backed by the live RAG pipeline (`/api/query` → n8n webhook → Pinecone)
- Suggested prompts on empty state (women empowerment schemes, Beti Bachao Beti Padhao, etc.)
- Persistent chat history via `localStorage` with draft auto-save
- Animated message bubbles with timestamps (IST)
- Loading state with spinner while the assistant is thinking
- Clear Chat button, Enter to send, Shift+Enter for newline

### 📞 Live Call (`/dashboard/call`)
- **VAPI voice assistant** integration (`@vapi-ai/web`)
- Animated voice orb with pulse rings during active call
- Real-time call state machine: `idle → connecting → listening → processing → speaking → ended`
- Live transcript panel shown alongside the orb
- Mute / unmute toggle during call
- Call duration timer (hh:mm:ss)
- On call end, the session is saved to the call history store
- Fallback inline VAPI config (Groq Llama 3.3 70B + Pinecone RAG) when no assistant ID is set

### 📋 Call History (`/dashboard/history`)
- List of past call records saved by `lib/store.ts`
- Displays duration, summary, and per-message transcript

### 📊 Execution Logs (`/dashboard/logs`)
- n8n workflow execution log viewer
- Summary stat cards: Successful · Warnings · Errors
- Search by message or node name
- Filter dropdown by log level (success / info / warning / error)
- Expandable row detail: node, status code, duration, ISO timestamp, full message

### ⚙️ Settings (`/dashboard/settings`)
- Configure VAPI public key & assistant ID
- n8n webhook URL
- Pinecone API key & index name
- Password-masked inputs with show/hide toggle
- `.env.local` template rendered inline for easy copy-paste

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Voice | VAPI AI Web SDK (`@vapi-ai/web`) |
| RAG backend | n8n workflow → Pinecone vector store |
| LLM | Groq Llama 3.3 70B |
| Speech | Azure Neural TTS (`en-US-AriaNeural`) |
| Icons | Lucide React |
| UI primitives | Radix UI |

---

## Project Structure

```
app/
├── page.tsx                  # Landing page
├── layout.tsx                # Root layout (ThemeProvider + OnboardingDialog)
├── globals.css               # Design tokens, glass-panel, animations
├── dashboard/
│   ├── layout.tsx            # Sidebar shell
│   ├── chat/page.tsx         # Text chat
│   ├── call/page.tsx         # Voice call (VAPI)
│   ├── history/page.tsx      # Call history
│   ├── logs/page.tsx         # n8n execution logs
│   └── settings/page.tsx     # API key configuration
├── api/
│   ├── query/                # Next.js proxy → n8n webhook (bypasses CORS)
│   └── vapi-chat/            # VAPI tool-call handler
components/ui/
├── sidebar.tsx               # Dashboard sidebar navigation
├── voice-orb.tsx             # Animated orb that reacts to call state
├── ambient.tsx               # WaveBackground + FloatingLogCards
├── onboarding.tsx            # First-run setup dialog
├── motion-button.tsx         # Animated CTA button
├── button.tsx                # Base button component
├── dialog.tsx                # Modal dialog
├── docks.tsx                 # Mobile dock navigation
├── modern-mobile-menu.tsx    # Mobile menu overlay
└── primitives.tsx            # Input, Textarea, Badge
lib/
├── vapi.ts                   # VAPI singleton + CallState type
├── store.ts                  # Call record persistence
├── theme.tsx                 # Dark/light ThemeProvider
└── utils.ts                  # formatDuration, cn()
```

---

## Getting Started

### 1. Clone & install
```bash
npm install
```

### 2. Configure environment
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://xxxx.ngrok-free.app/webhook/voice-rag-query
PINECONE_API_KEY=pcsk_xxx
PINECONE_INDEX=vad
```

### 3. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Login Credentials

All accounts use the password **`password`**.

| Role | Email | Plan | Dashboard |
|------|-------|------|-----------|
| **Super Admin** | `admin@beyondforms.in` | — | `/admin/overview` |
| Organization | `mythra@hospital.in` | Growth | `/dashboard/home` |
| Organization | `apollo@clinics.in` | Scale | `/dashboard/home` |
| Organization | `citycare@thrissur.in` | Starter | `/dashboard/home` |
| Organization | `demo@beyondforms.in` | Free | `/dashboard/home` |

> **Super Admin** has platform-wide oversight — organization management, live call monitoring, plan limits, and suspend/reactivate controls.
>
> **Organizations** can configure their AI voice agent, upload knowledge base files, manage callers (VIP/block), and view billing.

---

## Architecture Overview

```
Browser
  │
  ├── Text Chat  →  /api/query  →  n8n webhook  →  AI Agent  →  Pinecone RAG
  │
  └── Voice Call →  VAPI SDK  (WebRTC)
                       │
                       └── voice_rag_query tool  →  /api/query  →  n8n  →  Pinecone
```

The `/api/query` Next.js route acts as a **server-side proxy** — it keeps the n8n webhook URL out of the browser and handles the VAPI tool-call response format (`toolCallId` matching).

---

## Key Design Decisions

- **CORS bypass**: All n8n calls go through `/api/query` so the ngrok URL is never exposed client-side.
- **Hydration-safe chat**: `localStorage` is only read after the first client render to avoid SSR mismatches.
- **VAPI fallback config**: If `NEXT_PUBLIC_VAPI_ASSISTANT_ID` is empty, the call page inlines a full assistant config so the app is runnable without a pre-built VAPI assistant.
- **Call state machine**: Seven explicit states (`idle`, `connecting`, `listening`, `processing`, `speaking`, `ended`, `error`) drive both the orb animation and the status label, keeping UI and logic in sync.
