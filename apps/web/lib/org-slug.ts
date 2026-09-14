import { cnpjHasInvalidChars, isValidCnpj } from "@nextgen/contracts";

export { cnpjHasInvalidChars, isValidCnpj, normalizeCnpj } from "@nextgen/contracts";

/** Slug URL a partir do nome de exibicao (sem sufixo aleatorio). */
export function slugifyOrgDisplayName(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return base || "org";
}

/** Formata CNPJ para exibicao: 00.000.000/0000-00 */
export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function cnpjSubmitError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (cnpjHasInvalidChars(trimmed)) return "CNPJ deve conter apenas numeros.";
  if (!isValidCnpj(trimmed)) return "CNPJ invalido.";
  return null;
}
