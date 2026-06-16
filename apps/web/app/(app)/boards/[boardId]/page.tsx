import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";
import { BoardThemeScope } from "@/components/board/board-theme-scope";
import { TrackRecentBoard } from "@/components/shell/track-recent-board";
import type { BoardCard, ProfileRow } from "@/components/board/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase.from("boards").select("*").eq("id", boardId).single();
  if (!board) notFound();

  const [
    { data: columns },
    { data: cardsRaw },
    { data: tags },
    { data: cardTags },
    { data: memberships },
    { data: boardMembers },
  ] = await Promise.all([
    supabase.from("columns").select("id, name").eq("board_id", boardId).order("position"),
    supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
    supabase.from("tags").select("id, name, color").eq("org_id", board.org_id).order("name"),
    supabase.from("card_tags").select("card_id, tag_id").eq("org_id", board.org_id),
    supabase.from("memberships").select("user_id").eq("org_id", board.org_id),
    supabase.from("board_members").select("user_id, role").eq("board_id", boardId),
  ]);

  const memberIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as ProfileRow[] };

  const profilesById: Record<string, ProfileRow> = {};
  for (const p of profiles ?? []) profilesById[p.id] = p;

  const tagsOnBoard = new Set((cardsRaw ?? []).map((c) => c.id));
  const tagIdsByCard = new Map<string, string[]>();
  for (const ct of cardTags ?? []) {
    if (!tagsOnBoard.has(ct.card_id)) continue;
    const list = tagIdsByCard.get(ct.card_id) ?? [];
    list.push(ct.tag_id);
    tagIdsByCard.set(ct.card_id, list);
  }

  const cards: BoardCard[] = (cardsRaw ?? []).map((c) => ({
    id: c.id,
    column_id: c.column_id,
    title: c.title,
    description: c.description,
    priority: c.priority,
    due_date: c.due_date,
    assignee_id: c.assignee_id,
    completed_at: c.completed_at,
    tagIds: tagIdsByCard.get(c.id) ?? [],
  }));

  const members: ProfileRow[] = (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));

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
          }}
          columns={columns ?? []}
          cards={cards}
          tags={tags ?? []}
          members={members}
          boardMembers={bmList}
          profilesById={profilesById}
        />
      </BoardThemeScope>
    </>
  );
}
