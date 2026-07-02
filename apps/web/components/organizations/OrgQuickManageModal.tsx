"use client";

import { useState } from "react";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { DeleteOrganizationSection } from "@/components/organization/DeleteOrganizationSection";
import { MultiOwnerToggle } from "@/components/organization/MultiOwnerToggle";
import { LeaveOrganizationSection } from "@/components/organization/LeaveOrganizationSection";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";
import { OrgMembersTable } from "@/components/organization/OrgMembersTable";
import { TransferOwnershipDialog } from "@/components/organization/TransferOwnershipDialog";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgLogoUploader } from "@/components/organizations/OrgLogoUploader";
import { orgRoleLabel } from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";
import type { OrgPendingInvite } from "@/lib/load-organizations-overview";

type Props = {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  canManage: boolean;
  isOwner: boolean;
  multiOwnerEnabled: boolean;
  currentUserId: string;
  members: OrgMemberRow[];
  pendingInvites: OrgPendingInvite[];
  onClose: () => void;
};

type Tab = "identity" | "members" | "invites" | "advanced";

export function OrgQuickManageModal({
  orgId,
  orgName,
  logoUrl,
  canManage,
  isOwner,
  multiOwnerEnabled,
  currentUserId,
  members,
  pendingInvites,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("identity");

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${
      active ? "bg-aurora-accent-muted text-aurora-accent" : "text-aurora-muted hover:bg-aurora-surface-2"
    }`;

  return (
    <AuroraModal
      open
      onClose={onClose}
      title={orgName}
      subtitle="Gerenciar organizacao"
      size="lg"
      testId="org-quick-manage-modal"
      headerExtra={<OrgLogo name={orgName} logoUrl={logoUrl} size="sm" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-aurora-border pb-2">
          <button type="button" onClick={() => setTab("identity")} className={tabClass(tab === "identity")} data-testid="org-quick-tab-identity">
            Identidade
          </button>
          <button type="button" onClick={() => setTab("members")} className={tabClass(tab === "members")} data-testid="org-quick-tab-members">
            Membros
          </button>
          <button type="button" onClick={() => setTab("invites")} className={tabClass(tab === "invites")} data-testid="org-quick-tab-invites">
            Convites
          </button>
          {canManage ? (
            <button type="button" onClick={() => setTab("advanced")} className={tabClass(tab === "advanced")} data-testid="org-quick-tab-advanced">
              Avancado
            </button>
          ) : null}
        </div>

        {tab === "identity" ? (
          <OrgLogoUploader orgId={orgId} orgName={orgName} logoUrl={logoUrl} canManage={canManage} />
        ) : tab === "members" ? (
          <OrgMembersTable
            orgId={orgId}
            members={members}
            canManage={canManage}
            currentUserId={currentUserId}
            currentUserIsOwner={isOwner}
            multiOwnerEnabled={multiOwnerEnabled}
          />
        ) : tab === "invites" ? (
          <div className="space-y-4">
            <OrgInviteForm
              orgId={orgId}
              canManage={canManage}
              multiOwnerEnabled={multiOwnerEnabled}
              currentUserIsOwner={isOwner}
            />
            {pendingInvites.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-aurora-border">
                <table className="min-w-full text-sm" data-testid="org-quick-pending-invites">
                  <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Email</th>
                      <th className="px-4 py-2 font-semibold">Papel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aurora-border bg-aurora-surface">
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-4 py-3 text-aurora-fg">{invite.email}</td>
                        <td className="px-4 py-3 text-aurora-muted">{orgRoleLabel(invite.role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-aurora-muted">Nenhum convite pendente.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4" data-testid="org-quick-advanced-panel">
            <MultiOwnerToggle orgId={orgId} enabled={multiOwnerEnabled} isOwner={isOwner} />
            {isOwner && !multiOwnerEnabled ? (
              <TransferOwnershipDialog
                orgId={orgId}
                members={members}
                currentUserId={currentUserId}
                isOwner={isOwner}
                compact
              />
            ) : null}
            {isOwner ? <DeleteOrganizationSection orgId={orgId} orgName={orgName} onDeleted={onClose} /> : null}
            {isOwner && multiOwnerEnabled && members.filter((m) => m.role === "owner").length > 1 ? (
              <LeaveOrganizationSection orgId={orgId} orgName={orgName} />
            ) : null}
            {!isOwner ? <LeaveOrganizationSection orgId={orgId} orgName={orgName} /> : null}
          </div>
        )}
      </div>
    </AuroraModal>
  );
}
