import { arrayMove } from "@dnd-kit/sortable";
import type { PlanGridRow } from "@/lib/plan/types";
import { normalizeWorkDateIso } from "@/lib/workload/work-date";

export function planRowSortKey(row: PlanGridRow): string {
  if (row.targetDate) return normalizeWorkDateIso(row.targetDate);
  const allocDates = Object.entries(row.cells)
    .filter(([, h]) => h > 0)
    .map(([d]) => d)
    .sort();
  return allocDates[0] ?? "9999-12-31";
}

export function sortPlanRowsBySchedule(rows: PlanGridRow[]): PlanGridRow[] {
  return [...rows].sort((a, b) => {
    const byDate = planRowSortKey(a).localeCompare(planRowSortKey(b));
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

export function buildInitialRowOrderByBoard(rows: PlanGridRow[]): Record<string, string[]> {
  const byBoard: Record<string, PlanGridRow[]> = {};
  for (const row of rows) {
    const list = byBoard[row.boardId] ?? [];
    list.push(row);
    byBoard[row.boardId] = list;
  }
  const order: Record<string, string[]> = {};
  for (const [boardId, boardRows] of Object.entries(byBoard)) {
    order[boardId] = sortPlanRowsBySchedule(boardRows).map((r) => r.cardId);
  }
  return order;
}

export function findBoardIdForCard(
  orderByBoard: Record<string, string[]>,
  cardId: string,
): string | null {
  for (const [boardId, ids] of Object.entries(orderByBoard)) {
    if (ids.includes(cardId)) return boardId;
  }
  return null;
}

export function reorderPlanRowsInBoard(
  orderByBoard: Record<string, string[]>,
  activeCardId: string,
  overCardId: string,
): Record<string, string[]> | null {
  const boardId = findBoardIdForCard(orderByBoard, activeCardId);
  if (!boardId || boardId !== findBoardIdForCard(orderByBoard, overCardId)) return null;

  const ids = orderByBoard[boardId] ?? [];
  const oldIndex = ids.indexOf(activeCardId);
  const newIndex = ids.indexOf(overCardId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null;

  return { ...orderByBoard, [boardId]: arrayMove(ids, oldIndex, newIndex) };
}

export function resortBoardOrderBySchedule(
  orderByBoard: Record<string, string[]>,
  rows: PlanGridRow[],
  boardId: string,
): Record<string, string[]> {
  const ids = orderByBoard[boardId] ?? [];
  const boardRows = ids
    .map((id) => rows.find((r) => r.cardId === id))
    .filter((r): r is PlanGridRow => r != null);
  return {
    ...orderByBoard,
    [boardId]: sortPlanRowsBySchedule(boardRows).map((r) => r.cardId),
  };
}

export function appendCardToBoardOrder(
  orderByBoard: Record<string, string[]>,
  boardId: string,
  cardId: string,
): Record<string, string[]> {
  const ids = orderByBoard[boardId] ?? [];
  if (ids.includes(cardId)) return orderByBoard;
  return { ...orderByBoard, [boardId]: [...ids, cardId] };
}
