import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin URL gate — *edge-level UX short-circuit*.
 *
 * The real authorization happens on the Fastify backend: every
 * /api/admin/* and /api/auth/admin/* endpoint chains `app.authenticate` +
 * `app.requireRole`, and the client-side `AdminGuard` confirms the session
 * via GET /auth/admin/me. This middleware only avoids flashing the admin
 * shell to a visitor who has no session cookie at all.
 *
 * Behaviour:
 *
 *   - /admin/login is always reachable (it's where we send unauthenticated
 *     visitors, so it must never redirect to itself).
 *
 *   - Any other /admin/* route requires the presence of the HttpOnly session
 *     cookie. We only check presence here — the signature/expiry/role are
 *     verified server-side on the next API call. A forged or expired cookie
 *     still lands on the panel briefly, then AdminGuard bounces it once
 *     /auth/admin/me returns 401.
 *
 *   - `ADMIN_SESSION_COOKIE` can be overridden to match a custom backend
 *     cookie name; defaults to the backend's `alpina_admin_session`.
 */

const SESSION_COOKIE =
  process.env.ADMIN_SESSION_COOKIE ?? "alpina_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // The login + logout routes must always be reachable (logout has to be able
  // to clear an expired cookie without bouncing through the login redirect).
  if (pathname === "/admin/login" || pathname === "/admin/logout") {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
