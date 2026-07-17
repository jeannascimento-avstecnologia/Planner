import type { AuditLogRow } from "@nextgen/contracts";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 ? id : null;
}

function setIfMissing(payload: Record<string, unknown>, key: string, value: string | null | undefined): void {
  if (value == null || value === "") return;
  const existing = payload[key];
  if (typeof existing === "string" && existing.trim()) return;
  payload[key] = value;
}

/** IDs coletados dos payloads/rows para resolucao de nomes legiveis. */
export function collectAuditLookupIds(rows: AuditLogRow[]): {
  userIds: string[];
  presetIds: string[];
  columnIds: string[];
  boardIds: string[];
  cardIds: string[];
} {
  const userIds = new Set<string>();
  const presetIds = new Set<string>();
  const columnIds = new Set<string>();
  const boardIds = new Set<string>();
  const cardIds = new Set<string>();

  for (const row of rows) {
    if (row.board_id) boardIds.add(row.board_id);
    if (row.card_id) cardIds.add(row.card_id);

    const p = row.payload;
    for (const key of ["user_id", "old_assignee_id", "new_assignee_id"] as const) {
      const id = asId(p[key]);
      if (id) userIds.add(id);
    }
    const presetId = asId(p.preset_id);
    if (presetId) presetIds.add(presetId);
    for (const key of ["from_column_id", "to_column_id", "column_id"] as const) {
      const id = asId(p[key]);
      if (id) columnIds.add(id);
    }
  }

  return {
    userIds: [...userIds],
    presetIds: [...presetIds],
    columnIds: [...columnIds],
    boardIds: [...boardIds],
    cardIds: [...cardIds],
  };
}

/** Mescla nomes resolvidos no payload sem sobrescrever campos ja presentes. */
export function mergeAuditDisplayNames(
  payload: Record<string, unknown>,
  maps: {
    users: Record<string, string>;
    presets: Record<string, string>;
    columns: Record<string, string>;
    boards: Record<string, string>;
    cards: Record<string, string>;
  },
  row: Pick<AuditLogRow, "board_id" | "card_id">,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };

  const userId = asId(out.user_id);
  if (userId) setIfMissing(out, "user_name", maps.users[userId]);

  const oldAssignee = asId(out.old_assignee_id);
  if (oldAssignee) setIfMissing(out, "old_assignee_name", maps.users[oldAssignee]);

  const newAssignee = asId(out.new_assignee_id);
  if (newAssignee) setIfMissing(out, "new_assignee_name", maps.users[newAssignee]);

  const presetId = asId(out.preset_id);
  if (presetId) setIfMissing(out, "preset_name", maps.presets[presetId]);

  const fromCol = asId(out.from_column_id);
  if (fromCol) setIfMissing(out, "from_column_name", maps.columns[fromCol]);

  const toCol = asId(out.to_column_id);
  if (toCol) setIfMissing(out, "to_column_name", maps.columns[toCol]);

  const columnId = asId(out.column_id);
  if (columnId) setIfMissing(out, "column_name", maps.columns[columnId]);

  if (row.board_id) setIfMissing(out, "board_name", maps.boards[row.board_id]);
  if (row.card_id) {
    setIfMissing(out, "card_title", maps.cards[row.card_id]);
    setIfMissing(out, "title", maps.cards[row.card_id]);
  }

  return out;
}

/** Resolve UUIDs do payload para nomes (profiles, presets, colunas, boards, cards). */
export async function enrichAuditPayloads(supabase: Supabase, rows: AuditLogRow[]): Promise<AuditLogRow[]> {
  if (rows.length === 0) return rows;

  const ids = collectAuditLookupIds(rows);
  const users: Record<string, string> = {};
  const presets: Record<string, string> = {};
  const columns: Record<string, string> = {};
  const boards: Record<string, string> = {};
  const cards: Record<string, string> = {};

  if (ids.userIds.length) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids.userIds);
    for (const p of data ?? []) {
      const name = p.full_name?.trim();
      if (name) users[p.id] = name;
    }
  }

  if (ids.presetIds.length) {
    const { data } = await supabase.from("access_presets").select("id, name").in("id", ids.presetIds);
    for (const p of data ?? []) {
      const name = p.name?.trim();
      if (name) presets[p.id] = name;
    }
  }

  if (ids.columnIds.length) {
    const { data } = await supabase.from("columns").select("id, name").in("id", ids.columnIds);
    for (const c of data ?? []) {
      const name = c.name?.trim();
      if (name) columns[c.id] = name;
    }
  }

  if (ids.boardIds.length) {
    const { data } = await supabase.from("boards").select("id, name").in("id", ids.boardIds);
    for (const b of data ?? []) {
      const name = b.name?.trim();
      if (name) boards[b.id] = name;
    }
  }

  if (ids.cardIds.length) {
    const { data } = await supabase.from("cards").select("id, title").in("id", ids.cardIds);
    for (const c of data ?? []) {
      const title = c.title?.trim();
      if (title) cards[c.id] = title;
    }
  }

  const maps = { users, presets, columns, boards, cards };
  return rows.map((row) => ({
    ...row,
    payload: mergeAuditDisplayNames(row.payload, maps, row),
  }));
}
