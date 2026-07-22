import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { verifyVectorsForFile } from "@/lib/server/pinecone";

// POST /api/kb/verify { fileId } — live-checks Pinecone for the document's
// vectors in the org's namespace: hard proof the file is really indexed and
// searchable, not just marked done in the UI.
export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const { fileId } = await req.json();
  if (!fileId || typeof fileId !== "string") {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }
  const orgId = session.customerId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const result = await verifyVectorsForFile(orgId, fileId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 502 },
    );
  }
}
