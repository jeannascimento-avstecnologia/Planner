"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";

const INVALIDATE_DEBOUNCE_MS = 75;
const BOARD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Realtime = notificação estreita → invalidate Query.
 * Não aplica payload.new como SoT.
 */
export function useBoardCardsRealtime(boardId: string, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const queryClient = useQueryClient();
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !boardId || !BOARD_ID_RE.test(boardId)) return;

    const invalidate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`board:${boardId}:cards`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          invalidate();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_tree_edges",
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          invalidate();
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [boardId, enabled, queryClient, supabase]);
}
