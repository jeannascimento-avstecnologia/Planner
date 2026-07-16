"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
} from "@/app/(app)/boards/[boardId]/card-actions";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  applyChecklistAddToList,
  applyChecklistRemoveToList,
  applyChecklistToggleToList,
} from "@/lib/query/board-cards-cache";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { BoardCard, CardChecklistItem } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  items: CardChecklistItem[];
  canEdit: boolean;
  compact?: boolean;
  collapsed?: boolean;
};

export function ChecklistEditor({
  cardId,
  boardId,
  items,
  canEdit,
  compact = false,
  collapsed = false,
}: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(!collapsed);
  const key = boardCardsQueryKey(boardId);

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const title = draft.trim();
    if (!title || !canEdit) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(
        key,
        applyChecklistAddToList(previous, cardId, {
          id: tempId,
          title,
          done: false,
          position: "tmp",
        }),
      );
    }
    setDraft("");
    startTransition(async () => {
      const result = await createChecklistItemAction({ cardId, title });
      if ("error" in result) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
      appToast.success("To-do adicionado");
    });
  }

  function toggle(item: CardChecklistItem) {
    if (!canEdit) return;
    const nextDone = !item.done;
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyChecklistToggleToList(previous, cardId, item.id, nextDone));
    }
    startTransition(async () => {
      const result = await toggleChecklistItemAction({ itemId: item.id, done: nextDone });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  function remove(itemId: string) {
    if (!canEdit) return;
    const previous = queryClient.getQueryData<BoardCard[]>(key);
    if (previous) {
      queryClient.setQueryData(key, applyChecklistRemoveToList(previous, cardId, itemId));
    }
    startTransition(async () => {
      const result = await deleteChecklistItemAction({ itemId });
      if (!result.ok) {
        if (previous) queryClient.setQueryData(key, previous);
        appToast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }

  const doneCount = items.filter((i) => i.done).length;

  if (collapsed) {
    return (
      <div data-testid={`checklist-${cardId}`} className="nodrag nopan">
        <button
          type="button"
          className="text-xs text-aurora-muted hover:text-aurora-fg"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {items.length === 0 ? "Sem to-dos" : `${doneCount}/${items.length} to-dos`}
        </button>
        {open ? (
          <ChecklistBody
            cardId={cardId}
            items={items}
            canEdit={canEdit}
            compact={compact}
            pending={pending}
            draft={draft}
            setDraft={setDraft}
            onAdd={addItem}
            onToggle={toggle}
            onRemove={remove}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid={`checklist-${cardId}`} className="nodrag nopan">
      <ChecklistBody
        cardId={cardId}
        items={items}
        canEdit={canEdit}
        compact={compact}
        pending={pending}
        draft={draft}
        setDraft={setDraft}
        onAdd={addItem}
        onToggle={toggle}
        onRemove={remove}
      />
    </div>
  );
}

function ChecklistBody({
  cardId,
  items,
  canEdit,
  compact,
  pending,
  draft,
  setDraft,
  onAdd,
  onToggle,
  onRemove,
}: {
  cardId: string;
  items: CardChecklistItem[];
  canEdit: boolean;
  compact: boolean;
  pending: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
  onToggle: (item: CardChecklistItem) => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-start gap-1.5" data-testid={`checklist-item-${item.id}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.done ? `Desmarcar ${item.title}` : `Marcar ${item.title} como feito`}
              disabled={!canEdit || pending}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                item.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-board-border bg-aurora-surface text-transparent hover:border-emerald-500/60"
              } disabled:opacity-50`}
              data-testid={`checklist-toggle-${item.id}`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
            <span
              className={`min-w-0 flex-1 text-xs leading-snug ${
                item.done ? "text-aurora-muted line-through" : "text-aurora-fg"
              }`}
            >
              {item.title}
            </span>
            {canEdit ? (
              <button
                type="button"
                aria-label="Excluir to-do"
                className="shrink-0 rounded p-0.5 text-aurora-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form
          onSubmit={onAdd}
          className="flex items-center gap-1"
          data-testid={`checklist-add-${cardId}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Adicionar to-do"
            maxLength={200}
            className={`min-w-0 flex-1 ${inputBoardClassSm}`}
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="Adicionar to-do"
            className="rounded p-1 text-aurora-muted hover:bg-board-accent-muted/40 hover:text-aurora-fg disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
