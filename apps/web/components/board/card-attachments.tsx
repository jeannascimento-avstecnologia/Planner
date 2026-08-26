"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCardAttachmentAction,
  deleteCardAttachmentAction,
} from "@/app/(app)/boards/[boardId]/card-actions";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  applyAttachmentAddToList,
  applyAttachmentRemoveToList,
} from "@/lib/query/board-cards-cache";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { useAuthUserId } from "@/hooks/use-auth-user-id";
import type { BoardCard, CardAttachment } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  attachments: CardAttachment[];
  currentUserId: string | null;
  canManage: boolean;
};

function displayLabel(attachment: CardAttachment): string {
  return attachment.label?.trim() || attachment.url;
}

export function CardAttachments({
  cardId,
  boardId,
  attachments,
  currentUserId: propUserId,
  canManage,
}: Props) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthUserId(propUserId);
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const key = boardCardsQueryKey(boardId);

  function addAttachment(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !canManage || !currentUserId) return;

    const tempId = `tmp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(
        key,
        applyAttachmentAddToList(previous, cardId, {
          id: tempId,
          kind: "url",
          url: trimmedUrl,
          label: label.trim() || null,
          createdBy: currentUserId,
          createdAt: now,
        }),
      );
    }
    setUrl("");
    setLabel("");
    startTransition(async () => {
      const result = await createCardAttachmentAction({
        cardId,
        url: trimmedUrl,
        label: label.trim() || undefined,
      });
      if ("error" in result) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
      appToast.success("Link anexado");
    });
  }

  function removeAttachment(attachmentId: string) {
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyAttachmentRemoveToList(previous, cardId, attachmentId));
    }
    startTransition(async () => {
      const result = await deleteCardAttachmentAction({ attachmentId });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  return (
    <div data-testid={`card-attachments-${cardId}`} className="nodrag nopan space-y-2">
      {attachments.length === 0 ? (
        <p className="text-xs text-aurora-muted">Nenhum anexo.</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="group flex items-center gap-2 rounded-md border border-board-border px-2 py-1.5"
              data-testid={`card-attachment-${attachment.id}`}
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-aurora-muted" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-aurora-accent hover:underline"
              >
                {displayLabel(attachment)}
              </a>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir link"
                className="shrink-0 text-aurora-muted hover:text-aurora-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {canManage ? (
                <button
                  type="button"
                  aria-label="Remover anexo"
                  className="shrink-0 rounded p-0.5 text-aurora-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                  disabled={pending}
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form onSubmit={addAttachment} className="space-y-1.5" data-testid={`card-attachment-add-${cardId}`}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className={inputBoardClassSm}
            disabled={pending}
          />
          <div className="flex items-center gap-1">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Titulo (opcional)"
              maxLength={200}
              className={`min-w-0 flex-1 ${inputBoardClassSm}`}
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !url.trim()}
              aria-label="Anexar link"
              className="rounded p-1.5 text-aurora-muted hover:bg-board-accent-muted/40 hover:text-aurora-fg disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
