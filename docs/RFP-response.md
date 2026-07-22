# BeyondForms — Vendor Due Diligence Response

Prepared: 15 July 2026
Scope: This document answers the questionnaire strictly against what is implemented in the current codebase (`voice-rag-ui`). Every answer is marked with a status tag:

- **Implemented** — built, running, and verified in this codebase.
- **Partial** — a real mechanism exists but does not cover the full ask.
- **Not implemented** — no code exists for this today; noted honestly rather than assumed.

Where useful, the answer points to the actual file or route that backs the claim, so engineering can verify it directly.

This is a working platform prototype, not a certified enterprise product. It uses cloud providers (Vapi for voice, Pinecone for vectors, Groq for inference, n8n for orchestration) plus a local file-backed data store rather than a managed database. Treat this document as the honest baseline for a hardening roadmap, not a claim of production/compliance readiness.

---

## 1. Security and User Authentication

### 1.1 How is data secured during voice calls and after storage?
**Partial.** All network calls (browser to Vapi, Vapi to our webhooks, our server to Pinecone/Groq/n8n) run over HTTPS/WSS. At rest, however, application data — organizations, calls, appointments, knowledge-base registry, voice config, audit log — is stored as **plaintext JSON files** under `.data/` (`lib/server/adminRepository.ts`, `lib/server/callRepository.ts`, etc.). There is no field- or disk-level encryption applied by this application. Vectors live in Pinecone and call recordings/metadata live in Vapi's own infrastructure, both encrypted at rest by those providers, but that is provider-side, not something this codebase adds.

### 1.2 What security standards does the platform follow?
**Partial.** Authentication uses an HMAC-SHA256 signed, `httpOnly` session cookie (`lib/server/session.ts`) with a 7-day expiry and constant-time signature verification (`timingSafeEqual`). Every protected API route calls `requireSession()` or `requireRole()` before doing any work. There is no adherence to a named standard (SOC 2, ISO 27001) — this is solid engineering practice, not a certified framework.

### 1.3 Is the platform GDPR / HIPAA / UAE PDPL compliant?
**Not implemented.** There is no Business Associate Agreement tooling, no data-residency control, no PII redaction, no consent-capture flow, no formal retention/deletion policy, and no encryption-at-rest. For a hospital deployment this is the single largest gap and would need dedicated compliance work (BAAs with Vapi/Pinecone/Groq, encrypted storage, audit-grade logging, a documented retention policy) before go-live.

### 1.4 How is caller identity verified before sensitive information is shared?
**Not implemented.** Phone calls are not authenticated — anyone dialing the organization's number reaches the assistant and can ask about anything in that organization's knowledge base. There is no OTP, date-of-birth, or MRN challenge step today. This should be treated as a required addition before handling patient-specific (not just general FAQ) information by voice.

### 1.5 Is role-based access implemented?
**Implemented.** Two roles exist: `super_admin` and `customer`, enforced server-side in `lib/server/session.ts` (`requireRole`). Super-admins manage all organizations; customers only ever see data scoped to their own `orgId` — every dashboard API route filters by the session's `customerId`, not a client-supplied value.

### 1.6 Is there an audit log of actions?
**Implemented (newly added).** A file-backed audit trail (`lib/server/auditRepository.ts`, `.data/audit-log.json`) now records every login attempt (success and failure) and every admin change to an organization's status or plan (suspend/reactivate, plan upgrade/downgrade), each with timestamp, actor, action, and target org. Viewable in the new **Audit Log** page in the Super Admin sidebar, backed by `GET /api/admin/audit`. This does not yet cover every action in the system (e.g., KB uploads, appointment bookings are not separately audited) — it currently covers the security-relevant surface: who logged in and who changed organization access/billing state.

### 1.7 Is API access authenticated?
**Implemented for internal routes; partial for tool callbacks.** Dashboard and admin API routes require the signed session cookie. Vapi's own tool-call webhooks (`/api/query`, `/api/appointments`) cannot carry a browser session cookie since they're server-to-server calls from Vapi's cloud — these are instead scoped by `orgId` embedded in the tool's callback URL at call-start time and are not further authenticated against a shared secret today. This is a legitimate hardening item (e.g., an HMAC-signed callback token) but is not currently implemented.

