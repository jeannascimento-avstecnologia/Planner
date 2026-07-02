"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  removeOrgMemberAction,
  updateOrgMemberRoleAction,
} from "@/app/(app)/settings/organization/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow } from "@nextgen/contracts";
import type { OrgManageableRole } from "@nextgen/contracts";

type Props = {
  orgId: string;
  members: OrgMemberRow[];
  canManage?: boolean;
  currentUserId: string;
};

function memberLabel(member: OrgMemberRow): string {
  return member.full_name?.trim() || member.user_id.slice(0, 8);
}

export function OrgMembersTable({ orgId, members, canManage = false, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<OrgMemberRow | null>(null);

  function changeRole(userId: string, role: OrgManageableRole) {
    startTransition(async () => {
      const res = await updateOrgMemberRoleAction({ orgId, userId, role });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Papel atualizado");
      router.refresh();
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      const res = await removeOrgMemberAction({ orgId, userId: removeTarget.user_id });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setRemoveTarget(null);
      appToast.success("Membro removido");
      router.refresh();
    });
  }

  return (
    <div data-testid="org-members-table">
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Membro</th>
              <th className="px-4 py-2 font-semibold">Papel</th>
              {canManage ? <th className="px-4 py-2 font-semibold">Acoes</th> : null}
            </tr>
          </thead>
          <tbody className={`divide-y divide-aurora-border bg-aurora-surface ${pending ? "opacity-70" : ""}`}>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center text-aurora-muted">
                  Nenhum membro encontrado.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const isSelf = member.user_id === currentUserId;
                const isOwner = member.role === "owner";
                return (
                  <tr key={member.user_id} data-testid={`org-member-row-${member.user_id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aurora-surface-2 text-xs font-semibold">
                            {memberLabel(member).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium text-aurora-fg">{memberLabel(member)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && !isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => changeRole(member.user_id, e.target.value as OrgManageableRole)}
                          className="rounded border border-aurora-border bg-aurora-surface px-2 py-1 text-xs"
                          aria-label={`Papel de ${memberLabel(member)}`}
                          data-testid={`org-member-role-${member.user_id}`}
                        >
                          <option value="viewer">Visualizador</option>
                          <option value="admin">Administrador</option>
                          <option value="manager">Gerente</option>
                        </select>
                      ) : (
                        <span className="text-aurora-muted">{orgRoleLabel(member.role)}</span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        {!isSelf && !isOwner ? (
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(member)}
                            className="rounded p-1.5 text-aurora-muted hover:bg-aurora-danger/10 hover:text-aurora-danger"
                            aria-label={`Remover ${memberLabel(member)}`}
                            data-testid={`remove-org-member-${member.user_id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remover membro da organizacao?"
        message={
          removeTarget
            ? `${memberLabel(removeTarget)} perdera acesso a todos os projetos da organizacao.`
            : ""
        }
        confirmLabel="Remover"
        pending={pending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
