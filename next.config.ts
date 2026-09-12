import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: no server, deploys to Vercel, Cloudflare Pages or any static host.
  output: "export",
  // Emit /games/melody/index.html so every static host serves clean URLs.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
