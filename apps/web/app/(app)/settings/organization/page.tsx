import { OrgMembersTable } from "@/components/organization/OrgMembersTable";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";

export default async function OrganizationMembersPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  return (
    <section className="space-y-4" data-testid="org-members-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Membros</h2>
        <p className="text-sm text-aurora-muted">
          {ctx.members.length} membro(s) na organizacao.
        </p>
      </div>
      <OrgMembersTable
        orgId={ctx.orgId}
        members={ctx.members}
        canManage={ctx.canManage}
        currentUserId={ctx.currentUserId}
      />
    </section>
  );
}
