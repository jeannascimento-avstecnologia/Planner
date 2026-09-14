/** Dígitos de telefone (até 13: 55 + 11). */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 13);
}

/** Máscara BR: (11) 3333-4444 ou (11) 98888-8888. Prefixo 55 omitido na máscara local. */
export function formatPhoneBr(raw: string): string {
  let d = normalizePhone(raw);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const d = normalizePhone(value);
  if (d.length === 10 || d.length === 11) return true;
  return d.length >= 12 && d.length <= 13 && d.startsWith("55");
}
