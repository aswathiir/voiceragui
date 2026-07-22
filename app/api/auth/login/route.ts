import { NextRequest, NextResponse } from "next/server";
import { MOCK_USERS } from "@/lib/server/mockUsers";
import { createSessionCookieValue, SESSION_COOKIE } from "@/lib/server/session";
import { addAuditEntry } from "@/lib/server/auditRepository";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const normalizedEmail = String(email).toLowerCase().trim();

  const mock = MOCK_USERS[normalizedEmail];
  if (!mock || mock.password !== password) {
    addAuditEntry({
      actorEmail: normalizedEmail,
      actorRole: "system",
      action: "login_failed",
      details: "Invalid email or password",
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { password: _pw, ...user } = mock;
  addAuditEntry({
    actorEmail: user.email,
    actorRole: user.role,
    action: "login",
    targetOrgId: user.customerId ?? undefined,
  });
  const res = NextResponse.json({ user });

  res.cookies.set(SESSION_COOKIE, createSessionCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
