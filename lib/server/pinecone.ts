// Minimal Pinecone REST helper — used to delete a KB file's vectors from an
// org's namespace when the file is removed in the dashboard. Ingestion and
// search go through n8n; this is the only direct Pinecone call the app makes.

const API_KEY = process.env.PINECONE_API_KEY;
const INDEX = process.env.PINECONE_INDEX ?? "vad";

const globalForPinecone = globalThis as unknown as { __pineconeHost?: string };

async function getIndexHost(): Promise<string> {
  if (globalForPinecone.__pineconeHost) return globalForPinecone.__pineconeHost;
  const res = await fetch(`https://api.pinecone.io/indexes/${INDEX}`, {
    headers: { "Api-Key": API_KEY! },
  });
  if (!res.ok) throw new Error(`Pinecone describe index failed: ${res.status}`);
  const { host } = await res.json();
  globalForPinecone.__pineconeHost = host;
  return host;
}

/**
 * Live proof-of-index: count a file's vectors in the org's namespace and
 * return a snippet of the first chunk, straight from Pinecone.
 */
export async function verifyVectorsForFile(
  orgId: string,
  fileId: string,
): Promise<{ count: number; sample: string | null }> {
  if (!API_KEY) return { count: 0, sample: null };
  const host = await getIndexHost();
  const zero = new Array(768).fill(0);
  const res = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: { "Api-Key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      vector: zero,
      topK: 1000,
      namespace: orgId,
      filter: { fileId: { $eq: fileId } },
      includeMetadata: true,
    }),
  });
  if (!res.ok) throw new Error(`Pinecone query failed: ${res.status}`);
  const { matches } = await res.json();
  const count = (matches ?? []).length;
  const meta = matches?.[0]?.metadata ?? {};
  const sample =
    typeof meta.text === "string"
      ? meta.text.slice(0, 160)
      : typeof meta.pageContent === "string"
        ? meta.pageContent.slice(0, 160)
        : null;
  return { count, sample };
}

/**
 * Delete all vectors belonging to one uploaded file from the org's namespace.
 * Serverless Pinecone has no delete-by-filter, so: query with a zero vector +
 * metadata filter to collect the ids, then delete by id.
 */
export async function deleteVectorsForFile(orgId: string, fileId: string): Promise<number> {
  if (!API_KEY) return 0;
  const host = await getIndexHost();
  const zero = new Array(768).fill(0);
  let deleted = 0;

  // A single file rarely produces >1000 chunks, but loop defensively.
  for (let round = 0; round < 10; round++) {
    const queryRes = await fetch(`https://${host}/query`, {
      method: "POST",
      headers: { "Api-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        vector: zero,
        topK: 1000,
        namespace: orgId,
        filter: { fileId: { $eq: fileId } },
        includeMetadata: false,
      }),
    });
    if (!queryRes.ok) break;
    const { matches } = await queryRes.json();
    const ids: string[] = (matches ?? []).map((m: { id: string }) => m.id);
    if (ids.length === 0) break;

    const delRes = await fetch(`https://${host}/vectors/delete`, {
      method: "POST",
      headers: { "Api-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ ids, namespace: orgId }),
    });
    if (!delRes.ok) break;
    deleted += ids.length;
    if (ids.length < 1000) break;
  }
  return deleted;
}
