import Link from "next/link";
import { OrgMembersTable } from "@/components/organization/OrgMembersTable";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";
import { PendingInvitesTable, type PendingInviteRow } from "@/components/settings/pending-invites-table";
import { btnBoardSecondary } from "@/lib/ui-classes";
import type { OrgMemberRow } from "@nextgen/contracts";

type Props = {
  orgId: string;
  orgName: string;
  members: OrgMemberRow[];
  pendingInvites: PendingInviteRow[];
  canManageMembers: boolean;
  currentUserId: string;
  currentUserIsOwner: boolean;
  multiOwnerEnabled: boolean;
  showPermissionsLink?: boolean;
};

export function UsersManagementPanel({
  orgId,
  orgName,
  members,
  pendingInvites,
  canManageMembers,
  currentUserId,
  currentUserIsOwner,
  multiOwnerEnabled,
  showPermissionsLink = true,
}: Props) {
  return (
    <div className="space-y-8" data-testid="users-management-page">
      <section className="space-y-4" data-testid="org-members-page">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-aurora-fg">Usuarios</h2>
            <p className="text-sm text-aurora-muted">
              {members.length} membro(s) em <span className="font-medium text-aurora-fg">{orgName}</span>.
            </p>
          </div>
          {showPermissionsLink ? (
            <Link href="/settings/permissions" className={btnBoardSecondary} data-testid="users-permissions-link">
              Permissoes por usuario
            </Link>
          ) : null}
        </div>
        <OrgMembersTable
          orgId={orgId}
          members={members}
          canManage={canManageMembers}
          currentUserId={currentUserId}
          currentUserIsOwner={currentUserIsOwner}
          multiOwnerEnabled={multiOwnerEnabled}
        />
      </section>

      {canManageMembers ? (
        <section id="convites" className="space-y-6 scroll-mt-4" data-testid="org-invites-section">
          <OrgInviteForm
            orgId={orgId}
            canManage={canManageMembers}
            multiOwnerEnabled={multiOwnerEnabled}
            currentUserIsOwner={currentUserIsOwner}
          />

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-aurora-fg">Convites pendentes</h3>
            <PendingInvitesTable orgId={orgId} invites={pendingInvites} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
