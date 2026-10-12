import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);
const repoRoot = isVercel ? __dirname : path.join(__dirname, "..");
if (!isVercel) {
  loadEnvConfig(repoRoot);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repoRoot,
  turbopack: {
    resolveAlias: {
      "@api": path.join(__dirname, "api"),
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