### 1.8 How is unauthorized access or data leakage between tenants prevented?
**Implemented — this is the platform's strongest security property.** Multi-tenancy is enforced at the data layer, not just the UI: each organization's uploaded documents live in a **separate Pinecone namespace** keyed by `orgId` (`lib/server/assistantOverrides.ts` builds the tool URL with `orgId` embedded; the n8n retrieval workflow filters `pineconeNamespace` by that value). A query for one organization physically cannot retrieve another organization's vectors — this was directly verified during recent work (namespace-scoped retrieval tested against three different knowledge bases with zero cross-contamination). Additionally, `getOrganizations().find(...).status === "suspended"` is checked before any call is allowed to start (`app/api/calls/overrides/route.ts`), acting as an instant kill switch per organization.

---

## 2. Infrastructure and Operating Cost

### 2.1 SaaS — is infrastructure fully vendor-managed?
**Partial.** Today the Next.js application and n8n workflow engine run on a single development machine, tunneled to the internet via ngrok so Vapi's cloud can reach the local webhooks. Voice processing itself (STT, LLM inference routing, TTS) is fully cloud-managed by Vapi; vector storage is fully cloud-managed by Pinecone. A production SaaS deployment would move the Next.js app and n8n to a managed host (e.g., Vercel + a managed n8n instance) — this is a deployment change, not a rearchitecture.

### 2.2 SaaS — hosting and maintenance pricing?
**Not implemented.** No pricing engine exists for infrastructure cost recovery; this is a commercial decision to be layered on top of the real usage data the platform already tracks (see 2.3).

### 2.3 SaaS — is pricing usage-based, and does cost scale with usage?
**Implemented (metering) / Partial (billing).** The codebase defines per-organization plans with a monthly fee and an included call quota (`PLAN_META` in `lib/stores/adminStore.ts`: free/starter/growth/scale/enterprise). Actual usage is tracked from **real Vapi call data**, not estimates — the Live Usage page (`app/dashboard/usage/page.tsx`, `app/api/vapi/usage/route.ts`) pulls live cost and minutes directly from Vapi's `/call` API, and the Super Admin Overview aggregates this across organizations. What's missing is the billing/invoicing layer itself: charging a card for overage is not wired up (Stripe integration exists as a scaffold behind `STRIPE_SECRET_KEY` — see 2.4 equivalent below — and shows a "Connect Stripe" empty state when the key is absent, which is the current state).

### 2.4 On-premises — server specs, VM support, hardware, licensing, DR?
**Not implemented.** The platform is architected around Vapi (cloud voice) and Pinecone (cloud vectors); neither has an on-prem deployment path in this codebase. An on-prem offering would require substituting the voice layer (e.g., self-hosted Twilio/Asterisk + local STT/TTS) and the vector layer (e.g., pgvector or Qdrant) — this is a distinct engineering track, not a configuration flag.

---

## 3. API Integration and Cost Ownership

### 3.1 What third-party APIs does the platform require?
**Implemented.** Vapi (voice orchestration, STT/LLM/TTS, telephony via a Twilio-backed number), Groq (`llama-3.3-70b-versatile`, used both by the Vapi assistant directly and, previously, inside n8n — now removed from n8n, see 5.3), Ollama running `nomic-embed-text` locally for embeddings, Pinecone (vector storage/retrieval), and n8n (workflow orchestration for ingestion and query). All confirmed live in `.env.local` and exercised end-to-end.

### 3.2 Who holds the API subscriptions today?
**As deployed:** all provider accounts (Vapi, Groq, Pinecone) are held by the platform operator, configured via server-side environment variables — no per-tenant key storage exists.

### 3.3 Who pays for AI/model usage?
**Partial.** The platform currently absorbs the cost of Groq inference and Vapi minutes; the Live Usage page measures exact per-call cost from Vapi's billing API but there is no automated charge-back to the organization based on that measurement — usage is visible, not yet billed.

### 3.4 Is telephony integration included?
**Implemented.** A Twilio-backed toll-free number is provisioned and wired through Vapi for both inbound patient calls and outbound dialing (`app/api/calls/dial/route.ts`, `app/api/patient/dial/route.ts`).

### 3.5 Is WhatsApp integration available?
**Not implemented.**

