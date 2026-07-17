"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createColumn } from "@/app/(app)/boards/[boardId]/actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import { columnInFlightLockKey } from "@/lib/board-item-names";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { ColumnHeader } from "./column-header";
import { CreateCardForm } from "./create-card-form";
import { SortableCardTile } from "./sortable-card-tile";
import { countChildrenProgress } from "@/lib/card-tree";
import {
  KANBAN_COLUMN_CARDS_CLASS,
  KANBAN_COLUMN_FORM_WRAP_CLASS,
  KANBAN_COLUMN_SECTION_CLASS,
} from "@/lib/kanban-layout";
import type { BoardCard, ColumnRow, ProfileRow, StageRow, TagRow } from "./types";

type Props = {
  boardId: string;
  column: ColumnRow;
  columns: ColumnRow[];
  cardIds: string[];
  cardsById: Map<string, BoardCard>;
  allCards: BoardCard[];
  stagesById: Map<string, StageRow>;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  canEditBoard: boolean;
  canRenameColumns: boolean;
  readOnlyTiflux: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
  onCardCreated?: (cardId: string, title: string, columnId: string) => void;
};

export function KanbanColumn({
  boardId,
  column,
  columns,
  cardIds,
  cardsById,
  allCards,
  stagesById,
  tags,
  profilesById,
  tifluxEnabled,
  canEditBoard,
  canRenameColumns,
  readOnlyTiflux,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  onCardCreated,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // #region agent log
  useEffect(() => {
    const colEl = document.querySelector(`[data-testid="kanban-column-${column.id}"]`);
    const formEl = colEl?.querySelector('[data-testid="create-card-form"]');
    const formWrap = formEl?.parentElement ?? null;
    const cardsEl = colEl?.querySelector(`[data-testid="kanban-column-cards-${column.id}"]`);
    const rowEl = document.querySelector('[data-testid="kanban-columns-row"]');
    const newCol = document.querySelector('[data-testid="new-column-section"]');
    const colRect = colEl?.getBoundingClientRect();
    const formRect = formEl?.getBoundingClientRect();
    const wrapRect = formWrap?.getBoundingClientRect();
    const cardsRect = cardsEl?.getBoundingClientRect();
    const rowRect = rowEl?.getBoundingClientRect();
    const cs = colEl ? window.getComputedStyle(colEl) : null;
    const cardsCs = cardsEl ? window.getComputedStyle(cardsEl as Element) : null;
    const rowCs = rowEl ? window.getComputedStyle(rowEl) : null;
    const boardKanban = document.querySelector('[data-tour="board-kanban"]');
    const boardKanbanCs = boardKanban ? window.getComputedStyle(boardKanban) : null;
    fetch("http://127.0.0.1:7804/ingest/29457b36-0b80-4b84-b158-efeeb1de7ce1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24faed" },
      body: JSON.stringify({
        sessionId: "24faed",
        runId: "post-fix",
        hypothesisId: canEditBoard ? (formEl ? "H3" : "H2") : "H1",
        location: "kanban-column.tsx:probe",
        message: "add-card gate + geometry after layout fix",
        data: {
          columnId: column.id,
          columnName: column.name,
          cardCount: cardIds.length,
          canEditBoard,
          formInDom: Boolean(formEl),
          formWrapInDom: Boolean(formWrap),
          newColumnInDom: Boolean(newCol),
          hostname: window.location.hostname,
          colH: colRect ? Math.round(colRect.height) : null,
          colOverflow: cs?.overflow ?? null,
          colOverflowY: cs?.overflowY ?? null,
          cardsH: cardsRect ? Math.round(cardsRect.height) : null,
          cardsFlex: cardsCs?.flex ?? null,
          formH: formRect ? Math.round(formRect.height) : null,
          formW: formRect ? Math.round(formRect.width) : null,
          formTop: formRect ? Math.round(formRect.top) : null,
          formVisible:
            formRect != null &&
            formRect.width > 0 &&
            formRect.height > 0 &&
            formRect.bottom > 0 &&
            formRect.top < window.innerHeight,
          wrapH: wrapRect ? Math.round(wrapRect.height) : null,
          rowH: rowRect ? Math.round(rowRect.height) : null,
          rowMinH: rowCs?.minHeight ?? null,
          rowOverflowY: rowCs?.overflowY ?? null,
          boardKanbanMinH: boardKanbanCs?.minHeight ?? null,
          viewportH: window.innerHeight,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [canEditBoard, column.id, column.name, cardIds.length]);
  // #endregion

  return (
    <section
      ref={setNodeRef}
      data-testid={`kanban-column-${column.id}`}
      className={`${KANBAN_COLUMN_SECTION_CLASS} ${
        isOver ? "border-board-accent ring-1 ring-board-accent/40" : "border-board-border"
      }`}
    >
      <ColumnHeader
        boardId={boardId}
        columnId={column.id}
        name={column.name}
        cardCount={cardIds.length}
        canRename={canRenameColumns}
        canDelete={canRenameColumns}
      />
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          className={KANBAN_COLUMN_CARDS_CLASS}
          data-testid={`kanban-column-cards-${column.id}`}
        >
          {cardIds.map((id) => {
            const card = cardsById.get(id);
            if (!card) return null;
            const progress = countChildrenProgress(allCards, card.id);
            return (
              <SortableCardTile
                key={id}
                card={card}
                columns={columns}
                stagesById={stagesById}
                tags={tags}
                profilesById={profilesById}
                tifluxEnabled={tifluxEnabled}
                readOnlyTiflux={readOnlyTiflux}
                dragDisabled={!canEditBoard}
                subtasksProgress={progress.total > 0 ? progress : null}
                onSelect={onSelectCard}
                onOpenTifluxCreate={onOpenTifluxCreate}
                onOpenTifluxLink={onOpenTifluxLink}
              />
            );
          })}
        </div>
      </SortableContext>
      {canEditBoard ? (
        <div className={KANBAN_COLUMN_FORM_WRAP_CLASS}>
          <CreateCardForm
            boardId={boardId}
            columnId={column.id}
            compact
            onCardCreated={(id, title) => onCardCreated?.(id, title, column.id)}
          />
        </div>
      ) : null}
    </section>
  );
}

export function NewColumnSection({ boardId }: { boardId: string }) {
  const [pending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const blockedBeforeRef = submittingRef.current || pending || isSubmitting;
    if (blockedBeforeRef) return;

    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;

    const lockKey = columnInFlightLockKey(boardId, trimmed);
    if (!acquireInFlightLock(lockKey)) return;

    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("name", trimmed);

    submittingRef.current = true;
    setIsSubmitting(true);
    setName("");

    startTransition(async () => {
      try {
        const result = await createColumn(fd);
        if ("error" in result) {
          setName(trimmed);
          setError(result.error);
          appToast.error(result.error);
          return;
        }
      } finally {
        releaseInFlightLock(lockKey);
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    });
  }

  const disabled = pending || isSubmitting;

  return (
    <section
      data-testid="new-column-section"
      className="flex w-72 shrink-0 flex-col rounded-xl border border-dashed border-aurora-muted/50 p-3"
    >
      <h3 className="mb-2 text-sm font-semibold text-aurora-muted">Nova coluna</h3>
      <form onSubmit={handleSubmit} className={`space-y-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (submittingRef.current || pending || isSubmitting)) {
              e.preventDefault();
            }
          }}
          placeholder="Nome da coluna"
          required
          disabled={disabled}
          className={inputBoardClassSm}
        />
        <button type="submit" disabled={disabled} className={`w-full ${btnBoardPrimarySm}`}>
          {disabled ? "Adicionando..." : "Adicionar coluna"}
        </button>
        {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
      </form>
    </section>
  );
}
