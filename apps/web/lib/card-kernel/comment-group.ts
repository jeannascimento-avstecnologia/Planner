export type CardCommentRow = {
  id: string;
  card_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CardComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function groupCommentsByCard(rows: CardCommentRow[]): Map<string, CardComment[]> {
  const map = new Map<string, CardComment[]>();
  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    list.push({
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    map.set(row.card_id, list);
  }
  return map;
}
