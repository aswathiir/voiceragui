import { NextRequest } from "next/server";
import { subscribeToOrg, getOrgRecords, type KBStatusRecord } from "@/lib/server/kbStatusStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (record: KBStatusRecord) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(record)}\n\n`));
      };
      unsubscribe = subscribeToOrg(orgId, send);
      // Keep the connection alive through proxies that buffer/timeout idle streams.
      controller.enqueue(encoder.encode(`: connected\n\n`));
      // Replay current state so a client that connects after a status change
      // (e.g. an upload that failed instantly because the n8n webhook is
      // missing) isn't stuck showing a stale "processing" state forever.
      for (const record of getOrgRecords(orgId)) send(record);
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
