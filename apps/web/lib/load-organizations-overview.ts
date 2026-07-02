import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, listUserOrgs } from "@/lib/active-org";
import { canManageOrg, isOrgOwnerRole } from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";

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
  slug: string;
  logoUrl: string | null;
  multiOwnerEnabled: boolean;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  canManage: boolean;
  canMoveBoards: boolean;
  boards: OrgOverviewBoard[];
  members: OrgMemberRow[];
  pendingInvites: OrgPendingInvite[];
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

  const adminOrgIds = userOrgs.filter((o) => canManageOrg(o.role)).map((o) => o.orgId);

  const orgs: OrgOverview[] = await Promise.all(
    userOrgs.map(async (org) => {
      const canManage = canManageOrg(org.role);
      let members: OrgMemberRow[] = [];
      let pendingInvites: OrgPendingInvite[] = [];
      let multiOwnerEnabled = false;

      if (canManage) {
        const [{ data: orgRow }, { data: membersRaw }, { data: pendingRaw }] = await Promise.all([
          supabase.from("organizations").select("multi_owner_enabled").eq("id", org.orgId).single(),
          supabase.rpc("list_org_members", { p_org: org.orgId }),
          supabase
            .from("organization_invitations")
            .select("id, email, role, expires_at")
            .eq("org_id", org.orgId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false }),
        ]);
        multiOwnerEnabled = orgRow?.multi_owner_enabled ?? false;
        members = (membersRaw ?? []) as OrgMemberRow[];
        pendingInvites = (pendingRaw ?? []) as OrgPendingInvite[];
      }

      return {
        orgId: org.orgId,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        multiOwnerEnabled,
        role: org.role,
        isOwner: isOrgOwnerRole(org.role),
        isActive: org.orgId === activeOrgId,
        canManage,
        canMoveBoards: canManage,
        boards: boardsByOrg.get(org.orgId) ?? [],
        members,
        pendingInvites,
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
