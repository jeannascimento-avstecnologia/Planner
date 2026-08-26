export type CardAttachmentRow = {
  id: string;
  card_id: string;
  kind: string;
  url: string;
  label: string | null;
  created_by: string;
  created_at: string;
};

export type CardAttachment = {
  id: string;
  kind: "url";
  url: string;
  label: string | null;
  createdBy: string;
  createdAt: string;
};

export function groupAttachmentsByCard(rows: CardAttachmentRow[]): Map<string, CardAttachment[]> {
  const map = new Map<string, CardAttachment[]>();
  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    list.push({
      id: row.id,
      kind: "url",
      url: row.url,
      label: row.label,
      createdBy: row.created_by,
      createdAt: row.created_at,
    });
    map.set(row.card_id, list);
  }
  return map;
}
