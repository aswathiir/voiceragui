// Token-bucket rate limiter, keyed by orgId. In-memory by default — fine for
// a single Next.js server instance. Swap the Map below for a Redis-backed
// store (e.g. ioredis + a Lua script) behind this same checkRateLimit()
// signature once REDIS_URL is available; nothing above this file needs to change.

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

// Anchored on globalThis so the bucket map is actually shared across the
// separately-bundled route handlers that import this module (see the same
// note in lib/server/kbStatusStore.ts).
const globalForRateLimit = globalThis as unknown as { __rateLimitBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.__rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__rateLimitBuckets = buckets;

const CAPACITY = 30; // max burst requests
const REFILL_PER_SEC = 1; // steady-state requests/sec allowed per org

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, lastRefillMs: now };

  const elapsedSec = (now - bucket.lastRefillMs) / 1000;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsedSec * REFILL_PER_SEC);
  bucket.lastRefillMs = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
  }

  buckets.set(key, bucket);
  const retryAfterMs = Math.ceil(((1 - bucket.tokens) / REFILL_PER_SEC) * 1000);
  return { allowed: false, remaining: 0, retryAfterMs };
}
