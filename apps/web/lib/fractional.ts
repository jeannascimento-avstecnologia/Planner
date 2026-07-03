import { generateKeyBetween } from "fractional-indexing";

/** Nova chave no fim da lista (criar card/coluna). */
export function lexoPosition(after?: string | null): string {
  return generateKeyBetween(after ?? null, null);
}

/** Chave entre dois vizinhos (DnD). Fallback se chaves legadas (formato antigo) forem invalidas. */
export function positionBetween(before: string | null, after: string | null): string {
  try {
    return generateKeyBetween(before, after);
  } catch {
    return lexoPosition(before);
  }
}
