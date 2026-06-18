"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCard } from "@/app/(app)/boards/[boardId]/actions";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";

type Props = {
  boardId: string;
  columnId: string;
};

export function CreateCardForm({ boardId, columnId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCard(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Novo card"
        required
        className={inputBoardClassSm}
      />
      <select name="priority" defaultValue="medium" className={inputBoardClassSm}>
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
