import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/loaders/session";
import { BoardView } from "@/components/board/board-view";
import { BoardThemeScope } from "@/components/board/board-theme-scope";
import { TrackRecentBoard } from "@/components/shell/track-recent-board";
import { BoardSkeleton } from "@/components/ui/skeleton";
import type { BoardCard, ProfileRow } from "@/components/board/types";
import { parseTifluxCanceledTickets } from "@/lib/tiflux-canceled-tickets";
import {
  buildProfilesById,
  collectAssigneeUserIds,
  sortAssigneeProfiles,
} from "@/lib/board-assignees";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { dedupeCardsById } from "@/lib/dedupe-cards";

const BOARD_SELECT =
  "id, org_id, name, icon, color, tiflux_enabled, department_id, archived, created_by";
const CARD_SELECT =
  "id, column_id, position, title, description, priority, due_date, start_date, assignee_id, completed_at, stage_id, tiflux_ticket_number, tiflux_ticket_id, tiflux_canceled_tickets";

export const experimental_ppr = true;

async function BoardPageContent({ boardId }: { boardId: string }) {
  const supabase = await createClient();
  const user = await getSessionUser();

  const { data: board } = await supabase
    .from("boards")
    .select(BOARD_SELECT)
    .eq("id", boardId)
    .single();
  if (!board) notFound();

  const [
    { data: org },
    { data: myMembership },
    { data: columns },
    { data: cardsRaw },
    { data: tags },
    { data: boardMembers },
    { data: stages },
    { data: memberships },
  ] = await Promise.all([
    supabase.from("organizations").select("name, logo_url").eq("id", board.org_id).maybeSingle(),
    user
      ? supabase
          .from("memberships")
          .select("role")
          .eq("org_id", board.org_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("columns").select("id, name, default_stage_id").eq("board_id", boardId).order("position"),
    supabase.from("cards").select(CARD_SELECT).eq("board_id", boardId).order("position"),
    supabase.from("tags").select("id, name, color").eq("board_id", board.id).order("name"),
    supabase.from("board_members").select("user_id, role").eq("board_id", boardId),
    supabase
      .from("stages")
      .select("id, name, color, position, is_system, system_key")
      .eq("board_id", boardId)
      .order("position"),
    supabase.from("memberships").select("user_id").eq("org_id", board.org_id),
  ]);

  const isOrgAdmin = isOrgAdminRole(myMembership?.role);
  const cardsUnique = dedupeCardsById(cardsRaw ?? []);
  const cardIds = cardsUnique.map((c) => c.id);

  const assigneeIds = collectAssigneeUserIds(
    (memberships ?? []).map((m) => m.user_id),
    [
      ...(boardMembers ?? []).map((m) => m.user_id),
      ...cardsUnique.map((c) => c.assignee_id).filter((id): id is string => Boolean(id)),
    ],
  );

  const [{ data: cardTags }, { data: profiles }] = await Promise.all([
    cardIds.length
      ? supabase.from("card_tags").select("card_id, tag_id").in("card_id", cardIds)
      : Promise.resolve({ data: [] as { card_id: string; tag_id: string }[] }),
    assigneeIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
  ]);

  const profilesById = buildProfilesById(profiles ?? []);

  const tagIdsByCard = new Map<string, string[]>();
  for (const ct of cardTags ?? []) {
    const list = tagIdsByCard.get(ct.card_id) ?? [];
    list.push(ct.tag_id);
    tagIdsByCard.set(ct.card_id, list);
  }

  const cards: BoardCard[] = cardsUnique.map((c) => ({
    id: c.id,
    column_id: c.column_id,
    position: c.position,
    title: c.title,
    description: c.description,
    priority: c.priority,
    due_date: c.due_date,
    start_date: c.start_date,
    assignee_id: c.assignee_id,
    completed_at: c.completed_at,
    stage_id: c.stage_id ?? null,
    tagIds: tagIdsByCard.get(c.id) ?? [],
    tiflux_ticket_number: c.tiflux_ticket_number ?? null,
    tiflux_ticket_id: c.tiflux_ticket_id ?? null,
    tiflux_canceled_tickets: parseTifluxCanceledTickets(c.tiflux_canceled_tickets),
  }));

  const members: ProfileRow[] = sortAssigneeProfiles(
    (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name })),
  );

  const bmList = (boardMembers ?? []).map((bm) => ({
    user_id: bm.user_id,
    role: bm.role,
    profile: profilesById[bm.user_id],
  }));

  return (
    <>
      <TrackRecentBoard boardId={board.id} boardName={board.name} />
      <BoardThemeScope color={board.color}>
        <BoardView
          board={{
            id: board.id,
            name: board.name,
            org_id: board.org_id,
            icon: board.icon,
            color: board.color,
            tiflux_enabled: board.tiflux_enabled ?? false,
          }}
          orgName={org?.name ?? "Organizacao"}
          orgLogoUrl={org?.logo_url ?? null}
          columns={columns ?? []}
          cards={cards}
          stages={stages ?? []}
          tags={tags ?? []}
          members={members}
          boardMembers={bmList}
          profilesById={profilesById}
          isOrgAdmin={isOrgAdmin}
          currentUserId={user?.id ?? null}
        />
      </BoardThemeScope>
    </>
  );
}

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardPageContent boardId={boardId} />
    </Suspense>
  );
}
