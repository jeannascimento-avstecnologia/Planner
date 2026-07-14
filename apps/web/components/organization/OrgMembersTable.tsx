"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { updateMemberCapacityAction } from "@/app/(app)/workload/actions";
import {
  removeOrgMemberAction,
  updateOrgMemberRoleAction,
} from "@/app/(app)/settings/organization/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow, OrgMemberRole } from "@nextgen/contracts";

type Props = {
  orgId: string;
  members: OrgMemberRow[];
  canManage?: boolean;
  currentUserId: string;
  currentUserIsOwner?: boolean;
  multiOwnerEnabled?: boolean;
};

function memberLabel(member: OrgMemberRow): string {
  return member.full_name?.trim() || member.user_id.slice(0, 8);
}

const ROLE_OPTIONS: { value: OrgMemberRole; label: string }[] = [
  { value: "viewer", label: "Visualizador" },
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "owner", label: "Proprietario" },
];

export function OrgMembersTable({
  orgId,
  members,
  canManage = false,
  currentUserId,
  currentUserIsOwner = false,
  multiOwnerEnabled = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<OrgMemberRow | null>(null);

  const ownerCount = members.filter((m) => m.role === "owner").length;

  function changeCapacity(userId: string, raw: string, current: number) {
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 1 || v > 168) {
      appToast.error("Capacidade entre 1 e 168 horas.");
      return;
    }
    if (v === current) return;
    startTransition(async () => {
      const res = await updateMemberCapacityAction({ orgId, userId, weeklyCapacityHours: v });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Capacidade atualizada");
      router.refresh();
    });
  }

  function changeRole(userId: string, role: OrgMemberRole) {
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

  function optionsForMember(member: OrgMemberRow): { value: OrgMemberRole; label: string }[] {
    const base = ROLE_OPTIONS.filter((o) => o.value !== "owner" || (multiOwnerEnabled && currentUserIsOwner));
    if (member.role === "owner" && multiOwnerEnabled && ownerCount <= 1) {
      return [{ value: "owner", label: "Proprietario" }];
    }
    return base;
  }

  function canEditRole(member: OrgMemberRow): boolean {
    if (!canManage) return false;
    if (member.user_id === currentUserId) return false;
    if (member.role === "owner" && !multiOwnerEnabled) return false;
    if (member.role === "owner" && multiOwnerEnabled && !currentUserIsOwner) return false;
    return true;
  }

  function canRemoveMember(member: OrgMemberRow): boolean {
    if (!canManage || member.user_id === currentUserId) return false;
    if (member.role === "owner") {
      return multiOwnerEnabled && currentUserIsOwner && ownerCount > 1;
    }
    return true;
  }

  return (
    <div data-testid="org-members-table">
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Membro</th>
              <th className="px-4 py-2 font-semibold">Papel</th>
              <th className="px-4 py-2 font-semibold">Capacidade (h/sem)</th>
              {canManage ? <th className="px-4 py-2 font-semibold">Acoes</th> : null}
            </tr>
          </thead>
          <tbody className={`divide-y divide-aurora-border bg-aurora-surface ${pending ? "opacity-70" : ""}`}>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-aurora-muted">
                  Nenhum membro encontrado.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const editable = canEditRole(member);
                return (
                  <tr key={member.user_id} data-testid={`org-member-row-${member.user_id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- avatar_url e URL externa arbitraria
                          <img
                            src={member.avatar_url}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aurora-surface-2 text-xs font-semibold">
                            {memberLabel(member).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium text-aurora-fg">{memberLabel(member)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <select
                          value={member.role}
                          onChange={(e) => changeRole(member.user_id, e.target.value as OrgMemberRole)}
                          className="rounded border border-aurora-border bg-aurora-surface px-2 py-1 text-xs"
                          aria-label={`Papel de ${memberLabel(member)}`}
                          data-testid={`org-member-role-${member.user_id}`}
                        >
                          {optionsForMember(member).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-aurora-muted">{orgRoleLabel(member.role)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <input
                          type="number"
                          min={1}
                          max={168}
                          step={1}
                          defaultValue={member.weekly_capacity_hours ?? 40}
                          className="w-16 rounded border border-aurora-border bg-aurora-surface px-2 py-1 text-xs"
                          data-testid={`org-member-capacity-${member.user_id}`}
                          onBlur={(e) =>
                            changeCapacity(member.user_id, e.target.value, member.weekly_capacity_hours ?? 40)
                          }
                        />
                      ) : (
                        <span className="text-aurora-muted tabular-nums">{member.weekly_capacity_hours ?? 40}h</span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        {canRemoveMember(member) ? (
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
