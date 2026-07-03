"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { deleteColumn, updateColumn } from "@/app/(app)/boards/[boardId]/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  boardId: string;
  columnId: string;
  name: string;
  cardCount: number;
  canRename: boolean;
  canDelete: boolean;
};

export function ColumnHeader({
  boardId,
  columnId,
  name,
  cardCount,
  canRename,
  canDelete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(name);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setDisplayName(name);
  }, [name]);

  function save(nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === displayName) return;
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("columnId", columnId);
    fd.set("name", trimmed);
    startTransition(async () => {
      await updateColumn(fd);
      setDisplayName(trimmed);
    });
  }

  function confirmDelete() {
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("columnId", columnId);
    startTransition(async () => {
      const result = await deleteColumn(fd);
      if ("error" in result) {
        appToast.error(result.error);
        return;
      }
      setDeleteOpen(false);
      appToast.success("Coluna excluida");
    });
  }

  function deleteMessage(): string {
    const base = `Excluir a coluna "${displayName}"? Esta acao nao pode ser desfeita.`;
    if (cardCount === 0) return base;
    return `${base} Isso remove permanentemente ${cardCount} card(s) nesta coluna.`;
  }

  if (!canRename && !canDelete) {
    return (
      <header className="mb-2 flex items-center justify-between rounded-md px-1 py-0.5 transition hover:bg-board-accent-muted/25">
        <h3 className="text-sm font-semibold">{displayName}</h3>
        <span className="text-xs text-aurora-muted">{cardCount}</span>
      </header>
    );
  }

  return (
    <>
      <header className="group/col mb-2 flex items-center gap-1">
        {canRename ? (
          <input
            ref={inputRef}
            key={displayName}
            defaultValue={displayName}
            aria-label="Nome da coluna"
            disabled={pending}
            className={`${inputBoardClassSm} min-w-0 flex-1 text-sm font-semibold`}
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                e.currentTarget.value = name;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <h3 className="min-w-0 flex-1 text-sm font-semibold">{displayName}</h3>
        )}
        {canRename ? (
          <button
            type="button"
            title="Renomear coluna"
            aria-label="Renomear coluna"
            disabled={pending}
            onClick={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
            className="shrink-0 rounded p-0.5 text-aurora-muted opacity-0 transition hover:text-aurora-fg group-hover/col:opacity-100 disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            title="Excluir coluna"
            aria-label="Excluir coluna"
            data-testid={`delete-column-${columnId}`}
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
            className="shrink-0 rounded p-0.5 text-aurora-muted transition hover:text-aurora-danger disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <span className="shrink-0 text-xs text-aurora-muted">{cardCount}</span>
      </header>
      <ConfirmDialog
        open={deleteOpen}
        title="Excluir coluna"
        message={deleteMessage()}
        confirmLabel="Excluir"
        pending={pending}
        variant="board"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
