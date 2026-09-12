import type { NextConfig } from "next";

/**
 * True only under `next dev`. `next build` runs with NODE_ENV=production, so
 * everything gated on this flag is absent from the static export.
 */
const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Static HTML export: no server, deploys to Vercel, Cloudflare Pages or any static host.
  // The export setting is dropped in development only so the admin's write
  // API (a POST route handler) can run under `next dev`.
  output: isDevelopment ? undefined : "export",
  // Emit /games/melody/index.html so every static host serves clean URLs.
  trailingSlash: true,
  images: { unoptimized: true },
  // The development-only admin lives in files named page.dev.tsx, layout.dev.tsx
  // and route.dev.ts. Those extensions are only registered under `next dev`,
  // so `next build` does not see the admin pages or its API at all.
  pageExtensions: isDevelopment ? ["dev.tsx", "dev.ts", "tsx", "ts"] : ["tsx", "ts"],
};

export default nextConfig;
