import type { BoardCard } from "@/components/board/types";

/** Optimistic move O(1) no cache Query — não reordena a lista inteira além do patch. */
export function applyCardMoveToList(
  cards: BoardCard[],
  cardId: string,
  columnId: string,
  position: string,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) return cards;

  const card = cards[index]!;
  if (card.column_id === columnId && card.position === position) return cards;

  const next = cards.slice();
  next[index] = { ...card, column_id: columnId, position };
  return next;
}

/** Optimistic reparent O(1) — parent_id + optional fractional position. */
export function applyCardReparentToList(
  cards: BoardCard[],
  cardId: string,
  parentId: string | null,
  position?: string,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) return cards;

  const card = cards[index]!;
  if (
    card.parent_id === parentId &&
    (position === undefined || card.position === position)
  ) {
    return cards;
  }

  const next = cards.slice();
  next[index] = {
    ...card,
    parent_id: parentId,
    ...(position !== undefined ? { position } : {}),
  };
  return next;
}

/** Optimistic checklist toggle O(n items do card). */
export function applyChecklistToggleToList(
  cards: BoardCard[],
  cardId: string,
  itemId: string,
  done: boolean,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) return cards;
  const card = cards[index]!;
  const items = card.checklistItems;
  const itemIndex = items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) return cards;
  if (items[itemIndex]!.done === done) return cards;
  const nextItems = items.slice();
  nextItems[itemIndex] = { ...items[itemIndex]!, done };
  const next = cards.slice();
  next[index] = { ...card, checklistItems: nextItems };
  return next;
}

/** Optimistic add checklist item. */
export function applyChecklistAddToList(
  cards: BoardCard[],
  cardId: string,
  item: { id: string; title: string; done: boolean; position: string },
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) return cards;
  const card = cards[index]!;
  if (card.checklistItems.some((i) => i.id === item.id)) return cards;
  const next = cards.slice();
  next[index] = { ...card, checklistItems: [...card.checklistItems, item] };
  return next;
}

/** Optimistic remove checklist item. */
export function applyChecklistRemoveToList(
  cards: BoardCard[],
  cardId: string,
  itemId: string,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) return cards;
  const card = cards[index]!;
  if (!card.checklistItems.some((i) => i.id === itemId)) return cards;
  const next = cards.slice();
  next[index] = {
    ...card,
    checklistItems: card.checklistItems.filter((i) => i.id !== itemId),
  };
  return next;
}

/** Optimistic add tree parent link (multi-pai). */
export function applyTreeLinkToList(
  cards: BoardCard[],
  childId: string,
  parentId: string,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === childId);
  if (index === -1) return cards;
  const card = cards[index]!;
  // Union treeParentIds ∪ parent_id — evita 2º link apagar seed legado (treeParentIds=[]).
  const parents = new Set(card.treeParentIds ?? []);
  if (card.parent_id) parents.add(card.parent_id);
  if (parents.has(parentId)) return cards;
  parents.add(parentId);
  const next = cards.slice();
  next[index] = {
    ...card,
    treeParentIds: [...parents],
    // Connect = edge only (ADR-0014); não promove a subtarefa Kanban.
  };
  return next;
}

/** Optimistic remove tree parent link. */
export function applyTreeUnlinkToList(
  cards: BoardCard[],
  childId: string,
  parentId: string,
): BoardCard[] {
  const index = cards.findIndex((card) => card.id === childId);
  if (index === -1) return cards;
  const card = cards[index]!;
  // Union igual ao link — treeParentIds=[] não pode esconder parent_id no unlink.
  const parents = new Set(card.treeParentIds ?? []);
  if (card.parent_id) parents.add(card.parent_id);
  parents.delete(parentId);
  const remaining = [...parents];
  const next = cards.slice();
  // Limpa parent_id se era este pai — evita resolveTreeParentIds (union) re-semear a aresta.
  const clearedParent =
    card.parent_id === parentId ? (remaining[0] ?? null) : card.parent_id;
  next[index] = {
    ...card,
    treeParentIds: remaining,
    parent_id: clearedParent,
  };
  return next;
}

/** Durante drag/mutation local, Realtime/RSC não devem resetar o layout Kanban. */
export function shouldIgnoreRemoteCardsSync(opts: {
  isDragging: boolean;
  isMutating: boolean;
}): boolean {
  return opts.isDragging || opts.isMutating;
}
