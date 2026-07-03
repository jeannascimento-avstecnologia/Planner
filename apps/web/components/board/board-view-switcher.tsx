"use client";

import { Calendar, ChartGantt, Columns3, Table } from "lucide-react";
import { viewSwitcherBoardActiveClass } from "@/lib/ui-classes";
import type { BoardViewMode } from "./types";

const MODES: { id: BoardViewMode; label: string; icon: typeof Columns3 }[] = [
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "timeline", label: "Linha do tempo", icon: ChartGantt },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "table", label: "Tabela", icon: Table },
];

type Props = {
  value: BoardViewMode;
  onChange: (mode: BoardViewMode) => void;
};

export function BoardViewSwitcher({ value, onChange }: Props) {
  function setView(mode: BoardViewMode) {
    if (value === mode) {
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "post-fix-v2",
          hypothesisId: "B",
          location: "board-view-switcher.tsx:setView",
          message: "setView skipped (already active)",
          data: { mode },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "post-fix-v2",
        hypothesisId: "B",
        location: "board-view-switcher.tsx:setView",
        message: "setView client-only",
        data: { from: value, to: mode },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    onChange(mode);
  }

  return (
    <div className="flex w-full gap-1 sm:gap-2">
      {MODES.map(({ id, label, icon: Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-label={label}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-2 text-sm font-medium transition sm:gap-1.5 sm:px-3 ${
              on
                ? viewSwitcherBoardActiveClass
                : "border border-board-border text-aurora-muted hover:bg-board-accent-muted/40 hover:text-aurora-fg"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
