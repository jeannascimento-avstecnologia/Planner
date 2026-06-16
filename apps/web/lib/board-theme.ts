import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";

/** Bases Aurora (evita referencia circular em color-mix com vars do html). */
const BASE = {
  light: { bg: "#f6f8fc", surface: "#ffffff", border: "#e2e8f0" },
  dark: { bg: "#0f141c", surface: "#161d29", border: "#293445" },
} as const;

const MIX = {
  light: { bg: 0.06, surface: 0.1, border: 0.12, muted: 0.2 },
  dark: { bg: 0.08, surface: 0.12, border: 0.15, muted: 0.22 },
} as const;

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(base: string, accent: [number, number, number], ratio: number): string {
  const b = parseHex(base);
  if (!b) return base;
  const t = Math.min(1, Math.max(0, ratio));
  const r = Math.round(b[0] * (1 - t) + accent[0] * t);
  const g = Math.round(b[1] * (1 - t) + accent[1] * t);
  const bl = Math.round(b[2] * (1 - t) + accent[2] * t);
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** CSS vars para `.board-theme-scope`. hex nulo => {} (fallback Aurora via @theme). */
export function deriveBoardThemeVars(hex: string | null, mode: ThemeMode): CSSProperties {
  if (!hex) return {};

  const rgb = parseHex(hex);
  if (!rgb) return {};

  const base = BASE[mode];
  const mix = MIX[mode];

  return {
    "--board-accent": hex,
    "--board-accent-muted": mixHex(base.surface, rgb, mix.muted),
    "--board-bg": mixHex(base.bg, rgb, mix.bg),
    "--board-surface": mixHex(base.surface, rgb, mix.surface),
    "--board-border": mixHex(base.border, rgb, mix.border),
  } as CSSProperties;
}
