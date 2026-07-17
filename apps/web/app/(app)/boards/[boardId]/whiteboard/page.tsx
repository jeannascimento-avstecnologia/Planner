import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BoardWhiteboardEditor } from "@/components/board/board-whiteboard-editor";
import { hasBoardPermission } from "@/lib/board-authz";
import type { BoardPermissionCode } from "@nextgen/contracts";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardWhiteboardPage({ params }: Props) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: board } = await supabase
    .from("boards")
    .select("name, org_id, department_id")
    .eq("id", boardId)
    .single();
  if (!board) redirect("/boards");

  const { data: wb } = await supabase
    .from("board_whiteboards")
    .select("snapshot")
    .eq("board_id", boardId)
    .maybeSingle();

  const [{ data: member }, { data: membership }, deptRes] = await Promise.all([
    supabase
      .from("board_members")
      .select("role, preset_id")
      .eq("board_id", boardId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("role")
      .eq("org_id", board.org_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    board.department_id
      ? supabase
          .from("department_members")
          .select("role")
          .eq("department_id", board.department_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { role: string } | null }),
  ]);

  let permissionCodes: BoardPermissionCode[] | null = null;
  if (member?.preset_id) {
    const { data: perms } = await supabase
      .from("access_preset_permissions")
      .select("permission_code")
      .eq("preset_id", member.preset_id);
    if (perms?.length) {
      permissionCodes = perms.map((p) => p.permission_code as BoardPermissionCode);
    }
  }

  const canEdit = hasBoardPermission(
    {
      orgRole: membership?.role ?? null,
      boardRole: member?.role ?? null,
      deptRole: deptRes.data?.role ?? null,
      hasDepartment: Boolean(board.department_id),
      permissionCodes,
    },
    "board.whiteboard.edit",
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Link href={`/boards/${boardId}`} className="text-xs text-aurora-muted hover:text-aurora-fg">
        ← {board.name}
      </Link>
      <h1 className="text-xl font-semibold">Whiteboard</h1>
      <BoardWhiteboardEditor
        boardId={boardId}
        initialSnapshot={(wb?.snapshot as Record<string, unknown>) ?? {}}
        canEdit={canEdit}
        userId={user.id}
      />
    </div>
  );
}
