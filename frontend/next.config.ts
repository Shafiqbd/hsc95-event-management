import type { NextConfig } from "next";

// Server-only: where the NestJS API runs. The browser always calls the
// same-origin /api path, so the HttpOnly session cookie is first-party and
// no secrets or backend URLs are exposed through NEXT_PUBLIC_ variables.
// Evaluated when `next build` / `next dev` starts.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/backend", destination: "/backend/dashboard", permanent: false },
      // Members no longer have their own pages; staff use /backend.
      { source: "/user/:path*", destination: "/backend/login", permanent: false },
      { source: "/user", destination: "/backend/login", permanent: false },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiProxyTarget}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
