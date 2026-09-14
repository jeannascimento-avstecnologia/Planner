/** Parse número decimal pt-BR/en (`8,5` ou `8.5`). Rejeita notação científica. */
export function parseLocaleNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[eE]/.test(trimmed)) return null;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function formatHoursLabel(value: number | null | undefined): string {
  const formatted = formatHours(value);
  return formatted ? `${formatted}h` : "";
}
