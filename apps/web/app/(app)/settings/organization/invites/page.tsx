import { createClient } from "@/lib/supabase/server";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";

type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

export default async function OrganizationInvitesPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: pendingRaw } = await supabase
    .from("organization_invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("org_id", ctx.orgId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const pending = (pendingRaw ?? []) as PendingInviteRow[];

  return (
    <section className="space-y-6" data-testid="org-invites-page">
      <OrgInviteForm orgId={ctx.orgId} canManage={ctx.canManage} />

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
    </section>
  );
}
