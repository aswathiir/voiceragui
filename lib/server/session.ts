import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Minimal signed-cookie session — NOT a replacement for real auth (passwords
// are still the plaintext mock check in lib/server/mockUsers.ts). This only
// closes the hole where the API routes had zero verification of the caller
// at all. Swapping in NextAuth/Supabase Auth later means replacing this file
// and the two routes in app/api/auth/*; nothing else needs to change since
// every guarded route just calls getSession()/requireSession() below.

export type SessionRole = "super_admin" | "customer";

export interface SessionPayload {
  sub: string;
  role: SessionRole;
  customerId: string | null;
  exp: number; // epoch ms
}

export const SESSION_COOKIE = "bf_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Falls back to a fixed dev secret so local dev keeps working without setup,
// but logs a warning — set SESSION_SECRET in production.
const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-set-SESSION_SECRET-env-var";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.warn("SESSION_SECRET is not set — using an insecure default. Set it before deploying.");
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionCookieValue(user: { id: string; role: SessionRole; customerId: string | null }): string {
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    customerId: user.customerId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionCookieValue(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  return verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Returns the session, or a 401 NextResponse to return directly from the route. */
export function requireSession(req: NextRequest): SessionPayload | NextResponse {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return session;
}

/** Returns the session, or a 401/403 NextResponse to return directly from the route. */
export function requireRole(req: NextRequest, role: SessionRole): SessionPayload | NextResponse {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;
  if (session.role !== role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
