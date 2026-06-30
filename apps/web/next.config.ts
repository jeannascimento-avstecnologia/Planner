import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/content-security-policy";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Fixa a raiz do monorepo (evita inferencia errada por lockfiles vizinhos).
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@nextgen/contracts"],
  reactStrictMode: true,
  // Badge de dev (canto inferior esquerdo) sobrepoe a sidebar compacta; some so em dev.
  devIndicators: false,
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

export default nextConfig;