### 3.6 Can customers supply their own API keys?
**Not implemented as a feature**, though the architecture (env-var-based provider config) would make it straightforward to add a per-organization key override later — no UI or storage for this exists today.

### 3.7 Are there hidden third-party costs to be aware of?
**Documented from direct experience.** Groq's on-demand free tier caps at 12,000 tokens/minute — the platform actually hit this limit during development when both n8n's retrieval agent and Vapi's own assistant were independently calling Groq per query. This was the direct motivation for a recent architecture change (see 5.3): n8n's query workflow no longer runs an LLM at all, cutting Groq token consumption roughly in half per call. Pinecone and Vapi both have their own usage-based tiers beyond free allowances.

### 3.8 Is API usage monitored?
**Implemented.** The Live Usage dashboard shows real per-call cost and cumulative spend pulled directly from Vapi; n8n's own execution log shows every retrieval call made against the knowledge base, giving visibility into query volume independent of Vapi's numbers.

---

## 4. User Capacity and Scalability

### 4.1 Is there a user limit?
**Not enforced in code.** No hard ceiling exists, but the current data layer (flat JSON files, single Node process) is architected for a moderate number of organizations and calls, not for large-scale horizontal growth — a database migration would be the first step toward removing that ceiling.

### 4.2 / 4.3 Multiple admins, departmental access?
**Partial / Not implemented.** The role model supports multiple `super_admin` accounts (see `lib/server/mockUsers.ts`), but there is no sub-organization "department" concept — access is scoped at the organization level only.

### 4.4 Concurrent call capacity?
**Bounded by the Vapi account plan**, not by this codebase. On our side, a token-bucket rate limiter (`lib/server/rateLimiter.ts`) throttles query volume per organization to protect the KB/n8n layer from being overwhelmed, independent of Vapi's own concurrency limits.

### 4.5 Multiple phone numbers routing to per-organization assistants?
**Not implemented — a known architectural constraint.** Today there is a **single shared Vapi assistant** used by every organization; per-call correctness comes from dynamically injecting that organization's greeting, system prompt, and knowledge-base tool bindings at call start via `assistantOverrides` (`lib/server/assistantOverrides.ts`, used by both the phone-dial route and the browser/patient call routes as of this recent fix). This makes per-org behavior correct, but true multi-number routing (each organization owning its own dedicated inbound number) is not yet built — every organization currently shares the platform's one number and is disambiguated by which link/dashboard initiates the call, not by which number was dialed.

### 4.6–4.10 Branch sharing, call-center scale, queues, multiple simultaneous agents, peak traffic?
**Not implemented / Partial.** Data isolation across branches works (namespace-based), but there is no call queueing system, and the platform has not been load-tested for call-center-scale concurrency. The rate limiter returns HTTP 429 once an organization's query bucket is exhausted, which is the only backpressure mechanism in place today.

---

## 5. FAQ Management and Cost Optimization

### 5.1 Can customers manage their own FAQs without developer help?
**Implemented.** The Knowledge Base page lets an organization admin upload PDF, CSV, JSON, DOCX, SQL, or a URL directly from the dashboard; a five-stage pipeline (chunk, embed, index, verify) runs automatically and the admin can delete or retry any file — no engineering involvement required.

### 5.2 Can knowledge be updated live from the dashboard?
**Implemented.** Same upload/delete flow as above; a new upload is indexed into that organization's Pinecone namespace and available to live calls immediately.

