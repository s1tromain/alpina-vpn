import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin URL gate — *optional defence-in-depth*.
 *
 * The real authorization happens on the Fastify backend: every
 * /api/admin/* endpoint chains `app.authenticate` + `app.requireRole`,
 * so a non-admin who guesses the URL will simply get 401/403 toasts
 * across the page. This middleware adds an EARLIER short-circuit at the
 * edge so non-admins don't see the admin shell at all.
 *
 * Behaviour:
 *
 *   - If `ADMIN_ALLOWED_TELEGRAM_IDS` is unset/empty, the gate is open
 *     (regardless of NODE_ENV). The backend still enforces — and most
 *     deployments will leave this unset and rely entirely on the
 *     backend's JWT-based role check.
 *
 *   - If the allowlist IS set, only requests carrying a matching
 *     `x-telegram-id` header or `tg_id` cookie pass through. These are
 *     issued by an upstream proxy that has already verified initData
 *     server-side (not shipped in the open-source code).
 *
 * Why we don't read the JWT here: the JWT lives in localStorage, which
 * the edge runtime can't access. Wiring it into a cookie would solve
 * that, but it's a larger refactor for what is essentially a UX nicety.
 */

const allowed = (process.env.ADMIN_ALLOWED_TELEGRAM_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Gate disabled — defer entirely to the backend's role check.
  if (allowed.length === 0) return NextResponse.next();

  const tgId =
    req.headers.get("x-telegram-id") ??
    req.cookies.get("tg_id")?.value ??
    null;

  if (!tgId || !allowed.includes(tgId)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
