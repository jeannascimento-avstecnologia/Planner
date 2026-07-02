"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Settings } from "lucide-react";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { CardDrawer } from "./card-drawer";
import { CardFilterBar } from "./card-filter-bar";
import { canEditBoardUI, canManageBoardMembers, canWriteBoard } from "@/lib/board-member-roles";
import { BoardAccessModal } from "./board-access-modal";
import { InviteMembersModal } from "./invite-members-modal";
import { BoardAppearanceEditor } from "./board-appearance-editor";
import { BoardIcon } from "./board-icon";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardCalendarView } from "./board-calendar-view";
import { BoardTableView } from "./board-table-view";
import { BoardTimelineView } from "./board-timeline-view";
import { BoardViewSwitcher } from "./board-view-switcher";
import { StageManagerModal } from "./stage-manager-modal";
import { TifluxLinkTicketModal } from "./tiflux-link-ticket-modal";
import { TifluxTicketModal } from "./tiflux-ticket-modal";
import type { BoardMember } from "./board-member";
import {
  EMPTY_FILTERS,
  matchesFilters,
  memberLabel,
  parseBoardViewMode,
  type BoardCard,
  type CardFilters,
  type ColumnRow,
  type ProfileRow,
  type StageRow,
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
  orgName: string;
  orgLogoUrl: string | null;
  columns: ColumnRow[];
  cards: BoardCard[];
  stages: StageRow[];
  tags: TagRow[];
  members: ProfileRow[];
  boardMembers: BoardMember[];
  profilesById: Record<string, ProfileRow>;
  isOrgAdmin: boolean;
  currentUserId: string | null;
};

