"use client";

import { useEffect, useRef, useState } from "react";
import { updateBoardAppearance } from "@/app/(app)/boards/actions";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { btnBoardPrimarySm, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { DEFAULT_BOARD_ICON } from "@/lib/icon-catalog";
import { BoardIcon } from "./board-icon";

type Props = { boardId: string; icon: string | null; color: string | null };

export function BoardAppearanceEditor({ boardId, icon, color }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Aparencia do projeto"
        aria-label="Aparencia do projeto"
        className="rounded-lg p-0.5 hover:bg-board-accent-muted"
      >
        <BoardIcon icon={icon} color={color} size="sm" />
      </button>

      {open ? (
        <form
          action={updateBoardAppearance}
          onSubmit={() => setOpen(false)}
          className="absolute right-0 top-full z-50 mt-1 w-64 space-y-3 rounded-lg border border-board-border bg-board-surface p-3 shadow-lg"
        >
          <input type="hidden" name="boardId" value={boardId} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-aurora-muted">Icone</label>
            <IconPicker name="icon" defaultValue={icon ?? DEFAULT_BOARD_ICON} color={color ?? undefined} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-aurora-muted">Cor</label>
            <ColorPicker name="color" defaultValue={color ?? DEFAULT_BOARD_COLOR} />
          </div>
          <button type="submit" className={`w-full ${btnBoardPrimarySm}`}>
            Salvar aparencia
          </button>
        </form>
      ) : null}
    </div>
  );
}
