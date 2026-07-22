import { NextRequest, NextResponse } from "next/server";
import { createKBStatus, updateKBStatus } from "@/lib/server/kbStatusStore";
import { checkRateLimit } from "@/lib/server/rateLimiter";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { getOrganizations } from "@/lib/server/adminRepository";
import { createKBFile, updateKBFile } from "@/lib/server/kbRepository";

// Falls back to the shared query webhook if a dedicated KB ingest webhook
// hasn't been configured in n8n yet.
const N8N_KB_WEBHOOK =
  process.env.N8N_KB_WEBHOOK_URL ??
  process.env.N8N_WEBHOOK_URL ??
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "http://localhost:5678/webhook/kb-ingest";

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const form = await req.formData();
  const file = form.get("file");
  const url = form.get("url");
  const orgId = (form.get("orgId") as string) || "unknown_org";

  const org = getOrganizations().find((o) => o.id === orgId);
  if (org?.status === "suspended") {
    return NextResponse.json(
      { error: "This organization is suspended. Contact support." },
      { status: 403 },
    );
  }

  const rate = checkRateLimit(orgId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for this organization" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  if (!file && !url) {
    return NextResponse.json({ error: "No file or url provided" }, { status: 400 });
  }

  const fileId = `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fileName = file instanceof File ? file.name : String(url);

  createKBStatus({ fileId, orgId, fileName });
  createKBFile({ fileId, orgId, fileName });

  // Forward to n8n in the background — callbacks to /api/webhooks/n8n drive
  // the status updates the client streams via /api/kb/stream.
  void (async () => {
    try {
      const upstreamForm = new FormData();
      upstreamForm.set("fileId", fileId);
      upstreamForm.set("orgId", orgId);
      const callbackUrl = new URL("/api/webhooks/n8n", req.url);
      if (process.env.N8N_WEBHOOK_SECRET) {
        callbackUrl.searchParams.set("secret", process.env.N8N_WEBHOOK_SECRET);
      }
      upstreamForm.set("callbackUrl", callbackUrl.toString());
      if (file instanceof File) upstreamForm.set("file", file, file.name);
      if (url) upstreamForm.set("url", String(url));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const upstream = await fetch(N8N_KB_WEBHOOK, {
        method: "POST",
        body: upstreamForm,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!upstream.ok) {
        // Capture the actual n8n error body for actionable diagnostics
        let detail = "";
        try {
          const body = await upstream.json();
          detail = body?.message ?? body?.hint ?? JSON.stringify(body);
        } catch {
          detail = await upstream.text().catch(() => "");
        }
        const msg = detail
          ? `n8n ${upstream.status}: ${detail.slice(0, 300)}`
          : `n8n ingest webhook returned ${upstream.status}`;
        console.error(`[kb-upload] ${msg}`);
        updateKBStatus(fileId, { stage: "failed", errorMessage: msg });
        updateKBFile(fileId, { status: "failed", errorMessage: msg });
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "n8n ingest webhook timed out (30 s)"
          : err instanceof Error
            ? err.message
            : "Failed to reach n8n";
      console.error(`[kb-upload] ${msg}`);
      updateKBStatus(fileId, { stage: "failed", errorMessage: msg });
      updateKBFile(fileId, { status: "failed", errorMessage: msg });
    }
  })();

  return NextResponse.json({ fileId, fileName, orgId, stage: "uploading" });
}
