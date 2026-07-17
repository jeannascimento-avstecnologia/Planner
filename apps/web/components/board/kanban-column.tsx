"use client";

import { useRef, useState, useTransition } from "react";
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
  canCreateCards?: boolean;
  canMoveCards?: boolean;
  canRenameColumns: boolean;
  canDeleteColumns?: boolean;
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
  canCreateCards = canEditBoard,
  canMoveCards = canEditBoard,
  canRenameColumns,
  canDeleteColumns = canRenameColumns,
  readOnlyTiflux,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
  onCardCreated,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

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
        canDelete={canDeleteColumns}
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
                dragDisabled={!canMoveCards}
                subtasksProgress={progress.total > 0 ? progress : null}
                onSelect={onSelectCard}
                onOpenTifluxCreate={onOpenTifluxCreate}
                onOpenTifluxLink={onOpenTifluxLink}
              />
            );
          })}
        </div>
      </SortableContext>
      {canCreateCards ? (
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
