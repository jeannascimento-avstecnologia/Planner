export const boardCardsQueryKey = (boardId: string) =>
  ["board", boardId, "cards"] as const;

export type BoardCardsQueryKey = ReturnType<typeof boardCardsQueryKey>;
