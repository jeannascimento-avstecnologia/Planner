import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do monorepo (evita inferencia errada por lockfiles vizinhos).
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@nextgen/contracts"],
  reactStrictMode: true,
  // Badge de dev (canto inferior esquerdo) sobrepoe a sidebar compacta; some so em dev.
  devIndicators: false,
};

export default nextConfig;
