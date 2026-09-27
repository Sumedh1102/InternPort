import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { Role } from "@/lib/domain/enums";
import { ROLE_HOME } from "@/lib/domain/workflows";
import {
  ROLE_HINT_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  roleFromClaims,
} from "@/server/auth/session";
import { COL, col, serverNow } from "@/server/db";
import { adminAuth, isAdminConfigured } from "@/server/firebase-admin";
import { isSameOrigin } from "@/server/security";

const bodySchema = z.object({
  idToken: z.string().min(20).max(5000),
  name: z.string().trim().max(80).optional(),
});

/** Sign-ins older than this cannot mint a session cookie (limits stolen-token replay). */
const MAX_AUTH_AGE_SECONDS = 60 * 60;

function bootstrapSuperAdmins(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Authentication is not configured on the server." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const auth = adminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(parsed.data.idToken, true);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired sign-in." }, { status: 401 });
  }

  if (Date.now() / 1000 - decoded.auth_time > MAX_AUTH_AGE_SECONDS) {
    return NextResponse.json(
      { ok: false, error: "Please sign in again.", code: "stale-login" },
      { status: 401 },
    );
  }

  const email = (decoded.email ?? "").toLowerCase();
  const emailVerified = Boolean(decoded.email_verified);
  const userRef = col(COL.users).doc(decoded.uid);
  const userSnap = await userRef.get();

  if (userSnap.exists && userSnap.get("disabled") === true) {
    return NextResponse.json(
      { ok: false, error: "This account has been disabled. Contact Sainam Technology." },
      { status: 403 },
    );
  }

  // Custom claims are the source of truth for roles. New accounts start as STUDENT.
  const hasRoleClaim = typeof decoded.role === "string";
  let role: Role = roleFromClaims(decoded);
  let claimsChanged = false;

  if (!hasRoleClaim) {
    role = "STUDENT";
    claimsChanged = true;
  }
  if (emailVerified && bootstrapSuperAdmins().includes(email) && role !== "SUPER_ADMIN") {
    role = "SUPER_ADMIN";
    claimsChanged = true;
  }

  if (!userSnap.exists) {
    await userRef.set({
      name: parsed.data.name || decoded.name || email.split("@")[0] || "Student",
      email,
      role,
      profileImage: decoded.picture ?? null,
      onboarded: role !== "STUDENT",
      createdAt: serverNow(),
      updatedAt: serverNow(),
    });
  } else if (userSnap.get("role") !== role || userSnap.get("email") !== email) {
    await userRef.update({ role, email, updatedAt: serverNow() });
  }

  if (claimsChanged) {
    const user = await auth.getUser(decoded.uid);
    await auth.setCustomUserClaims(decoded.uid, { ...(user.customClaims ?? {}), role });
    // The client must fetch a fresh ID token carrying the new claim and call us again.
    return NextResponse.json({ ok: true, refresh: true });
  }

  const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // UI hint only (lets static public pages show "Dashboard"); never used for authorization.
  store.set(ROLE_HINT_COOKIE, role, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const onboarded = userSnap.exists ? userSnap.get("onboarded") !== false : role !== "STUDENT";
  const redirectTo = !emailVerified
    ? "/verify-email"
    : role === "STUDENT" && !onboarded
      ? "/onboarding"
      : ROLE_HOME[role];

  return NextResponse.json({ ok: true, role, emailVerified, redirectTo });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  store.delete(ROLE_HINT_COOKIE);
  if (cookie && isAdminConfigured() && request.nextUrl.searchParams.get("everywhere") === "1") {
    try {
      const decoded = await adminAuth().verifySessionCookie(cookie);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Cookie already invalid — nothing to revoke.
    }
  }
  return NextResponse.json({ ok: true });
}
