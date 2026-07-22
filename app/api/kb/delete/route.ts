import { NextRequest, NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/server/session";
import { deleteVectorsForFile } from "@/lib/server/pinecone";
import { deleteKBFile } from "@/lib/server/kbRepository";

// POST /api/kb/delete { fileId } — removes an uploaded file's vectors from
// the org's Pinecone namespace so deleted knowledge actually stops answering.
export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (isNextResponse(session)) return session;

  const { fileId } = await req.json();
  if (!fileId || typeof fileId !== "string") {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }
  const orgId = session.customerId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization for this session" }, { status: 400 });
  }

  try {
    const deleted = await deleteVectorsForFile(orgId, fileId);
    deleteKBFile(fileId);
    return NextResponse.json({ deleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pinecone delete failed" },
      { status: 502 },
    );
  }
}
