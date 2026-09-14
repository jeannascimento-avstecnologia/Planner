/** Normaliza CNPJ para apenas dígitos (max 14). */
export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

/** Letras, e-mail e outros símbolos fora da máscara 00.000.000/0000-00. */
export function cnpjHasInvalidChars(raw: string): boolean {
  return /[^\d.\s/-]/.test(raw);
}

function cnpjCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** Valida 14 dígitos + módulo 11. Vazio não é válido (tratar opcional no caller). */
export function isValidCnpj(value: string): boolean {
  const d = normalizeCnpj(value);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (cnpjCheckDigit(d.slice(0, 12), w1) !== Number(d[12])) return false;
  return cnpjCheckDigit(d.slice(0, 13), w2) === Number(d[13]);
}
