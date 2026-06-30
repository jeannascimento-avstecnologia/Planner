const KEY = "ngp:recent-boards";
const MAX = 5;

export type RecentBoard = { id: string; name: string; visitedAt: number };

export function getRecentBoards(): RecentBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentBoard[];
  } catch {
    return [];
  }
}

export function pushRecentBoard(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const list = getRecentBoards().filter((b) => b.id !== id);
  list.unshift({ id, name, visitedAt: Date.now() });
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