### 5.3 Does the AI learn from past conversations automatically?
**Not implemented.** Retrieval only reads from explicitly uploaded documents. Nothing from past call transcripts is automatically re-indexed into the knowledge base. (Note: to keep this retrieval path fast and inexpensive, the n8n query workflow was recently rebuilt to skip its own LLM step entirely and return raw knowledge-base excerpts directly — Vapi's assistant LLM is what turns those excerpts into a spoken answer. This removed a redundant Groq call per query and was the fix for the rate-limit issue described in 3.7.)

### 5.4 Can FAQs be categorized by department?
**Not implemented.** Documents are tracked per organization only, not by sub-category.

### 5.5 Is FAQ accuracy monitored?
**Partial.** A "Test AI" sandbox on the Knowledge Base page lets an admin type a question and see the exact answer the live pipeline would give, before going live with real callers. A separate "Verify" action confirms a given upload is actually present and queryable in the vector index. Neither of these is an automated accuracy score over time.

### 5.6 Does the AI suggest new FAQs based on real usage?
**Partial.** The Analytics page already clusters recent call transcripts (via a Groq analysis call) into the top five recurring caller questions — a strong signal for "these should become FAQs." There is no one-click "promote this to the knowledge base" action wired to that list yet.

---

## AI Capabilities

- **Emotion/sentiment detection** — **Implemented.** Every analyzed call gets a sentiment label (positive/neutral/negative/frustrated) via a Groq-based transcript analysis (`app/api/calls/analyze/route.ts`), shown as a colored badge on the Calls page.
- **Transfer to a human agent** — **Partial.** Configure page exposes a fallback number and a "transfer after N seconds" setting, but the actual warm-transfer call flow is not fully wired end-to-end yet.
- **Automatic conversation summarization** — **Implemented.** The same analysis endpoint returns a one-line summary and detected intent per call, viewable in the call's transcript panel with one click.

## Telephony Integration

- **PBX systems (Cisco, Avaya, 3CX, Yeastar, Grandstream, Asterisk)** — **Not implemented.** Telephony runs through Vapi's Twilio-backed number, not a SIP trunk into an on-prem PBX.
- **WhatsApp voice/calls** — **Not implemented.**
- **Outbound campaigns** — **Partial.** A single outbound dial is fully functional (`app/api/calls/dial/route.ts`); there is no bulk campaign scheduler or contact-list manager.

## CRM and ERP Integration

**Not implemented.** No connectors exist for Salesforce, Zoho, Microsoft Dynamics, HubSpot, SAP, Oracle, or Odoo.

## Hospital-Specific Questions

- **Lab report updates by voice** — **Partial.** If a report or result document is uploaded to the knowledge base, the assistant can answer questions about it from that text — there is no live integration with a Lab Information System, so this only works for content that has actually been uploaded.
- **Automated payment reminders** — **Not implemented.**
- **Insurance verification** — **Partial.** The assistant can answer questions about insurance policies that have been uploaded as documents (e.g., which insurers are accepted), but there is no live, real-time eligibility check against a payer system.

## Hotel-Specific Questions

**Not implemented.** Room service, housekeeping requests, wake-up calls, restaurant reservations, and complaint routing have no dedicated workflows today. The one action-taking pattern that does exist — the `book_appointment` Vapi tool, which lets the assistant collect structured details (name, date/time, reason) mid-call and write them to a store (`app/api/appointments/route.ts`) — is a directly reusable pattern for building any of these hotel workflows, but none of them are built yet.

## Analytics and Reporting

- **Available reports** — **Implemented.** Peak call times, average resolution time, top five recurring questions, and percentage of calls resolved by AI without escalation, all computed from real call data on the Analytics page. The Super Admin Overview separately reports estimated MRR and per-organization usage.
- **Customizable dashboards** — **Not implemented.** Layouts are fixed, not user-configurable.
- **Export to Excel/PDF** — **Implemented (newly added).** CSV export is now available on the Call History page (all filtered calls, including duration, status, sentiment, cost, and resolution outcome) and the Live Usage page (the full Vapi call ledger with real billed cost). PDF export is not implemented; CSV opens directly in Excel and covers the same underlying data.
- **AI success/fallback rates** — **Implemented.** "Resolved by AI" percentage is computed and shown on both the Call History summary and the Analytics page.
- **Business KPI monitoring** — **Partial.** Core call/cost/caller metrics are tracked; there is no configurable KPI/goal-tracking layer beyond what's shown.

## Recording and Compliance

- **Call recording** — **Partial.** Vapi records call audio on its own infrastructure; this application stores the **text transcript**, not the audio file itself.
- **Encryption, retention policy, downloadability, searchability** — **Partial / Not implemented.** Transcripts are not separately encrypted at rest (see 1.1) and there is no defined retention/deletion policy. Transcripts are now downloadable as plain text per call (newly added "Download transcript" action on the Call History page) and calls are searchable by caller number in the same page — full-text search across transcript content is not implemented.

## Performance

- **Average response time** — Retrieval latency is low (roughly one to two seconds) now that the n8n query path is retrieval-only rather than running its own LLM agent; total perceived response time also includes Vapi's own STT/TTS latency, which is outside this codebase's control.
- **Uptime SLA** — **Not implemented.** No formal SLA exists; the current environment runs on a single development machine behind an ngrok tunnel, which is not a production-grade uptime posture.
- **Concurrent-scale performance** — **Not tested.** The platform has not been load-tested at call-center scale; the file-backed data store is the first bottleneck that would need addressing.
- **Fallback if AI is unavailable** — **Partial.** Errors are handled gracefully (the KB pipeline has a watchdog for stuck jobs; failed queries return an error rather than hanging), but there is no automatic failover to a human agent when the AI service itself is down.

## Administration

- **Web-based admin portal** — **Implemented.** A full Super Admin dashboard exists: organization list and detail views, live call monitoring, plan/quota limits, suspend/reactivate, impersonation ("log in as this organization"), and now an audit log.
- **Per-department dashboards, customizable permissions** — **Not implemented** beyond the two-role (`super_admin`/`customer`) model.
- **Multi-tenant management** — **Implemented.** This is the platform's core architectural strength: every organization's data, knowledge base, calls, and billing are cleanly isolated and centrally administrable from one console.

## Deployment and Support

**Not implemented / not applicable at this stage.** There is no formal implementation-timeline commitment, onboarding/training program, 24x7 support desk, response/resolution SLA, or defined data-migration procedure for upgrades — this is a platform build, not yet a supported commercial product, and these would need to be defined as part of any commercial engagement.

## Strategic Business Questions

- **Competitive advantage** — The strongest, independently verifiable asset is the working, tenant-isolated RAG pipeline: real per-organization Pinecone namespaces, self-service knowledge-base management with a live test sandbox, and real (not estimated) Vapi cost metering surfaced per call — all confirmed working end-to-end, not aspirational.
- **Priority industries for launch** — Hospitals and clinics are the best-fit today (the data model, appointment booking, and sample knowledge bases are already healthcare-shaped); hotels are a plausible second vertical since the booking-tool pattern generalizes, but hotel-specific workflows are not yet built (see above).
- **White-labeling** — **Partial.** Branding is centralized in a small number of files, making a rebrand feasible, but there is no self-service white-label configuration UI.
- **Multi-tenant SaaS architecture** — **Implemented at the data layer** (namespace isolation, per-org config, suspension as a kill switch); **partial at the voice layer**, since all organizations currently share one Vapi assistant and one phone number (see 4.5).
- **Maximum realistic scale today** — Limited by the file-backed data store and shared assistant; comfortable for a pilot with a handful of organizations, not yet validated for dozens or hundreds.
- **Workflow customization per industry** — **A genuine strength.** Because ingestion and query logic run as n8n workflows rather than hardcoded application logic, an engineer can visually inspect and modify the pipeline (e.g., add industry-specific processing steps) without a full application deployment.
- **Enterprise implementation timelines** — Any enterprise commitment should assume a hardening phase first (real database, encryption at rest, compliance work, per-organization voice assistants) rather than treating the current prototype as directly enterprise-deployable.

---

## Summary: what changed in this pass

Three capabilities were added to the platform in this update, all confined to the dashboard/admin layer so the currently running voice pipeline (Vapi assistant configuration, the n8n retrieval workflow, and the `/api/query` tool-call path) was not touched or restarted:

1. **Audit log** — every login attempt and every organization status/plan change is now recorded and viewable at Super Admin → Audit Log.
2. **CSV export** — the Call History page and the Live Usage page can now export their full data to CSV for spreadsheet analysis.
3. **Transcript download** — any call's transcript can be downloaded as a plain-text file directly from the Call History table.

## Recommended next priorities

Given the gaps above, the highest-leverage next steps, roughly in order of impact for a hospital pilot, are:
1. Encryption at rest for stored transcripts/organization data, plus a documented retention policy.
2. Caller identity verification before disclosing patient-specific information by phone.
3. Per-organization Vapi assistants (removing the shared-assistant constraint) so multi-number, multi-brand deployment becomes possible.
4. A managed database in place of the file-backed JSON store, as the actual ceiling on scale.
