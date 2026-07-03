"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { createCard } from "@/app/(app)/boards/[boardId]/actions";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";

type Props = {
  boardId: string;
  columnId: string;
  onCardCreated?: (cardId: string, title: string) => void;
};

export function CreateCardForm({ boardId, columnId, onCardCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [optimisticTitle, addOptimisticTitle] = useOptimistic(title, (_current, next: string) => next);
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    const fd = new FormData(e.currentTarget);
    const submittedTitle = String(fd.get("title") ?? "").trim();
    if (!submittedTitle) return;

    submittingRef.current = true;

    startTransition(async () => {
      addOptimisticTitle("");
      setTitle("");
      try {
        const result = await createCard(fd);
        if ("error" in result) {
          setTitle(submittedTitle);
          setError(result.error);
          return;
        }
        onCardCreated?.(result.cardId, submittedTitle);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-2 space-y-2 ${pending ? "pointer-events-none opacity-60" : ""}`}
      data-testid="create-card-form"
    >
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      <input
        name="title"
        value={optimisticTitle}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Novo card"
        required
        disabled={pending}
        className={inputBoardClassSm}
      />
      <select name="priority" defaultValue="medium" disabled={pending} className={inputBoardClassSm}>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
        <option value="urgent">urgent</option>
      </select>
      <DatePickerPopover name="dueDate" variant="board" clearLabel="Limpar prazo" />
      <button type="submit" disabled={pending} className={`w-full ${btnBoardPrimarySm}`}>
        {pending ? "Adicionando..." : "Adicionar"}
      </button>
      {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
    </form>
  );
}
