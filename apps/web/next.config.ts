import path from "node:path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { securityHeaders } from "./lib/content-security-policy";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Fixa a raiz do monorepo (evita inferencia errada por lockfiles vizinhos).
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@nextgen/contracts"],
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    const base = securityHeaders(isDev);
    return [
      {
        source: "/:path*",
        headers: base,
      },
      {
        source: "/invite",
        headers: [
          ...base.filter((h) => h.key !== "Referrer-Policy"),
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
