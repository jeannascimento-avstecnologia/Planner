import path from "node:path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { securityHeaders } from "./lib/content-security-policy";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const isDev = process.env.NODE_ENV !== "production";

/** Hosts permitidos em Server Actions atras de reverse proxy (sem protocolo). */
function serverActionAllowedOrigins(): string[] {
  const origins = new Set<string>(["localhost:3001", "127.0.0.1:3001"]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).host);
    } catch {
      // ignore URL invalida no build
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // PM2 usa `next start` — nao usar output standalone (static 404 no LAN).
  // Fixa a raiz do monorepo (evita inferencia errada por lockfiles vizinhos).
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@nextgen/contracts", "@tanstack/react-query"],
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "**.pinimg.com" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    const base = securityHeaders(isDev);
    const htmlCache =
      isDev
        ? []
        : [{ key: "Cache-Control", value: "no-store, must-revalidate" }];
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [...base, ...htmlCache],
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
