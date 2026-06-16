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
