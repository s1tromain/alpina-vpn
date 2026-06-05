/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `standalone` keeps the production image small by bundling only the
  // server runtime + the files it needs into `.next/standalone`.
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "telegram.org" },
      { protocol: "https", hostname: "cdn.telegram.org" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  /**
   * Dev-only reverse-proxy.
   *
   * When `NEXT_PUBLIC_API_URL` is set (production / preview), the API
   * client hits the backend directly with CORS — no rewrite needed.
   *
   * When it's not set (typical `npm run dev`), we forward /api/* and
   * /health/* to the local backend on http://localhost:4000 so the
   * Mini App can be developed in a single browser tab without CORS.
   *
   * IMPORTANT: rewrites live in `beforeFiles` so they take precedence
   * over the legacy mock route handlers in `src/app/api/*`. Those mock
   * handlers are deliberately left in place (they're useful for offline
   * UI sketching) but are inert as long as a real backend is reachable.
   *
   * `BACKEND_URL` overrides the proxy target — useful for staging.
   */
  async rewrites() { 
    if (process.env.NEXT_PUBLIC_API_URL) {
      return { beforeFiles: [], afterFiles: [], fallback: [] };
    }
    const backend = process.env.BACKEND_URL ?? "http://localhost:4000";
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${backend}/api/:path*` },
        { source: "/health", destination: `${backend}/health` },
        { source: "/health/db", destination: `${backend}/health/db` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
