import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, listUserOrgs } from "@/lib/active-org";
import {
  canManageOrgIdentity,
  canManageOrgMembers,
  isOrgOwnerRole,
} from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";
import type { DepartmentOverview } from "@/components/departments/DepartmentsPanel";

export type OrgOverviewBoard = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  boardRole: string | null;
};

export type OrgPendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};

export type OrgOverview = {
  orgId: string;
  name: string;
  legalName: string;
  cnpj: string;
  slug: string;
  logoUrl: string | null;
  multiOwnerEnabled: boolean;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  canManageMembers: boolean;
  canManageIdentity: boolean;
  /** @deprecated use canManageMembers */
  canManage: boolean;
  canMoveBoards: boolean;
  boards: OrgOverviewBoard[];
  members: OrgMemberRow[];
  pendingInvites: OrgPendingInvite[];
  departments: DepartmentOverview[];
};

export type OrganizationsOverviewData = {
  activeOrgId: string | null;
  currentUserId: string;
  orgs: OrgOverview[];
  adminOrgIds: string[];
};

export async function loadOrganizationsOverview(): Promise<OrganizationsOverviewData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userOrgs = await listUserOrgs();
  const activeOrgId = await getActiveOrgId();

  const { data: boardsRaw } = await supabase
    .from("boards")
    .select("id, org_id, name, icon, color")
    .order("created_at", { ascending: true });

  const boardIds = (boardsRaw ?? []).map((b) => b.id);
  const { data: myBoardRoles } = boardIds.length
    ? await supabase
        .from("board_members")
        .select("board_id, role")
        .eq("user_id", user.id)
        .in("board_id", boardIds)
    : { data: [] as { board_id: string; role: string }[] };

  const boardRoleById = new Map((myBoardRoles ?? []).map((r) => [r.board_id, r.role]));
  const boardsByOrg = new Map<string, OrgOverviewBoard[]>();

  for (const board of boardsRaw ?? []) {
    const list = boardsByOrg.get(board.org_id) ?? [];
    list.push({
      id: board.id,
      name: board.name,
      icon: board.icon,
      color: board.color,
      boardRole: boardRoleById.get(board.id) ?? null,
    });
    boardsByOrg.set(board.org_id, list);
  }

  const orgIds = userOrgs.map((o) => o.orgId);
  const [{ data: departmentsRaw }, { data: deptMembersRaw }] = await Promise.all([
    orgIds.length
      ? supabase.from("departments").select("id, org_id, name, icon, color").in("org_id", orgIds)
      : Promise.resolve({ data: [] as { id: string; org_id: string; name: string; icon: string | null; color: string | null }[] }),
    orgIds.length
      ? supabase.from("department_members").select("department_id, org_id, user_id, role").in("org_id", orgIds)
      : Promise.resolve({ data: [] as { department_id: string; org_id: string; user_id: string; role: string }[] }),
  ]);

  const profileIds = [...new Set((deptMembersRaw ?? []).map((m) => m.user_id))];
  const { data: dmProfiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profileNameById = new Map((dmProfiles ?? []).map((p) => [p.id, p.full_name]));

  const boardsByDept = new Map<string, number>();
  for (const b of boardsRaw ?? []) {
    const deptId = (b as { department_id?: string | null }).department_id;
    if (deptId) boardsByDept.set(deptId, (boardsByDept.get(deptId) ?? 0) + 1);
  }

  const membersByDept = new Map<string, { user_id: string; role: string; full_name: string | null }[]>();
  for (const m of deptMembersRaw ?? []) {
    const list = membersByDept.get(m.department_id) ?? [];
    list.push({ user_id: m.user_id, role: m.role, full_name: profileNameById.get(m.user_id) ?? null });
    membersByDept.set(m.department_id, list);
  }

  const deptsByOrg = new Map<string, DepartmentOverview[]>();
  for (const d of departmentsRaw ?? []) {
    const members = membersByDept.get(d.id) ?? [];
    const myRole = members.find((m) => m.user_id === user.id)?.role ?? null;
    const list = deptsByOrg.get(d.org_id) ?? [];
    list.push({
      id: d.id,
      name: d.name,
      icon: d.icon,
      color: d.color,
      memberCount: members.length,
      boardCount: boardsByDept.get(d.id) ?? 0,
      myRole,
      members,
    });
    deptsByOrg.set(d.org_id, list);
  }

  const adminOrgIds = userOrgs.filter((o) => canManageOrgMembers(o.role)).map((o) => o.orgId);

  const orgs: OrgOverview[] = await Promise.all(
    userOrgs.map(async (org) => {
      const canManageMembers = canManageOrgMembers(org.role);
      const canManageIdentity = canManageOrgIdentity(org.role);
      let members: OrgMemberRow[] = [];
      let pendingInvites: OrgPendingInvite[] = [];
      let multiOwnerEnabled = false;

      const [{ data: orgRow }, { data: membersRaw }] = await Promise.all([
        supabase.from("organizations").select("multi_owner_enabled, legal_name, cnpj").eq("id", org.orgId).single(),
        supabase.rpc("list_org_members", { p_org: org.orgId }),
      ]);
      multiOwnerEnabled = orgRow?.multi_owner_enabled ?? false;
      members = (membersRaw ?? []) as OrgMemberRow[];

      if (canManageMembers) {
        const { data: pendingRaw } = await supabase
          .from("organization_invitations")
          .select("id, email, role, expires_at")
          .eq("org_id", org.orgId)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });
        pendingInvites = (pendingRaw ?? []) as OrgPendingInvite[];
      }

      return {
        orgId: org.orgId,
        name: org.name,
        legalName: orgRow?.legal_name ?? "",
        cnpj: orgRow?.cnpj ?? "",
        slug: org.slug,
        logoUrl: org.logoUrl,
        multiOwnerEnabled,
        role: org.role,
        isOwner: isOrgOwnerRole(org.role),
        isActive: org.orgId === activeOrgId,
        canManageMembers,
        canManageIdentity,
        canManage: canManageMembers,
        canMoveBoards: canManageMembers,
        boards: boardsByOrg.get(org.orgId) ?? [],
        members,
        pendingInvites,
        departments: deptsByOrg.get(org.orgId) ?? [],
      };
    }),
  );

  return {
    activeOrgId,
    currentUserId: user.id,
    orgs,
    adminOrgIds,
  };
}
