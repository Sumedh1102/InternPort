import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROLES, type Role } from "@/lib/domain/enums";
import { ROLE_HOME } from "@/lib/domain/workflows";
import { adminAuth, isAdminConfigured } from "../firebase-admin";

/** `__session` is the only cookie Firebase Hosting forwards to backends. */
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days
/** Readable by JS purely for UI (e.g. "Dashboard" link on static pages). Not trusted. */
export const ROLE_HINT_COOKIE = "sainam_role";

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  role: Role;
  emailVerified: boolean;
  provider?: string;
}

export function roleFromClaims(claims: Record<string, unknown>): Role {
  const role = claims.role;
  return typeof role === "string" && (ROLES as readonly string[]).includes(role)
    ? (role as Role)
    : "STUDENT";
}

/**
 * Verifies the httpOnly session cookie with the Admin SDK (including revocation),
 * so role changes and sign-outs take effect server-side. Memoised per request.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (!isAdminConfigured()) return null;
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: (decoded.name as string | undefined) ?? decoded.email?.split("@")[0] ?? "Member",
      picture: decoded.picture,
      role: roleFromClaims(decoded),
      emailVerified: Boolean(decoded.email_verified),
      provider: decoded.firebase?.sign_in_provider,
    };
  } catch {
    return null;
  }
});

interface RequireOptions {
  /** Where to come back to after logging in. */
  next?: string;
  allowUnverified?: boolean;
}

export async function requireSession(opts: RequireOptions = {}): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/login${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  }
  if (!opts.allowUnverified && !session.emailVerified) redirect("/verify-email");
  return session;
}

/** Guards a whole area (layout). Users with another role are sent to their own home. */
export async function requireRole(roles: readonly Role[], opts: RequireOptions = {}): Promise<SessionUser> {
  const session = await requireSession(opts);
  if (!roles.includes(session.role)) redirect(ROLE_HOME[session.role]);
  return session;
}
