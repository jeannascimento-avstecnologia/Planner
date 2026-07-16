"use client";

import { Calendar, ChartGantt, Columns3, ListTree, Table } from "lucide-react";
import type { BoardViewMode } from "./types";

type ModeTheme = {
  id: BoardViewMode;
  label: string;
  icon: typeof Columns3;
  /** Ativo: fill sólido + texto branco */
  activeClass: string;
  /** Inativo: borda/texto na cor-tema */
  idleClass: string;
};

/** Ordem e cor-tema únicos por modo (tokens Aurora / board). */
const MODES: ModeTheme[] = [
  {
    id: "kanban",
    label: "Kanban",
    icon: Columns3,
    activeClass: "border-board-accent bg-board-accent text-white shadow-sm",
    idleClass:
      "border-board-accent/50 text-board-accent hover:bg-board-accent/15 hover:border-board-accent",
  },
  {
    id: "tree",
    label: "Arvore",
    icon: ListTree,
    activeClass: "border-aurora-success bg-aurora-success text-white shadow-sm",
    idleClass:
      "border-aurora-success/50 text-aurora-success hover:bg-aurora-success/15 hover:border-aurora-success",
  },
  {
    id: "timeline",
    label: "Linha do tempo",
    icon: ChartGantt,
    activeClass: "border-aurora-warning bg-aurora-warning text-white shadow-sm",
    idleClass:
      "border-aurora-warning/50 text-aurora-warning hover:bg-aurora-warning/15 hover:border-aurora-warning",
  },
  {
    id: "table",
    label: "Tabela",
    icon: Table,
    activeClass: "border-aurora-info bg-aurora-info text-white shadow-sm",
    idleClass:
      "border-aurora-info/50 text-aurora-info hover:bg-aurora-info/15 hover:border-aurora-info",
  },
  {
    id: "calendar",
    label: "Calendario",
    icon: Calendar,
    activeClass: "border-aurora-brand bg-aurora-brand text-white shadow-sm",
    idleClass:
      "border-aurora-brand/50 text-aurora-brand hover:bg-aurora-brand/15 hover:border-aurora-brand",
  },
];

type Props = {
  value: BoardViewMode;
  onChange: (mode: BoardViewMode) => void;
};

export function BoardViewSwitcher({ value, onChange }: Props) {
  function setView(mode: BoardViewMode) {
    if (value === mode) return;
    onChange(mode);
  }

  return (
    <div className="flex w-full gap-1 sm:gap-2" role="tablist" aria-label="Modo de visualizacao">
      {MODES.map(({ id, label, icon: Icon, activeClass, idleClass }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setView(id)}
            aria-label={label}
            data-view-mode={id}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-2 text-sm font-medium transition sm:gap-1.5 sm:px-3 ${
              on ? activeClass : idleClass
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden truncate sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
