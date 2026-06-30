"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChartGantt, Columns3, Table } from "lucide-react";
import { viewSwitcherBoardActiveClass } from "@/lib/ui-classes";
import type { BoardViewMode } from "./types";

const MODES: { id: BoardViewMode; label: string; icon: typeof Columns3 }[] = [
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "timeline", label: "Linha do tempo", icon: ChartGantt },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "table", label: "Tabela", icon: Table },
];

type Props = { value: BoardViewMode };

export function BoardViewSwitcher({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(mode: BoardViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "kanban") params.delete("view");
    else params.set("view", mode);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="flex w-full gap-2">
      {MODES.map(({ id, label, icon: Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition ${
              on
                ? viewSwitcherBoardActiveClass
                : "border border-board-border text-aurora-muted hover:bg-board-accent-muted/40 hover:text-aurora-fg"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
