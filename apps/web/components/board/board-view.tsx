"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { createCard, createColumn } from "@/app/(app)/boards/[boardId]/actions";
import { btnBoardPrimarySm, btnBoardSecondary, inputBoardClassSm } from "@/lib/ui-classes";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { CardDrawer } from "./card-drawer";
import { CardFilterBar } from "./card-filter-bar";
import { ShareBoardModal } from "./share-board-modal";
import { BoardAppearanceEditor } from "./board-appearance-editor";
import { BoardIcon } from "./board-icon";
import { PriorityBadge, TagChip } from "./badges";
import type { BoardMember } from "./share-project-panel";
import {
  EMPTY_FILTERS,
  formatDue,
  isOverdue,
  matchesFilters,
  memberLabel,
  type BoardCard,
  type CardFilters,
  type ColumnRow,
  type ProfileRow,
  type TagRow,
} from "./types";

type Props = {
  board: { id: string; name: string; org_id: string; icon: string | null; color: string | null };
  columns: ColumnRow[];
  cards: BoardCard[];
  tags: TagRow[];
  members: ProfileRow[];
  boardMembers: BoardMember[];
  profilesById: Record<string, ProfileRow>;
};

export function BoardView({ board, columns, cards, tags, members, boardMembers, profilesById }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [groupByAssignee, setGroupByAssignee] = useState(false);

  const filtered = useMemo(() => cards.filter((c) => matchesFilters(c, filters)), [cards, filters]);

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const col of columns) map.set(col.id, []);
    if (!groupByAssignee) {
      for (const card of filtered) map.get(card.column_id)?.push(card);
    }
    return map;
  }, [columns, filtered, groupByAssignee]);

  const swimlanes = useMemo(() => {
    if (!groupByAssignee) return null;
    const lanes: { key: string; label: string; cards: BoardCard[] }[] = [
      { key: "none", label: "Sem responsavel", cards: [] },
    ];
    for (const m of members) lanes.push({ key: m.id, label: memberLabel(m), cards: [] });
    for (const card of filtered) {
      const key = card.assignee_id ?? "none";
      const lane = lanes.find((l) => l.key === key) ?? lanes[0];
      lane.cards.push(card);
    }
    return lanes;
  }, [filtered, groupByAssignee, members]);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  function renderCard(card: BoardCard) {
    const overdue = isOverdue(card.due_date, card.completed_at);
    const assignee = card.assignee_id ? profilesById[card.assignee_id] : undefined;
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => setSelectedCardId(card.id)}
        className={`w-full rounded-lg border bg-board-surface p-3 text-left shadow-sm transition hover:border-board-accent ${
          overdue ? "border-aurora-danger/60 ring-1 ring-aurora-danger/30" : "border-board-border"
        }`}
      >
        <p className="text-sm text-aurora-fg">{card.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <PriorityBadge priority={card.priority} />
          {card.due_date ? (
            <span className={`text-xs ${overdue ? "font-semibold text-aurora-danger" : "text-aurora-muted"}`}>
              {formatDue(card.due_date)}
            </span>
          ) : null}
          {assignee ? <span className="text-xs text-aurora-muted">{memberLabel(assignee)}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {card.tagIds.map((tid) => {
            const t = tags.find((x) => x.id === tid);
            return t ? <TagChip key={tid} tag={t} /> : null;
          })}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BoardIcon icon={board.icon} color={board.color} size="sm" />
          <div className="flex items-center gap-2 text-sm text-aurora-muted">
            <Link href="/boards" className="hover:text-board-accent">
              Projetos
            </Link>
            <span>/</span>
            <span className="font-medium text-aurora-fg">{board.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BoardAppearanceEditor boardId={board.id} icon={board.icon} color={board.color} />
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className={`inline-flex items-center gap-1.5 ${btnBoardSecondary}`}
          >
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
        </div>
      </div>

      <CardFilterBar
        tags={tags}
        members={members}
        value={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <label className="flex w-fit items-center gap-2 text-sm text-aurora-muted">
        <input type="checkbox" checked={groupByAssignee} onChange={(e) => setGroupByAssignee(e.target.checked)} />
        Agrupar por responsavel
      </label>

      {groupByAssignee && swimlanes ? (
        <div className="space-y-4">
          {swimlanes.map((lane) => (
            <section key={lane.key} className="rounded-xl border border-board-border bg-board-surface/60 p-3">
              <h3 className="mb-2 text-sm font-semibold text-aurora-fg">
                {lane.label} ({lane.cards.length})
              </h3>
              <div className="flex flex-wrap gap-2">{lane.cards.map(renderCard)}</div>
            </section>
          ))}
        </div>
      ) : (
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
              <div className="flex flex-col gap-2">{(cardsByColumn.get(col.id) ?? []).map(renderCard)}</div>
              <form action={createCard} className="mt-2 space-y-2">
                <input type="hidden" name="boardId" value={board.id} />
                <input type="hidden" name="columnId" value={col.id} />
                <input name="title" placeholder="Novo card" required className={inputBoardClassSm} />
                <select name="priority" defaultValue="medium" className={inputBoardClassSm}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
                <DatePickerPopover name="dueDate" variant="board" />
                <button type="submit" className={`w-full ${btnBoardPrimarySm}`}>
                  Adicionar
                </button>
              </form>
            </section>
          ))}
          <section className="flex w-72 shrink-0 flex-col rounded-xl border border-dashed border-aurora-muted/50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-aurora-muted">Nova coluna</h3>
            <form action={createColumn} className="space-y-2">
              <input type="hidden" name="boardId" value={board.id} />
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
      )}

      {selectedCard ? (
        <CardDrawer
          card={selectedCard}
          boardId={board.id}
          orgId={board.org_id}
          tags={tags}
          members={members}
          onClose={() => setSelectedCardId(null)}
        />
      ) : null}

      {shareOpen ? (
        <ShareBoardModal
          boardId={board.id}
          boardName={board.name}
          members={boardMembers}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}
