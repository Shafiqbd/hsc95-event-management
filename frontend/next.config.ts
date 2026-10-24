import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Dev only: where the NestJS API runs. The browser always calls the same-origin
// /api path, so the HttpOnly session cookie is first-party. In production Nginx
// does this forwarding instead (see release/nginx-hsc95-static.conf).
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

// This folder is the project root (there is an unrelated package-lock.json in the home folder).
const projectRoot = path.join(__dirname);

const base: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/**
 * `next build` → static export: plain HTML/CSS/JS in `out/`, served by Nginx (no Node.js
 * process for the frontend). Rewrites, redirects and headers do not exist in a static
 * export, so Nginx provides them in production: /api → backend, /backend → dashboard,
 * security headers.
 *
 * `next dev` → normal dev server with the /api proxy, redirects and headers below.
 */
export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    return {
      ...base,
      output: "export",
      trailingSlash: true,
      // Cache Components / partial prefetching need a running Next.js server (not available
      // in a static export); the app does not use them.
      cacheComponents: false,
      partialPrefetching: false,
    };
  }

  return {
    ...base,
    cacheComponents: true,
    partialPrefetching: true,
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
}
