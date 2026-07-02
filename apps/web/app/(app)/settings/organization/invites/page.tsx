import { createClient } from "@/lib/supabase/server";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";

export default async function OrganizationInvitesPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  const pending = ctx.canManageMembers ? ctx.pendingInvites : [];

  return (
    <section className="space-y-6" data-testid="org-invites-page">
      <OrgInviteForm
        orgId={ctx.orgId}
        canManage={ctx.canManageMembers}
        multiOwnerEnabled={ctx.multiOwnerEnabled}
        currentUserIsOwner={ctx.isOwner}
      />

      {ctx.canManageMembers ? (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-aurora-fg">Convites pendentes</h2>
        {pending.length === 0 ? (
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
                {pending.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-3 text-aurora-fg">{invite.email}</td>
                    <td className="px-4 py-3 text-aurora-muted">{orgRoleLabel(invite.role)}</td>
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
        <p className="text-sm text-aurora-muted">Apenas proprietario ou gerente pode enviar convites.</p>
      )}
    </section>
  );
}
