"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Send, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCardCommentAction,
  deleteCardCommentAction,
  updateCardCommentAction,
} from "@/app/(app)/boards/[boardId]/card-actions";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  applyCommentAddToList,
  applyCommentRemoveToList,
  applyCommentUpdateToList,
} from "@/lib/query/board-cards-cache";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { useAuthUserId } from "@/hooks/use-auth-user-id";
import type { BoardCard, CardComment, ProfileRow } from "./types";
import { memberLabel } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  comments: CardComment[];
  members: ProfileRow[];
  currentUserId: string | null;
  canComment: boolean;
};

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CardComments({
  cardId,
  boardId,
  comments,
  members,
  currentUserId: propUserId,
  canComment,
}: Props) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthUserId(propUserId);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const key = boardCardsQueryKey(boardId);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  function authorName(authorId: string): string {
    return memberLabel(membersById.get(authorId));
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !canComment || !currentUserId) return;

    const tempId = `tmp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(
        key,
        applyCommentAddToList(previous, cardId, {
          id: tempId,
          authorId: currentUserId,
          content,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    setDraft("");
    startTransition(async () => {
      const result = await createCardCommentAction({ cardId, content });
      if ("error" in result) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
      appToast.success("Comentario adicionado");
    });
  }

  function startEdit(comment: CardComment) {
    setEditingId(comment.id);
    setEditDraft(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function saveEdit(commentId: string) {
    const content = editDraft.trim();
    if (!content) return;
    const now = new Date().toISOString();
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyCommentUpdateToList(previous, cardId, commentId, content, now));
    }
    setEditingId(null);
    setEditDraft("");
    startTransition(async () => {
      const result = await updateCardCommentAction({ commentId, content });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  function removeComment(commentId: string) {
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyCommentRemoveToList(previous, cardId, commentId));
    }
    startTransition(async () => {
      const result = await deleteCardCommentAction({ commentId });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  return (
    <div data-testid={`card-comments-${cardId}`} className="nodrag nopan space-y-2">
      {comments.length === 0 ? (
        <p className="text-xs text-aurora-muted">Nenhum comentario ainda.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const isOwn = currentUserId === comment.authorId;
            const isEditing = editingId === comment.id;
            return (
              <li
                key={comment.id}
                className="rounded-md border border-board-border px-2.5 py-2"
                data-testid={`card-comment-${comment.id}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-aurora-fg">
                    {authorName(comment.authorId)}
                  </span>
                  <span className="shrink-0 text-[10px] text-aurora-muted">
                    {formatCommentDate(comment.createdAt)}
                  </span>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      className={inputBoardClassSm}
                      disabled={pending}
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-aurora-accent hover:bg-aurora-accent-muted/30"
                        disabled={pending || !editDraft.trim()}
                        onClick={() => saveEdit(comment.id)}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-aurora-muted hover:bg-board-accent-muted/30"
                        disabled={pending}
                        onClick={cancelEdit}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-snug text-aurora-fg">{comment.content}</p>
                )}
                {isOwn && !isEditing ? (
                  <div className="mt-1.5 flex gap-1">
                    <button
                      type="button"
                      aria-label="Editar comentario"
                      className="rounded p-0.5 text-aurora-muted hover:text-aurora-fg"
                      disabled={pending}
                      onClick={() => startEdit(comment)}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir comentario"
                      className="rounded p-0.5 text-aurora-muted hover:text-red-500"
                      disabled={pending}
                      onClick={() => removeComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={submitComment} className="flex items-end gap-1.5" data-testid={`card-comment-add-${cardId}`}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva um comentario..."
            rows={2}
            maxLength={5000}
            className={`min-w-0 flex-1 ${inputBoardClassSm}`}
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="Enviar comentario"
            className="mb-0.5 rounded p-1.5 text-aurora-accent hover:bg-aurora-accent-muted/30 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
