"use client";

import { useEffect, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCardDeleteImpact } from "@/app/(app)/boards/[boardId]/card-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buildCardDeleteConfirmMessage, type CardDeleteImpact } from "@/lib/card-delete-message";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import { appToast } from "@/lib/toast";
import type { BoardCard } from "./types";

type Options = {
  boardId: string;
  cardId: string;
  enabled?: boolean;
  onSuccess?: () => void;
};

export function useCardDeleteConfirm({ boardId, cardId, enabled = true, onSuccess }: Options) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<CardDeleteImpact | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled || !open) {
      setImpact(null);
      return;
    }
    let cancelled = false;
    void getCardDeleteImpact(cardId, boardId).then((next) => {
      if (!cancelled) setImpact(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, open, cardId, boardId]);

  function requestDelete() {
    if (!enabled) return;
    setError(null);
    setOpen(true);
  }

  function confirmDelete() {
    setError(null);
    const key = boardCardsQueryKey(boardId);
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    queryClient.setQueryData<BoardCard[]>(key, (curr) =>
      (curr ?? []).filter((c) => c.id !== cardId),
    );
    startTransition(async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
        if (!res.ok) {
          if (previous) queryClient.setQueryData(key, previous);
          const err = body.error ?? "Nao foi possivel excluir o card.";
          setError(err);
          appToast.error(err);
          return;
        }
        setOpen(false);
        appToast.success("Card excluido");
        void queryClient.invalidateQueries({ queryKey: key });
        onSuccess?.();
      } catch {
        if (previous) queryClient.setQueryData(key, previous);
        const msg = "Nao foi possivel excluir o card.";
        setError(msg);
        appToast.error(msg);
      }
    });
  }

  const dialog = (
    <ConfirmDialog
      open={open}
      title="Excluir card"
      message={buildCardDeleteConfirmMessage(impact)}
      confirmLabel="Excluir"
      pending={pending}
      variant="board"
      onConfirm={confirmDelete}
      onCancel={() => setOpen(false)}
    />
  );

  return {
    open,
    setOpen,
    error,
    pending,
    requestDelete,
    confirmDelete,
    dialog,
  };
}
