/** Normaliza nome de card/coluna para comparacao case-insensitive no board. */
export function normalizeBoardItemName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function cardInFlightLockKey(boardId: string, columnId: string, title: string): string {
  return `card:${boardId}:${columnId}:${normalizeBoardItemName(title)}`;
}

export function columnInFlightLockKey(boardId: string, name: string): string {
  return `column:${boardId}:${normalizeBoardItemName(name)}`;
}
