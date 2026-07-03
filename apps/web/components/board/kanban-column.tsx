"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createColumn } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm } from "@/lib/ui-classes";
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
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl border border-dashed border-aurora-muted/50 p-3">
      <h3 className="mb-2 text-sm font-semibold text-aurora-muted">Nova coluna</h3>
      <form action={createColumn} className="space-y-2">
        <input type="hidden" name="boardId" value={boardId} />
        <input name="name" placeholder="Nome da coluna" required className={inputBoardClassSm} />
        <button
          type="submit"
          className="w-full rounded-md border border-board-border px-2 py-1.5 text-sm hover:bg-board-surface"
        >
          Adicionar coluna
        </button>
      </form>
    </section>
  );
}
