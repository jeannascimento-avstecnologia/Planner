import { OrgSettingsForm } from "@/components/organization/OrgSettingsForm";
import { TransferOwnershipDialog } from "@/components/organization/TransferOwnershipDialog";
import { LeaveOrganizationSection } from "@/components/organization/LeaveOrganizationSection";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";

export default async function OrganizationSettingsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  return (
    <section className="space-y-8" data-testid="org-settings-page">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-aurora-fg">Dados da organizacao</h2>
        <OrgSettingsForm
          orgId={ctx.orgId}
          initialName={ctx.orgName}
          initialSlug={ctx.orgSlug}
          canManage={ctx.canManage}
        />
      </div>

      <TransferOwnershipDialog
        orgId={ctx.orgId}
        members={ctx.members}
        currentUserId={ctx.currentUserId}
        isOwner={ctx.isOwner}
      />

      {!ctx.isOwner ? (
        <LeaveOrganizationSection orgId={ctx.orgId} orgName={ctx.orgName} />
      ) : null}
    </section>
  );
}
