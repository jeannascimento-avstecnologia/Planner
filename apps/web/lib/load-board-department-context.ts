import { createClient } from "@/lib/supabase/server";
import { canMoveBoardDepartment } from "@/lib/department-roles";
import { isOrgAdminRole, isOrgOwnerRole } from "@/lib/org-member-roles";

export type BoardDepartmentOption = {
  id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
};

export type BoardDepartmentContext = {
  canMove: boolean;
  currentDepartmentId: string | null;
  options: BoardDepartmentOption[];
};

export async function loadBoardDepartmentContext(boardId: string): Promise<BoardDepartmentContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: board } = await supabase
    .from("boards")
    .select("org_id, department_id")
    .eq("id", boardId)
    .maybeSingle();
  if (!board) return null;

  const [{ data: membership }, { data: departments }, { data: myDeptMemberships }] = await Promise.all([
    supabase.from("memberships").select("role").eq("org_id", board.org_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("departments").select("id, name, icon, color").eq("org_id", board.org_id).order("name"),
    supabase.from("department_members").select("department_id, role").eq("org_id", board.org_id).eq("user_id", user.id),
  ]);

  const deptRoleById = new Map((myDeptMemberships ?? []).map((m) => [m.department_id, m.role]));
  const isOwner = isOrgOwnerRole(membership?.role);
  const canWrite = isOrgAdminRole(membership?.role) || isOwner;

  const sourceRole = board.department_id ? deptRoleById.get(board.department_id) ?? null : null;
  const options: BoardDepartmentOption[] = [{ id: null, name: "Geral", icon: null, color: null }];

  for (const d of departments ?? []) {
    const targetRole = deptRoleById.get(d.id) ?? null;
    if (
      canMoveBoardDepartment(
        isOwner,
        canWrite,
        sourceRole,
        targetRole,
        board.department_id,
        d.id,
      )
    ) {
      options.push({ id: d.id, name: d.name, icon: d.icon, color: d.color });
    }
  }

  const canMoveToGeneral = canMoveBoardDepartment(isOwner, canWrite, sourceRole, null, board.department_id, null);
  const canMove =
    options.length > 1 ||
    (canMoveToGeneral && board.department_id !== null) ||
    options.some((o) => o.id !== board.department_id);

  return {
    canMove,
    currentDepartmentId: board.department_id,
    options: canMoveToGeneral ? options : options.filter((o) => o.id !== null),
  };
}
