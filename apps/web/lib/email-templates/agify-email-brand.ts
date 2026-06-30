/** Tokens Agify para templates de email transacional (ver docs/10-ux/color-palette.md) */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const AGIFY_EMAIL = {
  bg: "#F4F7FC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  fg: "#0F172A",
  muted: "#64748B",
  subtle: "#94A3B8",
  brand: "#7C3AED",
  /** Gradiente marca: sky → blue → violet (docs/10-ux/agify-identity.md) */
  brandGradient: "linear-gradient(135deg, #38BDF8 0%, #3B82F6 32%, #6366F1 58%, #8B5CF6 100%)",
  link: "#7C3AED",
  radius: "16px",
  logoPath: "/branding/agify.png",
} as const;

export function agifyLogoUrl(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}${AGIFY_EMAIL.logoPath}`;
}

let cachedLogoDataUri: string | null = null;

function resolveLogoFilePath(): string | null {
  const candidates = [
    join(process.cwd(), "public/branding/agify.png"),
    join(process.cwd(), "apps/web/public/branding/agify.png"),
    join(process.cwd(), "docs/images/Agify.png"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Logo inline para email — evita bloqueio de imagens remotas (ex. localhost em dev). */
export function agifyLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const filePath = resolveLogoFilePath();
  if (!filePath) return "";
  const buf = readFileSync(filePath);
  cachedLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedLogoDataUri;
}

export function agifyLogoSrc(appUrl: string): string {
  return agifyLogoDataUri() || agifyLogoUrl(appUrl);
}
