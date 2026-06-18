"use client";

import { createCard, createColumn } from "@/app/(app)/boards/[boardId]/actions";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import { BoardCardTile } from "./board-card-tile";
import { CreateCardForm } from "./create-card-form";
import type { BoardCard, ColumnRow, ProfileRow, TagRow } from "./types";

type Props = {
  boardId: string;
  columns: ColumnRow[];
  cardsByColumn: Map<string, BoardCard[]>;
  swimlanes: { key: string; label: string; cards: BoardCard[] }[] | null;
  groupByAssignee: boolean;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardKanbanView({
  boardId,
  columns,
  cardsByColumn,
  swimlanes,
  groupByAssignee,
  tags,
  profilesById,
  tifluxEnabled,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  if (groupByAssignee && swimlanes) {
    return (
      <div className="space-y-4">
        {swimlanes.map((lane) => (
          <section key={lane.key} className="rounded-xl border border-board-border bg-board-surface/60 p-3">
            <h3 className="mb-2 text-sm font-semibold text-aurora-fg">
              {lane.label} ({lane.cards.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {lane.cards.map((card) => (
                <div key={card.id} className="w-72">
                  <BoardCardTile
                    card={card}
                    tags={tags}
                    profilesById={profilesById}
                    tifluxEnabled={tifluxEnabled}
                    onSelect={onSelectCard}
                    onOpenTifluxCreate={onOpenTifluxCreate}
                    onOpenTifluxLink={onOpenTifluxLink}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <section
          key={col.id}
          className="flex w-72 shrink-0 flex-col rounded-xl border border-board-border bg-board-surface/60 p-3"
        >
          <header className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{col.name}</h3>
            <span className="text-xs text-aurora-muted">{cardsByColumn.get(col.id)?.length ?? 0}</span>
          </header>
          <div className="flex flex-col gap-2">
            {(cardsByColumn.get(col.id) ?? []).map((card) => (
              <BoardCardTile
                key={card.id}
                card={card}
                tags={tags}
                profilesById={profilesById}
                tifluxEnabled={tifluxEnabled}
                onSelect={onSelectCard}
                onOpenTifluxCreate={onOpenTifluxCreate}
                onOpenTifluxLink={onOpenTifluxLink}
              />
            ))}
          </div>
          <CreateCardForm boardId={boardId} columnId={col.id} />
        </section>
      ))}
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
    </div>
  );
}
