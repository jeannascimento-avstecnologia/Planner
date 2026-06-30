/** Utilitarios de cor para estagios (pastel + contraste WCAG). */

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

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [rs, gs, bs] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Mistura cor do estagio com surface (85% surface = pastel suave). */
export function pastelize(hex: string, surface = "#FFFFFF", mix = 0.85): string {
  const rgb = parseHex(hex);
  if (!rgb) return surface;
  return mixHex(surface, rgb, 1 - mix);
}

/** Texto escuro ou claro conforme luminancia do fundo. */
export function contrastText(bgHex: string): "#0B1020" | "#F8FAFC" {
  return relativeLuminance(bgHex) > 0.55 ? "#0B1020" : "#F8FAFC";
}

export function stageCardStyle(stageColor: string, surface = "#FFFFFF"): {
  backgroundColor: string;
  color: string;
} {
  const backgroundColor = pastelize(stageColor, surface);
  return { backgroundColor, color: contrastText(backgroundColor) };
}

export function stageBadgeStyle(stageColor: string): {
  backgroundColor: string;
  color: string;
} {
  const backgroundColor = pastelize(stageColor, "#FFFFFF", 0.7);
  return { backgroundColor, color: contrastText(backgroundColor) };
}
