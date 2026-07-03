import { OrgSettingsForm } from "@/components/organization/OrgSettingsForm";
import { DeleteOrganizationSection } from "@/components/organization/DeleteOrganizationSection";
import { MultiOwnerToggle } from "@/components/organization/MultiOwnerToggle";
import { OrgLogoUploader } from "@/components/organizations/OrgLogoUploader";
import { TransferOwnershipDialog } from "@/components/organization/TransferOwnershipDialog";
import { LeaveOrganizationSection } from "@/components/organization/LeaveOrganizationSection";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";

export default async function OrganizationSettingsPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  return (
    <section className="space-y-8" data-testid="org-settings-page">
      <OrgLogoUploader
        orgId={ctx.orgId}
        orgName={ctx.orgName}
        logoUrl={ctx.orgLogoUrl}
        canManage={ctx.canManageIdentity}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-aurora-fg">Dados da organizacao</h2>
        <OrgSettingsForm
          orgId={ctx.orgId}
          initialLegalName={ctx.orgLegalName}
          initialDisplayName={ctx.orgName}
          initialCnpj={ctx.orgCnpj}
          initialSlug={ctx.orgSlug}
          canManage={ctx.canManageIdentity}
        />
      </div>

      {ctx.canManageIdentity ? (
        <>
      <MultiOwnerToggle orgId={ctx.orgId} enabled={ctx.multiOwnerEnabled} isOwner={ctx.isOwner} />

      {ctx.isOwner && !ctx.multiOwnerEnabled ? (
        <TransferOwnershipDialog
          orgId={ctx.orgId}
          members={ctx.members}
          currentUserId={ctx.currentUserId}
          isOwner={ctx.isOwner}
        />
      ) : null}

      {ctx.isOwner ? <DeleteOrganizationSection orgId={ctx.orgId} orgName={ctx.orgName} /> : null}
        </>
      ) : null}

      {!ctx.isOwner ? <LeaveOrganizationSection orgId={ctx.orgId} orgName={ctx.orgName} /> : null}
    </section>
  );
}
