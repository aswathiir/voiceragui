<div align="center">

# 🎙️ VoiceRAG UI

**Voice-powered AI assistant for querying government welfare schemes and knowledge bases.**  
Built with Next.js 14, Vapi, Pinecone, Groq, and n8n.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vapi AI](https://img.shields.io/badge/Vapi_AI-voice-6c47ff)](https://vapi.ai)
[![Pinecone](https://img.shields.io/badge/Pinecone-vector_DB-00b16a)](https://pinecone.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [n8n Workflows](#n8n-workflows)
- [Key Design Decisions](#key-design-decisions)

---

## Overview

VoiceRAG UI is a **multi-tenant SaaS platform** that enables organisations to deploy AI voice agents backed by their own knowledge base. Citizens and end-users can ask questions by **voice or text** and receive answers sourced directly from verified, organisation-specific documents — all in real time.

The platform ships with:
- A full **dashboard** for organisation admins (knowledge base upload, call monitoring, analytics)
- A **super-admin panel** for platform-level oversight (plan limits, org management, billing)
- A **patient / public portal** for end-user voice interactions

---

## Features

### 🏠 Landing Page
- Animated hero with a cycling word ticker *(Welfare Schemes → Government Programs → Eligibility Criteria …)*
- Wave background with floating ambient log cards
- Feature highlights: Voice-first · Verified data · Live pipeline monitoring

### 💬 Text Chat  `/dashboard/chat`
- Full chat UI backed by the live RAG pipeline (`/api/query` → n8n → Pinecone)
- Suggested prompts on empty state
- Persistent chat history via `localStorage` with draft auto-save
- Animated message bubbles with IST timestamps
- Enter to send, Shift+Enter for newline, Clear Chat

### 📞 Live Voice Call  `/dashboard/call`
- **Vapi AI** WebRTC integration (`@vapi-ai/web`)
- Animated voice orb with pulse rings that react to call state
- Real-time call state machine: `idle → connecting → listening → processing → speaking → ended`
- Live transcript panel, mute/unmute toggle, call duration timer
- Sessions auto-saved to call history on end
- Fallback inline Vapi config (Groq Llama 3.3 70B + Pinecone RAG) when no assistant ID is configured

### 📋 Call History  `/dashboard/history`
- Per-session records: duration, AI summary, full transcript

### 📊 Execution Logs  `/dashboard/logs`
- n8n workflow execution log viewer
- Stat cards: Successful · Warnings · Errors
- Search by message/node name; filter by log level
- Expandable row: node, status code, duration, full message

### 🧠 Knowledge Base  `/dashboard/knowledge`
- Upload files (PDF, DOCX, TXT) or provide URLs
- 5-stage ingestion pipeline: **Uploading → Parsing → Chunking → Embedding → Indexed**
- Real-time progress via Server-Sent Events
- Per-org Pinecone namespaces (multi-tenant isolation)

### 📈 Analytics  `/dashboard/analytics`
- Call volume, sentiment trends, and top-questions clustering (Groq-powered)

### ⚙️ Settings  `/dashboard/settings`
- Configure Vapi keys, n8n webhook URL, Pinecone credentials
- Password-masked inputs with show/hide toggle

### 🛡️ Admin Panel  `/admin`
| Page | Description |
|------|-------------|
| `/admin/overview` | Platform revenue, active orgs, call volume |
| `/admin/customers` | Organization list, plan assignment, suspend/reactivate |
| `/admin/limits` | Per-plan rate limits and quotas |
| `/admin/calls` | Live call monitoring across all orgs |
| `/admin/audit` | Full audit log of platform actions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + Framer Motion |
| Voice | Vapi AI Web SDK (`@vapi-ai/web`) |
| Vector DB | Pinecone (multi-tenant namespaces) |
| RAG Orchestration | n8n workflow automation |
| LLM | Groq — Llama 3.3 70B |
| Speech (TTS) | Azure Neural TTS (`en-US-AriaNeural`) |
| State Management | Zustand |
| UI Primitives | Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| 3D / WebGL | Three.js + OGL |

---

## Architecture

```
Browser
  │
  ├─ Text Chat ──────► /api/query (Next.js proxy)
  │                         │
  │                         └──► n8n Webhook ──► Pinecone RAG ──► Groq LLM
  │
  ├─ Voice Call ─────► Vapi SDK (WebRTC)
  │                         │
  │                         └── voice_rag_query tool ──► /api/query ──► n8n ──► Pinecone
  │
  └─ KB Ingestion ───► /api/kb/upload ──► n8n KB Webhook
                              │
                              └── 5-stage pipeline: parse → chunk → embed → index
                                  Progress streamed back via /api/kb/stream (SSE)
```

> **Why a server-side proxy?**  
> `/api/query` keeps the n8n webhook URL and Pinecone keys out of the browser, handles CORS, and normalises the Vapi tool-call response format (`toolCallId` matching).

---

## Project Structure

```
voice-rag-ui/
├── app/
│   ├── page.tsx                      # Landing page
│   ├── layout.tsx                    # Root layout (ThemeProvider)
│   ├── globals.css                   # Design tokens, glass-panel, animations
│   ├── login/                        # Auth page
│   ├── dashboard/                    # Organisation dashboard
│   │   ├── layout.tsx                # Sidebar shell
│   │   ├── home/                     # Dashboard home
│   │   ├── call/                     # Live voice call (Vapi)
│   │   ├── chat/                     # Text chat (RAG)
│   │   ├── knowledge/                # KB file upload & status
│   │   ├── analytics/                # Call analytics
│   │   ├── history/                  # Call history
│   │   ├── logs/                     # n8n execution logs
│   │   ├── usage/                    # API usage stats
│   │   ├── billing/                  # Billing & plan
│   │   ├── settings/                 # API key config
│   │   └── configure/                # Agent configuration
│   ├── admin/                        # Super-admin panel
│   │   ├── overview/
│   │   ├── customers/
│   │   ├── limits/
│   │   ├── calls/
│   │   └── audit/
│   ├── patient/                      # Public patient portal
│   └── api/
│       ├── query/                    # RAG proxy (→ n8n)
│       ├── kb/                       # KB upload, list, delete, stream, verify
│       ├── calls/                    # Call CRUD, analyze, dial, top-questions
│       ├── auth/                     # Login / logout (session cookie)
│       ├── org/config/               # Org-level agent config
│       ├── admin/                    # Admin org & usage endpoints
│       ├── vapi/usage/               # Vapi usage stats
│       ├── vapi-chat/                # Vapi tool-call handler
│       └── webhooks/
│           ├── n8n/                  # n8n progress callbacks (SSE source)
│           └── vapi/                 # Vapi event webhooks
├── components/
│   ├── ui/                           # Design system components
│   │   ├── voice-orb.tsx             # Animated call-state orb
│   │   ├── sidebar.tsx               # Dashboard navigation
│   │   ├── ambient.tsx               # Wave bg + floating cards
│   │   ├── shader-background.tsx     # WebGL shader background
│   │   ├── multi-orbit.tsx           # Orbiting-ring hero graphic
│   │   ├── stat-card.tsx             # KPI stat cards
│   │   └── …
│   └── beyondforms/                  # Platform-branded components
├── lib/
│   ├── vapi.ts                       # Vapi singleton + CallState type
│   ├── store.ts                      # Call record persistence
│   ├── theme.tsx                     # Dark/light ThemeProvider
│   ├── utils.ts                      # formatDuration, cn()
│   ├── stores/                       # Zustand stores (auth, calls, admin, …)
│   └── server/                       # Server-only utilities
│       ├── pinecone.ts               # Pinecone client
│       ├── llm.ts                    # Groq client + helpers
│       ├── session.ts                # Session cookie signing
│       ├── callRepository.ts         # Call record CRUD
│       ├── kbRepository.ts           # KB file metadata
│       ├── kbStatusStore.ts          # In-memory SSE progress store
│       └── rateLimiter.ts            # Per-org rate limiting
├── n8n/                              # n8n workflow exports (import into your instance)
│   ├── voice-rag-assistant.updated.json
│   └── kb-ingest-workflow.json
├── docs/                             # Additional documentation
├── .env.example                      # ← copy to .env.local and fill in values
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Vapi](https://vapi.ai) account
- A [Pinecone](https://pinecone.io) account with an index created
- An [n8n](https://n8n.io) instance (local or cloud) with the provided workflows imported
- A [Groq](https://console.groq.com) API key

### 1. Clone & install

```bash
git clone https://github.com/aswathiir/voiceragui.git
cd voiceragui
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your credentials — see the [Environment Variables](#environment-variables) section below.

### 3. Import n8n workflows

Import the two JSON files from the `n8n/` directory into your n8n instance:

| File | Purpose |
|------|---------|
| `voice-rag-assistant.updated.json` | Voice query → Pinecone RAG → Groq LLM |
| `kb-ingest-workflow.json` | 5-stage KB ingestion pipeline |

Set the webhook paths in n8n to match the URLs in your `.env.local`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill in real values. **Never commit `.env.local`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | ✅ | Vapi public key (browser-safe) |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | ✅ | Pre-built Vapi assistant ID |
| `VAPI_PRIVATE_API_KEY` | ✅ | Vapi private key (server-only) |
| `VAPI_PHONE_NUMBER_ID` | Optional | Vapi phone number for outbound calls |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | ✅ | Public n8n URL (e.g. via ngrok) |
| `N8N_WEBHOOK_URL` | ✅ | Internal n8n URL for the server-side proxy |
| `N8N_KB_WEBHOOK_URL` | ✅ | n8n KB ingestion webhook URL |
| `N8N_WEBHOOK_SECRET` | Optional | Shared secret to validate n8n callbacks |
| `PINECONE_API_KEY` | ✅ | Pinecone API key |
| `PINECONE_INDEX` | ✅ | Pinecone index name |
| `GROQ_API_KEY` | ✅ | Groq API key for LLM inference |
| `SESSION_SECRET` | Recommended | Random secret for signing session cookies |
| `STRIPE_SECRET_KEY` | Optional | Stripe key for live billing (Phase 3) |

---

## Demo Credentials

All demo accounts use the password **`password`**.

| Role | Email | Plan | Landing URL |
|------|-------|------|-------------|
| **Super Admin** | `admin@beyondforms.in` | — | `/admin/overview` |
| Organisation | `mythra@hospital.in` | Growth | `/dashboard/home` |
| Organisation | `apollo@clinics.in` | Scale | `/dashboard/home` |
| Organisation | `citycare@thrissur.in` | Starter | `/dashboard/home` |
| Organisation | `demo@beyondforms.in` | Free | `/dashboard/home` |

> **Super Admin** has platform-wide access: organisation management, plan enforcement, live call monitoring, audit logs, and suspend/reactivate controls.

---

## n8n Workflows

The `n8n/` directory contains exportable workflow JSON files. Import them directly from the n8n UI (`Settings → Import Workflow`).

| Workflow | Webhook path | Description |
|----------|-------------|-------------|
| `voice-rag-assistant.updated.json` | `/webhook/voice-rag-query` | Main RAG query pipeline: receives a user question, retrieves matching chunks from Pinecone, calls Groq, and returns a cited answer |
| `kb-ingest-workflow.json` | `/webhook/kb-ingest` | 5-stage ingestion: upload → parse → chunk → embed → index. POSTs progress events back to `/api/webhooks/n8n` |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-side n8n proxy** (`/api/query`) | Keeps the ngrok/n8n URL and Pinecone key off the client; also normalises Vapi tool-call response format |
| **Hydration-safe chat** | `localStorage` is read only after first client render to prevent SSR mismatches |
| **7-state call machine** | `idle → connecting → listening → processing → speaking → ended → error` drives both the orb animation and status label from a single source of truth |
| **Vapi fallback config** | If `NEXT_PUBLIC_VAPI_ASSISTANT_ID` is unset, the call page inlines a full assistant config — the app is fully runnable without a pre-built Vapi assistant |
| **Per-org Pinecone namespaces** | Each organisation's documents live in their own namespace within a shared index — isolation without infrastructure overhead |
| **SSE progress streaming** | KB ingestion progress is streamed via Server-Sent Events from `/api/kb/stream`, keeping the upload UI live without polling |
