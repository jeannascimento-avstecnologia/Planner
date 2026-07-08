const KEY = "ngp:recent-boards";
const MAX = 5;

export type RecentBoard = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  visitedAt: number;
};

export type BoardMeta = {
  name: string;
  icon: string | null;
  color: string | null;
};

function normalizeEntry(raw: RecentBoard): RecentBoard {
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon ?? null,
    color: raw.color ?? null,
    visitedAt: raw.visitedAt,
  };
}

export function getRecentBoards(): RecentBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentBoard[];
    return parsed.map(normalizeEntry);
  } catch {
    return [];
  }
}

export function pushRecentBoard(
  id: string,
  name: string,
  meta?: { icon?: string | null; color?: string | null },
): void {
  if (typeof window === "undefined") return;
  const list = getRecentBoards().filter((b) => b.id !== id);
  list.unshift({
    id,
    name,
    icon: meta?.icon ?? null,
    color: meta?.color ?? null,
    visitedAt: Date.now(),
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new Event("ngp:recent-boards"));
}

export function removeRecentBoard(id: string): void {
  if (typeof window === "undefined") return;
  const list = getRecentBoards().filter((b) => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("ngp:recent-boards"));
}

/** Remove entradas de projetos que o usuario nao acessa mais (excluidos ou sem permissao). */
export function pruneRecentBoards(validIds: readonly string[]): number {
  if (typeof window === "undefined") return 0;
  const valid = new Set(validIds);
  const before = getRecentBoards();
  const list = before.filter((b) => valid.has(b.id));
  if (list.length === before.length) return 0;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("ngp:recent-boards"));
  return before.length - list.length;
}

export function enrichRecentBoards(
  items: RecentBoard[],
  boardMetaById: Record<string, BoardMeta>,
): RecentBoard[] {
  return items.map((b) => {
    const meta = boardMetaById[b.id];
    if (!meta) return b;
    return {
      ...b,
      name: meta.name || b.name,
      icon: meta.icon ?? b.icon ?? null,
      color: meta.color ?? b.color ?? null,
    };
  });
}
