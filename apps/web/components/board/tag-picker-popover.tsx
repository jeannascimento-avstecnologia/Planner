"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { attachTag, createTag, detachTag } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimarySm, TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import { TagChip } from "./badges";
import type { TagRow } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  orgId: string;
  tagIds: string[];
  tags: TagRow[];
};

export function TagPickerPopover({ cardId, boardId, orgId, tagIds, tags }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const attached = tags.filter((t) => tagIds.includes(t.id));

  function toggleTag(tagId: string, isAttached: boolean) {
    const fd = new FormData();
    fd.set("cardId", cardId);
    fd.set("boardId", boardId);
    fd.set("tagId", tagId);
    startTransition(() => (isAttached ? detachTag(fd) : attachTag(fd)));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {attached.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-0.5">
            <TagChip tag={t} />
            <button
              type="button"
              aria-label={`Remover ${t.name}`}
              disabled={pending}
              onClick={() => toggleTag(t.id, true)}
              className="rounded-full p-0.5 text-aurora-muted hover:bg-board-accent-muted hover:text-aurora-fg"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-aurora-muted text-aurora-muted hover:border-board-accent hover:text-board-accent"
            aria-label="Adicionar marcador"
          >
            <Plus className="h-4 w-4" />
          </button>

          {open ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-board-border bg-board-surface p-2 shadow-lg">
              <p className="mb-2 text-xs font-medium text-aurora-muted">Marcadores</p>
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {tags.length === 0 ? (
                  <li className="text-xs text-aurora-muted">Nenhum marcador na org.</li>
                ) : (
                  tags.map((t) => {
                    const on = tagIds.includes(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => toggleTag(t.id, on)}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-board-accent-muted/50 ${on ? "ring-1 ring-board-accent" : ""}`}
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-aurora-fg">{t.name}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <form
                action={(fd) => startTransition(() => createTag(fd))}
                className="mt-2 flex gap-1 border-t border-board-border pt-2"
                onSubmit={() => setOpen(false)}
              >
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="boardId" value={boardId} />
                <input name="name" placeholder="Novo" required className={inputBoardClassSm + " flex-1"} />
                <input
                  type="color"
                  name="color"
                  defaultValue={TAG_DEFAULT_COLORS[0]}
                  className="h-8 w-8 cursor-pointer rounded border border-board-border"
                />
                <button type="submit" className={btnBoardPrimarySm} disabled={pending}>
                  +
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
