"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { setActiveOrgAction } from "@/app/(app)/settings/organizations/actions";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { btnBoardSecondary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgOverview } from "@/lib/load-organizations-overview";
import { MoveProjectDialog } from "./MoveProjectDialog";
import { OrgQuickManageModal } from "./OrgQuickManageModal";

type OrgOption = { orgId: string; name: string };

type Props = {
  org: OrgOverview;
  currentUserId: string;
  adminOrgIds: string[];
  allOrgs: OrgOption[];
};

export function OrganizationCard({ org, currentUserId, adminOrgIds, allOrgs }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [moveBoard, setMoveBoard] = useState<{ id: string; name: string } | null>(null);
  const [pendingActive, startActive] = useTransition();

  const targetOrgs = allOrgs.filter(
    (o) => o.orgId !== org.orgId && adminOrgIds.includes(o.orgId),
  );

  function makeActive() {
    startActive(async () => {
      const res = await setActiveOrgAction(org.orgId);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success(`${org.name} definida como ativa`);
      router.refresh();
    });
  }

  return (
    <>
      <article
        className="overflow-hidden rounded-xl border border-aurora-border bg-aurora-surface transition hover:bg-aurora-surface-2/40"
        data-testid={`org-card-${org.orgId}`}
      >
        <header className="flex flex-wrap items-center gap-2 border-b border-aurora-border bg-aurora-surface-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-aurora-muted hover:bg-aurora-surface hover:text-aurora-fg"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <OrgLogo name={org.name} logoUrl={org.logoUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-aurora-fg">{org.name}</h2>
              <span className="rounded-full bg-aurora-accent-muted px-2 py-0.5 text-xs text-aurora-accent">
                {orgRoleLabel(org.role)}
              </span>
              {org.isActive ? (
                <span
                  className="rounded-full border border-aurora-success/40 bg-aurora-success/10 px-2 py-0.5 text-xs text-aurora-success"
                  data-testid={`org-active-badge-${org.orgId}`}
                >
                  Ativa
                </span>
              ) : null}
            </div>
            <p className="text-xs text-aurora-muted">
              {org.boards.length} projeto{org.boards.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!org.isActive ? (
              <button
                type="button"
                onClick={makeActive}
                disabled={pendingActive}
                className={btnBoardSecondary + " text-xs"}
                data-testid={`set-active-org-${org.orgId}`}
              >
                Tornar ativa
              </button>
            ) : null}
            {org.canManage ? (
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="rounded-lg border border-aurora-border p-2 text-aurora-muted transition hover:bg-aurora-surface hover:text-aurora-fg"
                aria-label="Gerenciar organizacao"
                data-testid={`org-manage-${org.orgId}`}
              >
                <Settings2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </header>

        {expanded ? (
          <ul className="divide-y divide-aurora-border">
            {org.boards.length === 0 ? (
              <li className="px-4 py-4 text-sm text-aurora-muted">Nenhum projeto acessivel nesta org.</li>
            ) : (
              org.boards.map((board) => {
                const tint = board.color || DEFAULT_BOARD_COLOR;
                const canMove = org.canMoveBoards && targetOrgs.length > 0;
                return (
                  <li
                    key={board.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    data-testid={`org-project-row-${board.id}`}
                  >
                    <Link
                      href={`/boards/${board.id}`}
                      className="flex min-w-0 items-center gap-2 text-sm font-medium text-aurora-fg hover:underline"
                      style={{ borderLeft: `3px solid ${tint}`, paddingLeft: 8 }}
                    >
                      <span className="truncate">{board.name}</span>
                    </Link>
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
        ) : null}
      </article>

      {manageOpen ? (
        <OrgQuickManageModal
          orgId={org.orgId}
          orgName={org.name}
          logoUrl={org.logoUrl}
          canManage={org.canManage}
          isOwner={org.isOwner}
          multiOwnerEnabled={org.multiOwnerEnabled}
          currentUserId={currentUserId}
          members={org.members}
          pendingInvites={org.pendingInvites}
          onClose={() => setManageOpen(false)}
        />
      ) : null}

      {moveBoard ? (
        <MoveProjectDialog
          boardId={moveBoard.id}
          boardName={moveBoard.name}
          sourceOrgName={org.name}
          targetOrgs={targetOrgs}
          onClose={() => setMoveBoard(null)}
        />
      ) : null}
    </>
  );
}
