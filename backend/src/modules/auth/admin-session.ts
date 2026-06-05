import type { CookieSerializeOptions } from "@fastify/cookie";
import { isProd } from "../../config/env.js";

/**
 * Shared config for the web admin panel's session cookie.
 *
 * The JWT (same payload as the Mini App's Bearer token) is stored in an
 * HttpOnly cookie so the browser-based admin panel never has to touch
 * localStorage and the token is invisible to client JS (XSS hardening).
 *
 * SameSite=Lax + Secure (prod) assumes the admin panel is served from the
 * SAME origin as the API (the recommended deploy: Next.js proxies /api/* to
 * the backend, see next.config.js). For a cross-origin API subdomain you'd
 * need SameSite=None; Secure — adjust here if your topology differs.
 */
export const ADMIN_SESSION_COOKIE = "alpina_admin_session";

export function adminCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    // 7 days, matching the default JWT_ACCESS_TTL. The JWT's own `exp`
    // claim is the real authority; this just keeps the cookie from lingering.
    maxAge: 7 * 24 * 60 * 60,
  };
}
