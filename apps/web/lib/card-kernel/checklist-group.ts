export type ChecklistItemRow = {
  id: string;
  card_id: string;
  title: string;
  done: boolean;
  position: string;
};

export type CardChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  position: string;
};

/** Agrupa rows batch (ordenadas por position) em mapa card_id → items. */
export function groupChecklistItemsByCard(
  rows: ChecklistItemRow[],
): Map<string, CardChecklistItem[]> {
  const map = new Map<string, CardChecklistItem[]>();
  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      done: row.done,
      position: row.position,
    });
    map.set(row.card_id, list);
  }
  return map;
}
