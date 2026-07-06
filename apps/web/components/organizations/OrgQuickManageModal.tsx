"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { DeleteOrganizationSection } from "@/components/organization/DeleteOrganizationSection";
import { MultiOwnerToggle } from "@/components/organization/MultiOwnerToggle";
import { LeaveOrganizationSection } from "@/components/organization/LeaveOrganizationSection";
import { OrgInviteForm } from "@/components/organization/OrgInviteForm";
import { OrgMembersTable } from "@/components/organization/OrgMembersTable";
import { TransferOwnershipDialog } from "@/components/organization/TransferOwnershipDialog";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgLogoUploader } from "@/components/organizations/OrgLogoUploader";
import { OrgSettingsForm } from "@/components/organization/OrgSettingsForm";
import { MoveProjectDialog } from "@/components/organizations/MoveProjectDialog";
import { setActiveOrgAction } from "@/app/(app)/settings/organizations/actions";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { btnBoardSecondary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow } from "@nextgen/contracts";
import type { OrgPendingInvite } from "@/lib/load-organizations-overview";
import { DepartmentsPanel } from "@/components/departments/DepartmentsPanel";
import type { DepartmentOverview } from "@/components/departments/DepartmentsPanel";

type OrgOption = { orgId: string; name: string };
type BoardOverview = { id: string; name: string; color?: string | null };

type Props = {
  orgId: string;
  orgName: string;
  orgLegalName: string;
  orgCnpj: string;
  orgSlug: string;
  logoUrl: string | null;
  isActive: boolean;
  boards: BoardOverview[];
  canMoveBoards: boolean;
  targetOrgs: OrgOption[];
  canManageMembers: boolean;
  canManageIdentity: boolean;
  isOwner: boolean;
  multiOwnerEnabled: boolean;
  currentUserId: string;
  members: OrgMemberRow[];
  pendingInvites: OrgPendingInvite[];
  departments: DepartmentOverview[];
  onClose: () => void;
};

type Tab = "identity" | "members" | "invites" | "departments" | "projects" | "advanced";

export function OrgQuickManageModal({
  orgId,
  orgName,
  orgLegalName,
  orgCnpj,
  orgSlug,
  logoUrl,
  isActive,
  boards,
  canMoveBoards,
  targetOrgs,
  canManageMembers,
  canManageIdentity,
  isOwner,
  multiOwnerEnabled,
  currentUserId,
  members,
  pendingInvites,
  departments,
  onClose,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("members");
  const [moveBoard, setMoveBoard] = useState<{ id: string; name: string } | null>(null);
  const [pendingActive, startActive] = useTransition();
  const showProjectsTab = boards.length > 0 || canMoveBoards;

  function makeActive() {
    startActive(async () => {
      const res = await setActiveOrgAction(orgId);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success(`${orgName} definida como ativa`);
      router.refresh();
      onClose();
    });
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${
      active ? "bg-aurora-accent-muted text-aurora-accent" : "text-aurora-muted hover:bg-aurora-surface-2"
    }`;

  return (
    <>
    <AuroraModal
      open
      onClose={onClose}
      title={orgName}
      subtitle={canManageMembers ? "Gerenciar organizacao" : "Visualizar organizacao"}
      size="lg"
      testId="org-quick-manage-modal"
      headerExtra={<OrgLogo name={orgName} logoUrl={logoUrl} size="md" />}
    >
      <div className="space-y-4">
        {!isActive ? (
          <button
            type="button"
            onClick={makeActive}
            disabled={pendingActive}
            className={btnBoardSecondary + " text-sm"}
            data-testid={`set-active-org-${orgId}`}
          >
            Tornar ativa
          </button>
        ) : null}

        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-aurora-border px-1 pb-2">
          {canManageIdentity ? (
            <button type="button" onClick={() => setTab("identity")} className={tabClass(tab === "identity")} data-testid="org-quick-tab-identity">
              Identidade
            </button>
          ) : null}
          <button type="button" onClick={() => setTab("members")} className={tabClass(tab === "members")} data-testid="org-quick-tab-members">
            Membros
          </button>
          {canManageIdentity ? (
            <button type="button" onClick={() => setTab("departments")} className={tabClass(tab === "departments")} data-testid="org-quick-tab-departments">
              Departamentos
            </button>
          ) : departments.some((d) => d.myRole === "manager") ? (
            <button type="button" onClick={() => setTab("departments")} className={tabClass(tab === "departments")} data-testid="org-quick-tab-departments">
              Departamentos
            </button>
          ) : null}
          {canManageMembers ? (
            <button type="button" onClick={() => setTab("invites")} className={tabClass(tab === "invites")} data-testid="org-quick-tab-invites">
              Convites
            </button>
          ) : null}
          {showProjectsTab ? (
            <button type="button" onClick={() => setTab("projects")} className={tabClass(tab === "projects")} data-testid="org-quick-tab-projects">
              Projetos
            </button>
          ) : null}
          {canManageIdentity ? (
            <button type="button" onClick={() => setTab("advanced")} className={tabClass(tab === "advanced")} data-testid="org-quick-tab-advanced">
              Avancado
            </button>
          ) : null}
        </div>

        {tab === "identity" && canManageIdentity ? (
          <div className="space-y-4">
            <OrgSettingsForm
              orgId={orgId}
              initialLegalName={orgLegalName}
              initialDisplayName={orgName}
              initialCnpj={orgCnpj}
              initialSlug={orgSlug}
              canManage={canManageIdentity}
            />
            <OrgLogoUploader orgId={orgId} orgName={orgName} logoUrl={logoUrl} canManage={canManageIdentity} />
          </div>
        ) : tab === "identity" ? (
          <div className="flex items-center gap-3">
            <OrgLogo name={orgName} logoUrl={logoUrl} size="xl" />
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
        ) : tab === "departments" ? (
          <DepartmentsPanel
            orgId={orgId}
            canManageDepartments={canManageIdentity}
            orgMembers={members}
            currentUserId={currentUserId}
            departments={departments}
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
        ) : tab === "projects" ? (
          <ul className="divide-y divide-aurora-border rounded-lg border border-aurora-border">
            {boards.length === 0 ? (
              <li className="px-4 py-4 text-sm text-aurora-muted">Nenhum projeto nesta organizacao.</li>
            ) : (
              boards.map((board) => {
                const tint = board.color || DEFAULT_BOARD_COLOR;
                const canMove = canMoveBoards && targetOrgs.length > 0;
                return (
                  <li
                    key={board.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    data-testid={`org-project-row-${board.id}`}
                  >
                    <span
                      className="truncate text-sm font-medium text-aurora-fg"
                      style={{ borderLeft: `3px solid ${tint}`, paddingLeft: 8 }}
                    >
                      {board.name}
                    </span>
                    {canMove ? (
                      <button
                        type="button"
                        onClick={() => setMoveBoard({ id: board.id, name: board.name })}
                        className="rounded-md border border-aurora-danger/40 px-2 py-1 text-xs text-aurora-danger hover:bg-aurora-danger/10"
                        data-testid={`move-project-${board.id}`}
                      >
                        Mover
                      </button>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
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

    {moveBoard ? (
      <MoveProjectDialog
        boardId={moveBoard.id}
        boardName={moveBoard.name}
        sourceOrgName={orgName}
        targetOrgs={targetOrgs}
        onClose={() => setMoveBoard(null)}
      />
    ) : null}
  </>
  );
}
