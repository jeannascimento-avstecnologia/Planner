import Link from "next/link";
import { OrgMembersTable } from "@/components/organization/OrgMembersTable";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { btnBoardSecondary } from "@/lib/ui-classes";
import type { OrgMemberRow, OrgMemberRole } from "@nextgen/contracts";

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};

type Props = {
  orgId: string;
  orgName: string;
  members: OrgMemberRow[];
  pendingInvites: PendingInvite[];
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
    <div className="space-y-8">
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

      <section id="convites" className="space-y-6 scroll-mt-4" data-testid="org-invites-page">
        <OrgInviteForm
          orgId={orgId}
          canManage={canManageMembers}
          multiOwnerEnabled={multiOwnerEnabled}
          currentUserIsOwner={currentUserIsOwner}
        />

        {canManageMembers ? (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-aurora-fg">Convites pendentes</h3>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-aurora-muted">Nenhum convite pendente.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-aurora-border">
                <table className="min-w-full text-sm" data-testid="org-pending-invites-table">
                  <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Email</th>
                      <th className="px-4 py-2 font-semibold">Papel</th>
                      <th className="px-4 py-2 font-semibold">Expira em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aurora-border bg-aurora-surface">
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-4 py-3 text-aurora-fg">{invite.email}</td>
                        <td className="px-4 py-3 text-aurora-muted">{orgRoleLabel(invite.role as OrgMemberRole)}</td>
                        <td className="px-4 py-3 text-aurora-muted">
                          {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-aurora-muted">Apenas proprietario ou administrador pode enviar convites.</p>
        )}
      </section>
    </div>
  );
}
