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
  canManageMembers: boolean;
  canManageIdentity: boolean;
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
  canManageMembers,
  canManageIdentity,
  isOwner,
  multiOwnerEnabled,
  currentUserId,
  members,
  pendingInvites,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("members");

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${
      active ? "bg-aurora-accent-muted text-aurora-accent" : "text-aurora-muted hover:bg-aurora-surface-2"
    }`;

  return (
    <AuroraModal
      open
      onClose={onClose}
      title={orgName}
      subtitle={canManageMembers ? "Gerenciar organizacao" : "Visualizar organizacao"}
      size="lg"
      testId="org-quick-manage-modal"
      headerExtra={<OrgLogo name={orgName} logoUrl={logoUrl} size="sm" />}
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-aurora-border px-1 pb-2">
          {canManageIdentity ? (
            <button type="button" onClick={() => setTab("identity")} className={tabClass(tab === "identity")} data-testid="org-quick-tab-identity">
              Identidade
            </button>
          ) : null}
          <button type="button" onClick={() => setTab("members")} className={tabClass(tab === "members")} data-testid="org-quick-tab-members">
            Membros
          </button>
          {canManageMembers ? (
            <button type="button" onClick={() => setTab("invites")} className={tabClass(tab === "invites")} data-testid="org-quick-tab-invites">
              Convites
            </button>
          ) : null}
          {canManageIdentity ? (
            <button type="button" onClick={() => setTab("advanced")} className={tabClass(tab === "advanced")} data-testid="org-quick-tab-advanced">
              Avancado
            </button>
          ) : null}
        </div>

        {tab === "identity" && canManageIdentity ? (
          <OrgLogoUploader orgId={orgId} orgName={orgName} logoUrl={logoUrl} canManage={canManageIdentity} />
        ) : tab === "identity" ? (
          <div className="flex items-center gap-3">
            <OrgLogo name={orgName} logoUrl={logoUrl} size="lg" />
            <p className="text-sm text-aurora-muted">Apenas o proprietario pode alterar a identidade da organizacao.</p>
          </div>
        ) : tab === "members" ? (
          <OrgMembersTable
            orgId={orgId}
            members={members}
            canManage={canManageMembers}
            currentUserId={currentUserId}
            currentUserIsOwner={isOwner}
            multiOwnerEnabled={multiOwnerEnabled}
          />
        ) : tab === "invites" && canManageMembers ? (
          <div className="space-y-4">
            <OrgInviteForm
              orgId={orgId}
              canManage={canManageMembers}
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
