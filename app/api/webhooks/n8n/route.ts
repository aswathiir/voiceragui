import { NextRequest, NextResponse } from "next/server";
import { updateKBStatus, type KBStage } from "@/lib/server/kbStatusStore";
import { updateKBFile } from "@/lib/server/kbRepository";

interface N8nCallbackBody {
  fileId: string;
  orgId?: string;
  stage: KBStage;
  progress?: number;
  chunkCount?: number;
  vectorCount?: number;
  errorMessage?: string;
}

const VALID_STAGES: KBStage[] = ["uploading", "parsing", "chunking", "embedding", "indexed", "failed"];

// n8n calls this once per pipeline stage (uploading -> parsing -> chunking ->
// embedding -> indexed, or -> failed) with the same fileId it received from
// /api/kb/upload's callbackUrl. This is a server-to-server call from n8n —
// no browser session exists here, so it's gated by a shared secret query
// param (the callbackUrl handed to n8n in /api/kb/upload includes it)
// instead of the session cookie used everywhere else.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Invalid or missing webhook secret" }, { status: 401 });
    }
  }

  const body: N8nCallbackBody = await req.json();

  if (!body.fileId || !VALID_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });
  }

  const updated = updateKBStatus(body.fileId, {
    stage: body.stage,
    progress: body.progress,
    chunkCount: body.chunkCount,
    vectorCount: body.vectorCount,
    errorMessage: body.errorMessage ?? null,
  });

  // Keep the durable document registry in sync so the dashboard's Indexed
  // list reflects server truth across refreshes and restarts.
  updateKBFile(body.fileId, {
    status: body.stage,
    chunkCount: body.chunkCount ?? undefined,
    vectorCount: body.vectorCount ?? undefined,
    errorMessage: body.errorMessage ?? null,
  });

  if (!updated) {
    return NextResponse.json({ error: "Unknown fileId" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