function BoardViewInner({
  board,
  orgName,
  orgLogoUrl,
  columns,
  cards,
  stages,
  tags,
  members,
  boardMembers,
  profilesById,
  isOrgAdmin,
  currentUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewMode = parseBoardViewMode(searchParams.get("view"));
  const urlCardOpened = useRef(false);

  const safeCards = useMemo(
    () =>
      cards.map((c) => ({
        ...c,
        tiflux_canceled_tickets: c.tiflux_canceled_tickets ?? [],
      })),
    [cards],
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [tifluxCreateCardId, setTifluxCreateCardId] = useState<string | null>(null);
  const [tifluxLinkCardId, setTifluxLinkCardId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [groupByAssignee, setGroupByAssignee] = useState(false);

  useEffect(() => {
    if (searchParams.has("stageColor")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stageColor");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (urlCardOpened.current) return;
    const cardId = searchParams.get("cardId");
    if (!cardId) return;
    if (safeCards.some((c) => c.id === cardId)) {
      setSelectedCardId(cardId);
      urlCardOpened.current = true;
    }
  }, [safeCards, searchParams]);

  const selectCard = useCallback(
    (id: string) => {
      setSelectedCardId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stageColor");
      params.set("cardId", id);
      const qs = params.toString();
      window.history.replaceState(null, "", `${pathname}?${qs}`);
    },
    [pathname, searchParams],
  );

  const closeCard = useCallback(() => {
    setSelectedCardId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cardId");
    params.delete("stageColor");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const stagesById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const filtered = useMemo(
    () => safeCards.filter((c) => matchesFilters(c, filters, { columns, stagesById })),
    [safeCards, filters, columns, stagesById],
  );

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

  const userBoardRole = boardMembers.find((m) => m.user_id === currentUserId)?.role ?? null;
  const canManageMembers = canManageBoardMembers(isOrgAdmin, userBoardRole);
  const canEditBoard = canEditBoardUI(isOrgAdmin, userBoardRole);

  const canRenameColumns = useMemo(() => {
    if (!canEditBoard) return false;
    const boardRole = boardMembers.find((m) => m.user_id === currentUserId)?.role ?? null;
    return canWriteBoard(isOrgAdmin, boardRole);
  }, [boardMembers, currentUserId, isOrgAdmin, canEditBoard]);

  const selectedCard = safeCards.find((c) => c.id === selectedCardId) ?? null;
  const tifluxLinkCard = safeCards.find((c) => c.id === tifluxLinkCardId) ?? null;
  const tifluxEnabled = board.tiflux_enabled;
  const openTifluxCreate = canEditBoard ? setTifluxCreateCardId : undefined;
  const openTifluxLink = canEditBoard ? setTifluxLinkCardId : undefined;
  const tifluxCreateCard = safeCards.find((c) => c.id === tifluxCreateCardId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BoardIcon icon={board.icon} color={board.color} size="sm" />
          <div className="flex items-center gap-2 text-sm text-aurora-muted">
            <Link href="/projects" className="hover:text-board-accent">
              Projetos
            </Link>
            <span>/</span>
            <span className="inline-flex items-center gap-1.5">
              <OrgLogo name={orgName} logoUrl={orgLogoUrl} size="xs" />
              <span>{orgName}</span>
            </span>
            <span>/</span>
            <span className="font-medium text-aurora-fg">{board.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEditBoard ? (
            <BoardAppearanceEditor boardId={board.id} icon={board.icon} color={board.color} />
          ) : null}
          {canManageMembers ? (
            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              aria-label="Gerenciar acesso"
              data-testid="board-access-button"
              className={`inline-flex items-center gap-1.5 ${btnBoardSecondary}`}
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : null}
          {canManageMembers ? (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className={`inline-flex items-center gap-1.5 ${btnBoardSecondary}`}
            >
              <UserPlus className="h-4 w-4" /> Convidar um integrante
            </button>
          ) : null}
        </div>
      </div>

      <CardFilterBar
        boardId={board.id}
        orgId={board.org_id}
        tags={tags}
        stages={stages}
        members={members}
        value={filters}
        isOrgAdmin={isOrgAdmin}
        onManageStages={canEditBoard ? () => setStagesOpen(true) : undefined}
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
          stagesById={stagesById}
          cardsByColumn={cardsByColumn}
          swimlanes={swimlanes}
          groupByAssignee={groupByAssignee}
          tags={tags}
          profilesById={profilesById}
          tifluxEnabled={tifluxEnabled}
          canEditBoard={canEditBoard}
          canRenameColumns={canRenameColumns}
          onSelectCard={selectCard}
          onOpenTifluxCreate={openTifluxCreate ?? (() => {})}
          onOpenTifluxLink={openTifluxLink ?? (() => {})}
          readOnlyTiflux={!canEditBoard}
        />
      ) : null}

      {viewMode === "timeline" ? (
        <BoardTimelineView
          cards={filtered}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={selectCard}
          onOpenTifluxCreate={openTifluxCreate ?? (() => {})}
          onOpenTifluxLink={openTifluxLink ?? (() => {})}
          readOnlyTiflux={!canEditBoard}
        />
      ) : null}

      {viewMode === "calendar" ? (
        <BoardCalendarView
          cards={filtered}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={selectCard}
          onOpenTifluxCreate={openTifluxCreate ?? (() => {})}
          onOpenTifluxLink={openTifluxLink ?? (() => {})}
          readOnlyTiflux={!canEditBoard}
        />
      ) : null}

      {viewMode === "table" ? (
        <BoardTableView
          cards={filtered}
          columns={columns}
          stages={stages}
          tags={tags}
          profilesById={profilesById}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={selectCard}
          onOpenTifluxCreate={openTifluxCreate ?? (() => {})}
          onOpenTifluxLink={openTifluxLink ?? (() => {})}
          readOnlyTiflux={!canEditBoard}
        />
      ) : null}

      {selectedCard ? (
        <CardDrawer
          card={selectedCard}
          boardId={board.id}
          orgId={board.org_id}
          columns={columns}
          stages={stages}
          tags={tags}
          members={members}
          isOrgAdmin={isOrgAdmin}
          readOnly={!canEditBoard}
          tifluxEnabled={tifluxEnabled}
          onOpenTifluxCreate={openTifluxCreate}
          onOpenTifluxLink={openTifluxLink}
          onClose={closeCard}
        />
      ) : null}

      {canEditBoard && tifluxCreateCard ? (
        <TifluxTicketModal
          boardId={board.id}
          card={tifluxCreateCard}
          onClose={() => setTifluxCreateCardId(null)}
        />
      ) : null}

      {canEditBoard && tifluxLinkCard ? (
        <TifluxLinkTicketModal
          boardId={board.id}
          card={tifluxLinkCard}
          onClose={() => setTifluxLinkCardId(null)}
        />
      ) : null}

      {canEditBoard && stagesOpen ? (
        <StageManagerModal boardId={board.id} stages={stages} onClose={() => setStagesOpen(false)} />
      ) : null}

      {shareOpen ? (
        <InviteMembersModal
          boardId={board.id}
          boardName={board.name}
          canManageMembers={canManageMembers}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {accessOpen ? (
        <BoardAccessModal
          boardId={board.id}
          boardName={board.name}
          members={boardMembers}
          canManageMembers={canManageMembers}
          currentUserId={currentUserId}
          onClose={() => setAccessOpen(false)}
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
