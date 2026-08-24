import { redirect } from "next/navigation";
import { UsersManagementPanel } from "@/components/settings/users-management-panel";
import { UserCreateForm } from "@/components/settings/user-create-form";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { loadOrganizationsOverview } from "@/lib/load-organizations-overview";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsUsersPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const overview = await loadOrganizationsOverview();
  const workspaces =
    overview?.orgs
      .filter((o) => o.canManageMembers)
      .map((o) => ({ orgId: o.orgId, name: o.name })) ?? [];

  const pending = ctx.canManageMembers ? ctx.pendingInvites : [];

  return (
    <div className="space-y-8">
      {ctx.canManageMembers && workspaces.length > 0 ? (
        <UserCreateForm workspaces={workspaces} />
      ) : null}
      <UsersManagementPanel
        orgId={ctx.orgId}
        orgName={ctx.orgName}
        members={ctx.members}
        pendingInvites={pending}
        canManageMembers={ctx.canManageMembers}
        currentUserId={ctx.currentUserId}
        currentUserIsOwner={ctx.isOwner}
        multiOwnerEnabled={ctx.multiOwnerEnabled}
      />
    </div>
  );
}
