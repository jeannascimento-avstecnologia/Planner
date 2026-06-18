"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Share2 } from "lucide-react";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { CardDrawer } from "./card-drawer";
import { CardFilterBar } from "./card-filter-bar";
import { canManageBoardMembers } from "@/lib/board-member-roles";
import { ShareBoardModal } from "./share-board-modal";
import { BoardAppearanceEditor } from "./board-appearance-editor";
import { BoardIcon } from "./board-icon";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardCalendarView } from "./board-calendar-view";
import { BoardTableView } from "./board-table-view";
import { BoardTimelineView } from "./board-timeline-view";
import { BoardViewSwitcher } from "./board-view-switcher";
import { TifluxLinkTicketModal } from "./tiflux-link-ticket-modal";
import { TifluxTicketModal } from "./tiflux-ticket-modal";
import type { BoardMember } from "./share-project-panel";
import {
  EMPTY_FILTERS,
  matchesFilters,
  memberLabel,
  parseBoardViewMode,
  type BoardCard,
  type CardFilters,
  type ColumnRow,
  type ProfileRow,
  type TagRow,
} from "./types";

type Props = {
  board: {
    id: string;
    name: string;
    org_id: string;
    icon: string | null;
    color: string | null;
    tiflux_enabled: boolean;
  };
  columns: ColumnRow[];
  cards: BoardCard[];
  tags: TagRow[];
  members: ProfileRow[];
  boardMembers: BoardMember[];
  profilesById: Record<string, ProfileRow>;
  isOrgAdmin: boolean;
  currentUserId: string | null;
};

function BoardViewInner({
  board,
  columns,
  cards,
  tags,
  members,
  boardMembers,
  profilesById,
  isOrgAdmin,
  currentUserId,
}: Props) {
  const searchParams = useSearchParams();
  const viewMode = parseBoardViewMode(searchParams.get("view"));

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [tifluxCreateCardId, setTifluxCreateCardId] = useState<string | null>(null);
  const [tifluxLinkCardId, setTifluxLinkCardId] = useState<string | null>(null);
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
  const tifluxCreateCard = cards.find((c) => c.id === tifluxCreateCardId) ?? null;
  const tifluxLinkCard = cards.find((c) => c.id === tifluxLinkCardId) ?? null;
  const tifluxEnabled = board.tiflux_enabled;

  const linkedTicketOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const c of cards) {
      const n = c.tiflux_ticket_number;
      if (!n || seen.has(n)) continue;
      seen.add(n);
      opts.push({ value: n, label: `#${n}${c.title ? ` — ${c.title}` : ""}` });
    }
    return opts.sort((a, b) => Number(a.value) - Number(b.value));
  }, [cards]);
  const userBoardRole = boardMembers.find((m) => m.user_id === currentUserId)?.role ?? null;
  const canManageMembers = canManageBoardMembers(isOrgAdmin, userBoardRole);

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
        boardId={board.id}
        tags={tags}
        members={members}
        value={filters}
        isOrgAdmin={isOrgAdmin}
        tifluxEnabled={tifluxEnabled}
        linkedTickets={linkedTicketOptions}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <BoardViewSwitcher value={viewMode} />

      {viewMode === "kanban" ? (
        <label className="flex w-fit items-center gap-2 text-sm text-aurora-muted">
          <input type="checkbox" checked={groupByAssignee} onChange={(e) => setGroupByAssignee(e.target.checked)} />
          Agrupar por responsavel
        </label>
      ) : null}

      {viewMode === "kanban" ? (
        <BoardKanbanView
          boardId={board.id}
          columns={columns}
          cardsByColumn={cardsByColumn}
          swimlanes={swimlanes}
          groupByAssignee={groupByAssignee}
          tags={tags}
          profilesById={profilesById}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={setSelectedCardId}
          onOpenTifluxCreate={setTifluxCreateCardId}
          onOpenTifluxLink={setTifluxLinkCardId}
        />
      ) : null}

      {viewMode === "timeline" ? (
        <BoardTimelineView
          cards={filtered}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={setSelectedCardId}
          onOpenTifluxCreate={setTifluxCreateCardId}
          onOpenTifluxLink={setTifluxLinkCardId}
        />
      ) : null}

      {viewMode === "calendar" ? (
        <BoardCalendarView
          cards={filtered}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={setSelectedCardId}
          onOpenTifluxCreate={setTifluxCreateCardId}
          onOpenTifluxLink={setTifluxLinkCardId}
        />
      ) : null}

      {viewMode === "table" ? (
        <BoardTableView
          cards={filtered}
          columns={columns}
          tags={tags}
          profilesById={profilesById}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={setSelectedCardId}
          onOpenTifluxCreate={setTifluxCreateCardId}
          onOpenTifluxLink={setTifluxLinkCardId}
        />
      ) : null}

      {selectedCard ? (
        <CardDrawer
          card={selectedCard}
          boardId={board.id}
          orgId={board.org_id}
          tags={tags}
          members={members}
          isOrgAdmin={isOrgAdmin}
          tifluxEnabled={tifluxEnabled}
          onOpenTifluxCreate={setTifluxCreateCardId}
          onOpenTifluxLink={setTifluxLinkCardId}
          onClose={() => setSelectedCardId(null)}
        />
      ) : null}

      {tifluxCreateCard ? (
        <TifluxTicketModal
          boardId={board.id}
          card={tifluxCreateCard}
          onClose={() => setTifluxCreateCardId(null)}
        />
      ) : null}

      {tifluxLinkCard ? (
        <TifluxLinkTicketModal
          boardId={board.id}
          card={tifluxLinkCard}
          onClose={() => setTifluxLinkCardId(null)}
        />
      ) : null}

      {shareOpen ? (
        <ShareBoardModal
          boardId={board.id}
          boardName={board.name}
          members={boardMembers}
          canManageMembers={canManageMembers}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function BoardView(props: Props) {
  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando projeto...</div>}>
      <BoardViewInner {...props} />
    </Suspense>
  );
}
