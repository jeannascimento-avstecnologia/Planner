"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateColumn } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm } from "@/lib/ui-classes";

type Props = {
  boardId: string;
  columnId: string;
  name: string;
  cardCount: number;
  canRename: boolean;
};

export function ColumnHeader({ boardId, columnId, name, cardCount, canRename }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function save(nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === name) return;
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("columnId", columnId);
    fd.set("name", trimmed);
    startTransition(async () => {
      await updateColumn(fd);
      router.refresh();
    });
  }

  if (!canRename) {
    return (
      <header className="mb-2 flex items-center justify-between rounded-md px-1 py-0.5 transition hover:bg-board-accent-muted/25">
        <h3 className="text-sm font-semibold">{name}</h3>
        <span className="text-xs text-aurora-muted">{cardCount}</span>
      </header>
    );
  }

  return (
    <header className="group/col mb-2 flex items-center gap-1">
      <input
        ref={inputRef}
        key={name}
        defaultValue={name}
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
      <span className="shrink-0 text-xs text-aurora-muted">{cardCount}</span>
    </header>
  );
}
