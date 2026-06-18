/** Parse DD.MM.AAAA, DD/MM/AAAA or DD-MM-AAAA → YYYY-MM-DD (ISO date). */
export function parseBrazilianDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Format partial input to DD.MM.AAAA while typing. */
export function formatBrazilianDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** ISO YYYY-MM-DD → DD.MM.AAAA display. */
export function isoToBrazilianDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function todayIsoDateOnly(): string {
  const d = new Date();
  return toDateInputValue(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateInputValue(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayStartIso(): string {
  return `${todayIsoDateOnly()}T12:00:00.000Z`;
}
