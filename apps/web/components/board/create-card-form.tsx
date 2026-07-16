"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { createCard } from "@/app/(app)/boards/[boardId]/card-actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import { cardInFlightLockKey } from "@/lib/board-item-names";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";

type Props = {
  boardId: string;
  columnId: string;
  parentId?: string;
  onCardCreated?: (cardId: string, title: string) => void;
  compact?: boolean;
};

export function CreateCardForm({ boardId, columnId, parentId, onCardCreated, compact }: Props) {
  const [pending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [optimisticTitle, addOptimisticTitle] = useOptimistic(title, (_current, next: string) => next);
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const blockedBeforeRef = submittingRef.current || pending || isSubmitting;
    if (blockedBeforeRef) return;

    setError(null);
    const fd = new FormData(e.currentTarget);
    const submittedTitle = String(fd.get("title") ?? "").trim();
    if (!submittedTitle) return;

    const lockKey = cardInFlightLockKey(boardId, columnId, submittedTitle);
    if (!acquireInFlightLock(lockKey)) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setTitle("");

    startTransition(async () => {
      addOptimisticTitle("");
      try {
        const result = await createCard(fd);
        if ("error" in result) {
          setTitle(submittedTitle);
          setError(result.error);
          return;
        }
        onCardCreated?.(result.cardId, submittedTitle);
      } finally {
        releaseInFlightLock(lockKey);
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    });
  }

  const disabled = pending || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-2 space-y-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}
      data-testid="create-card-form"
    >
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <input
        name="title"
        value={optimisticTitle}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (submittingRef.current || pending || isSubmitting)) {
            e.preventDefault();
          }
        }}
        placeholder={parentId ? "Nova subtarefa" : "Novo card"}
        required
        disabled={disabled}
        className={inputBoardClassSm}
        data-testid={parentId ? "create-child-title" : undefined}
      />
      {compact ? null : (
        <>
          <select name="priority" defaultValue="medium" disabled={disabled} className={inputBoardClassSm}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <DatePickerPopover name="dueDate" variant="board" clearLabel="Limpar prazo" />
        </>
      )}
      <button type="submit" disabled={disabled} className={`w-full ${btnBoardPrimarySm}`}>
        {disabled ? "Adicionando..." : parentId ? "Adicionar filho" : "Adicionar"}
      </button>
      {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
    </form>
  );
}

