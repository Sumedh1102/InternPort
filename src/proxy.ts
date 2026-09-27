import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: if there is no session cookie, bounce to /login early.
 * Real verification (signature, revocation, role claims) happens in each
 * protected layout and in every server action via the Firebase Admin SDK.
 */
const SESSION_COOKIE = "__session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/mentor/:path*", "/admin/:path*", "/onboarding"],
};
