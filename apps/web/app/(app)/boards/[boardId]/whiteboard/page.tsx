import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BoardWhiteboardEditor } from "@/components/board/board-whiteboard-editor";
import { canWriteBoard } from "@/lib/board-member-roles";
import { isOrgAdminRole } from "@/lib/org-member-roles";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardWhiteboardPage({ params }: Props) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: board } = await supabase.from("boards").select("name").eq("id", boardId).single();
  if (!board) redirect("/boards");

  const { data: wb } = await supabase.from("board_whiteboards").select("snapshot").eq("board_id", boardId).maybeSingle();
  const { data: member } = await supabase.from("board_members").select("role").eq("board_id", boardId).eq("user_id", user.id).maybeSingle();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link href={`/boards/${boardId}`} className="text-xs text-aurora-muted hover:text-aurora-fg">
        ← {board.name}
      </Link>
      <h1 className="text-xl font-semibold">Whiteboard</h1>
      <BoardWhiteboardEditor
        boardId={boardId}
        initialSnapshot={(wb?.snapshot as Record<string, unknown>) ?? {}}
        canEdit={canWriteBoard(isOrgAdminRole(membership?.role), member?.role)}
        userId={user.id}
      />
    </div>
  );
}
