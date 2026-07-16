"use client";

import { useQuery } from "@tanstack/react-query";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import { fetchBoardCards } from "@/lib/query/fetch-board-cards";
import type { BoardCard } from "@/components/board/types";

/** Store canônica de cards do board. Realtime só invalida — não espelha payload. */
export function useBoardCards(boardId: string, initialCards: BoardCard[]) {
  const query = useQuery({
    queryKey: boardCardsQueryKey(boardId),
    queryFn: () => fetchBoardCards(boardId),
    initialData: initialCards,
    staleTime: 15_000,
  });

  return {
    cards: query.data ?? initialCards,
    isFetching: query.isFetching,
    queryKey: boardCardsQueryKey(boardId),
  };
}
