/**
 * Classes de layout Kanban — contrato anti-regressão do form "Adicionar".
 * Não usar overflow-y-hidden na row nem overflow-hidden na section da coluna:
 * com header/filtros densos a faixa Kanban fica baixa e o form era clipado.
 */
export const KANBAN_BOARD_REGION_CLASS =
  "flex min-h-56 flex-1 flex-col overflow-hidden";

export const KANBAN_COLUMNS_ROW_CLASS =
  "flex h-full min-h-56 items-start gap-4 overflow-x-auto overflow-y-auto pb-2";

export const KANBAN_COLUMN_SECTION_CLASS =
  "flex h-auto max-h-full min-h-0 w-72 shrink-0 flex-col rounded-xl border bg-board-surface/60 p-3 transition-colors";

export const KANBAN_COLUMN_CARDS_CLASS =
  "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto";

export const KANBAN_COLUMN_FORM_WRAP_CLASS =
  "mt-2 shrink-0 border-t border-board-border/50 pt-2";

/** Guards usados em testes — falham se alguém reintroduzir clip vertical. */
export function assertKanbanLayoutSafe(classes: {
  boardRegion: string;
  columnsRow: string;
  columnSection: string;
}): void {
  if (/\boverflow-y-hidden\b/.test(classes.columnsRow)) {
    throw new Error("kanban row: overflow-y-hidden clipa o form Adicionar");
  }
  if (/\boverflow-hidden\b/.test(classes.columnSection)) {
    throw new Error("kanban column: overflow-hidden clipa o form quando max-h < header+form");
  }
  if (!/\bmin-h-56\b/.test(classes.boardRegion) && !/\bmin-h-\[/.test(classes.boardRegion)) {
    throw new Error("kanban board region: falta min-h para reservar espaço ao form");
  }
}
