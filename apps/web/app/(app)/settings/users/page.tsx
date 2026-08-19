import { redirect } from "next/navigation";
import { UsersManagementPanel } from "@/components/settings/users-management-panel";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export default async function SettingsUsersPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");
  if (!isOrgAdminRole(ctx.userRole)) redirect("/settings");

  const pending = ctx.canManageMembers ? ctx.pendingInvites : [];

  return (
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
  );
}
