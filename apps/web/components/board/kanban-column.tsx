"use client";

import { useRef, useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createColumn } from "@/app/(app)/boards/[boardId]/actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { ColumnHeader } from "./column-header";
import { CreateCardForm } from "./create-card-form";
import { SortableCardTile } from "./sortable-card-tile";
import type { BoardCard, ColumnRow, ProfileRow, StageRow, TagRow } from "./types";

type Props = {
  boardId: string;
  column: ColumnRow;
  columns: ColumnRow[];
  cardIds: string[];
  cardsById: Map<string, BoardCard>;
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

  return (
    <section
      ref={setNodeRef}
      data-testid={`kanban-column-${column.id}`}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-board-surface/60 p-3 transition-colors ${
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
        <div className="flex min-h-[4rem] flex-col gap-2" data-testid={`kanban-column-cards-${column.id}`}>
          {cardIds.map((id) => {
            const card = cardsById.get(id);
            if (!card) return null;
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
                onSelect={onSelectCard}
                onOpenTifluxCreate={onOpenTifluxCreate}
                onOpenTifluxLink={onOpenTifluxLink}
              />
            );
          })}
        </div>
      </SortableContext>
      {canEditBoard ? (
        <CreateCardForm boardId={boardId} columnId={column.id} onCardCreated={(id, title) => onCardCreated?.(id, title, column.id)} />
      ) : null}
    </section>
  );
}

export function NewColumnSection({ boardId }: { boardId: string }) {
  const [pending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const submittingRef = useRef(false);
  const submitSeqRef = useRef(0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const seq = ++submitSeqRef.current;
    const blockedBeforeRef = submittingRef.current || pending || isSubmitting;
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "pre-fix",
        hypothesisId: "H1-H2",
        location: "kanban-column.tsx:NewColumnSection:entry",
        message: "create column submit entry",
        data: { seq, blockedBeforeRef, pending, submittingRef: submittingRef.current, isSubmitting },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (blockedBeforeRef) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const lockKey = `column:${boardId}`;
    if (!acquireInFlightLock(lockKey)) {
      // #region agent log
      fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
        body: JSON.stringify({
          sessionId: "fa60ca",
          runId: "post-fix",
          hypothesisId: "H6",
          location: "kanban-column.tsx:NewColumnSection:module-lock-blocked",
          message: "create column blocked by module lock",
          data: { seq, lockKey },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("name", trimmed);

    submittingRef.current = true;
    setIsSubmitting(true);
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "kanban-column.tsx:NewColumnSection:lock-acquired",
        message: "create column lock acquired",
        data: { seq, name: trimmed },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setName("");

    startTransition(async () => {
      try {
        await createColumn(fd);
      } finally {
        releaseInFlightLock(lockKey);
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    });
  }

  const disabled = pending || isSubmitting;

  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl border border-dashed border-aurora-muted/50 p-3">
      <h3 className="mb-2 text-sm font-semibold text-aurora-muted">Nova coluna</h3>
      <form onSubmit={handleSubmit} className={`space-y-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // #region agent log
              fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
                body: JSON.stringify({
                  sessionId: "fa60ca",
                  runId: "pre-fix",
                  hypothesisId: "H3",
                  location: "kanban-column.tsx:NewColumnSection:Enter",
                  message: "Enter key on column name input",
                  data: { submittingRef: submittingRef.current, pending, isSubmitting },
                  timestamp: Date.now(),
                }),
              }).catch(() => {});
              // #endregion
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
      </form>
    </section>
  );
}
