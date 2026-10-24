import path from "node:path";
import type { NextConfig } from "next";

/**
 * Simple setup: the site is plain static files (`next build` → `out/`) and the
 * browser calls the API directly at NEXT_PUBLIC_API_URL (see .env). There is no
 * proxy; in production Nginx serves `out/` (see release/nginx-hsc95-static.conf).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    // A static export has no image optimisation server; images are used as they are.
    unoptimized: true,
    // Images may also be loaded from the society's website.
    remotePatterns: [
      { protocol: "https", hostname: "hsc95society.com" },
      { protocol: "https", hostname: "www.hsc95society.com" },
    ],
  },
  turbopack: {
    // This folder is the project root (there is an unrelated package-lock.json in the home folder).
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
