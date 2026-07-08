"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserPlus, Settings } from "lucide-react";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { applySearchParamUpdates, replaceClientUrl } from "@/lib/client-url-state";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardSkeleton } from "@/components/ui/skeleton";
import { BoardViewSwitcher } from "./board-view-switcher";

const BoardCalendarView = dynamic(
  () => import("./board-calendar-view").then((m) => ({ default: m.BoardCalendarView })),
  { loading: () => <BoardSkeleton /> },
);
const BoardTableView = dynamic(
  () => import("./board-table-view").then((m) => ({ default: m.BoardTableView })),
  { loading: () => <BoardSkeleton /> },
);
const BoardTimelineView = dynamic(
  () => import("./board-timeline-view").then((m) => ({ default: m.BoardTimelineView })),
  { loading: () => <BoardSkeleton /> },
);
const CardDrawer = dynamic(() => import("./card-drawer").then((m) => ({ default: m.CardDrawer })), {
  ssr: false,
});
const StageManagerModal = dynamic(
  () => import("./stage-manager-modal").then((m) => ({ default: m.StageManagerModal })),
  { ssr: false },
);
const TifluxTicketModal = dynamic(
  () => import("./tiflux-ticket-modal").then((m) => ({ default: m.TifluxTicketModal })),
  { ssr: false },
);
const TifluxLinkTicketModal = dynamic(
  () => import("./tiflux-link-ticket-modal").then((m) => ({ default: m.TifluxLinkTicketModal })),
  { ssr: false },
);
const InviteMembersModal = dynamic(
  () => import("./invite-members-modal").then((m) => ({ default: m.InviteMembersModal })),
  { ssr: false },
);
const BoardAccessModal = dynamic(
  () => import("./board-access-modal").then((m) => ({ default: m.BoardAccessModal })),
  { ssr: false },
);
const BoardAutomationsModal = dynamic(
  () => import("./board-automations-modal").then((m) => ({ default: m.BoardAutomationsModal })),
  { ssr: false },
);
import { CardFilterBar } from "./card-filter-bar";
import { canEditBoardUI, canManageBoardMembers, canWriteBoard } from "@/lib/board-member-roles";
import { BoardAppearanceEditor } from "./board-appearance-editor";
import { BoardIcon } from "./board-icon";
import { BoardPresenceLayer } from "./board-presence-layer";
import { useBoardPresence } from "@/hooks/use-board-presence";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewModeRef = useRef(parseBoardViewMode(searchParams.get("view")));
  const [viewMode, setViewMode] = useState(viewModeRef.current);
  const [localTags, setLocalTags] = useState(tags);
  const [localStages, setLocalStages] = useState(stages);
  const selectedCardIdRef = useRef<string | null>(null);
  const urlCardOpened = useRef(false);

  useEffect(() => {
    const fromUrl = parseBoardViewMode(searchParams.get("view"));
    if (fromUrl !== viewModeRef.current) {
      viewModeRef.current = fromUrl;
      setViewMode(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setLocalTags(tags);
    setLocalStages(stages);
  }, [tags, stages]);

  const changeViewMode = useCallback(
    (mode: ReturnType<typeof parseBoardViewMode>) => {
      if (mode === viewModeRef.current) return;
      viewModeRef.current = mode;
      setViewMode(mode);
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "kanban") params.delete("view");
      else params.set("view", mode);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams],
  );

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
  const [automationsOpen, setAutomationsOpen] = useState(false);
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
      selectedCardIdRef.current = cardId;
      setSelectedCardId(cardId);
      urlCardOpened.current = true;
    }
  }, [safeCards, searchParams]);

  const selectCard = useCallback(
    (id: string) => {
      if (id === selectedCardIdRef.current) return;
      selectedCardIdRef.current = id;
      setSelectedCardId(id);
      const params = applySearchParamUpdates(searchParams, { cardId: id, stageColor: null });
      replaceClientUrl(pathname, params);
    },
    [pathname, searchParams],
  );

  const closeCard = useCallback(() => {
    selectedCardIdRef.current = null;
    setSelectedCardId(null);
    const params = applySearchParamUpdates(searchParams, { cardId: null, stageColor: null });
    replaceClientUrl(pathname, params);
  }, [pathname, searchParams]);

  const stagesById = useMemo(() => new Map(localStages.map((s) => [s.id, s])), [localStages]);

  const filtered = useMemo(
    () => safeCards.filter((c) => matchesFilters(c, filters, { columns, stagesById })),
    [safeCards, filters, columns, stagesById],
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const col of columns) map.set(col.id, []);
    if (!groupByAssignee) {
      for (const card of filtered) map.get(card.column_id)?.push(card);
      for (const list of map.values()) {
        list.sort((a, b) => a.position.localeCompare(b.position));
      }
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

  const canManageAutomations = canWriteBoard(isOrgAdmin, userBoardRole);

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
  const displayName = currentUserId ? profilesById[currentUserId]?.full_name ?? "Usuario" : "Usuario";
  const presenceCursors = useBoardPresence({
    boardId: board.id,
    userId: currentUserId ?? "anon",
    displayName,
  });

  return (
    <div className="space-y-4">
      <BoardPresenceLayer cursors={presenceCursors} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <BoardIcon icon={board.icon} color={board.color} size="sm" />
          <div className="min-w-0 flex-1 text-sm text-aurora-muted">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              <Link href="/projects" className="shrink-0 hover:text-board-accent">
                Projetos
              </Link>
              <span className="shrink-0">/</span>
              <span className="hidden min-w-0 items-center gap-1.5 truncate sm:inline-flex">
                <OrgLogo name={orgName} logoUrl={orgLogoUrl} size="sm" />
                <span className="truncate">{orgName}</span>
              </span>
              <span className="hidden shrink-0 sm:inline">/</span>
              <span className="min-w-0 truncate font-medium text-aurora-fg">{board.name}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canEditBoard ? (
            <BoardAppearanceEditor boardId={board.id} icon={board.icon} color={board.color} />
          ) : null}
          <Link href={`/boards/${board.id}/whiteboard`} className={btnBoardSecondary}>
            Whiteboard
          </Link>
          <Link href={`/boards/${board.id}/dashboard`} className={btnBoardSecondary} data-testid="board-dashboard-link">
            Dashboard
          </Link>
          {canManageAutomations ? (
            <button
              type="button"
              onClick={() => setAutomationsOpen(true)}
              className={btnBoardSecondary}
              data-testid="board-automations-button"
            >
              Automacoes
            </button>
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
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Convidar um integrante</span>
            </button>
          ) : null}
        </div>
      </div>

      <CardFilterBar
        boardId={board.id}
        orgId={board.org_id}
        tags={localTags}
        stages={localStages}
        members={members}
        value={filters}
        isOrgAdmin={isOrgAdmin}
        onManageStages={canEditBoard ? () => setStagesOpen(true) : undefined}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        onTagsChange={setLocalTags}
        onStagesChange={setLocalStages}
      />

      <BoardViewSwitcher value={viewMode} onChange={changeViewMode} />

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
          tags={localTags}
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
          stages={localStages}
          tags={localTags}
          profilesById={profilesById}
          tifluxEnabled={tifluxEnabled}
          onSelectCard={selectCard}
          onOpenTifluxCreate={openTifluxCreate ?? (() => {})}
          onOpenTifluxLink={openTifluxLink ?? (() => {})}
          readOnlyTiflux={!canEditBoard}
          canEdit={canEditBoard}
        />
      ) : null}

      {selectedCard ? (
        <CardDrawer
          card={selectedCard}
          boardId={board.id}
          orgId={board.org_id}
          columns={columns}
          stages={localStages}
          tags={localTags}
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
        <StageManagerModal boardId={board.id} stages={localStages} onClose={() => setStagesOpen(false)} />
      ) : null}

      {canManageAutomations && automationsOpen ? (
        <BoardAutomationsModal
          boardId={board.id}
          orgId={board.org_id}
          columns={columns.map((c) => ({ id: c.id, name: c.name }))}
          members={members.map((m) => ({ id: m.id, name: m.full_name ?? "Usuario" }))}
          open={automationsOpen}
          onClose={() => setAutomationsOpen(false)}
        />
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
