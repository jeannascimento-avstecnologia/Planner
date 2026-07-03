"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  addDepartmentMemberAction,
  removeDepartmentMemberAction,
  updateDepartmentMemberRoleAction,
} from "@/app/(app)/settings/departments/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { departmentRoleLabel } from "@/lib/department-roles";
import { appToast } from "@/lib/toast";
import type { DepartmentMemberRole } from "@/lib/department-roles";
import type { OrgMemberRow } from "@nextgen/contracts";
import { inputClass, btnBoardSecondary } from "@/lib/ui-classes";

type DeptMember = { user_id: string; role: string; full_name: string | null };

type Props = {
  departmentId: string;
  members: DeptMember[];
  orgMembers: OrgMemberRow[];
  canManage: boolean;
  currentUserId: string;
};

const ROLE_OPTIONS: { value: DepartmentMemberRole; label: string }[] = [
  { value: "viewer", label: "Visualizador" },
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
];

function memberLabel(m: DeptMember): string {
  return m.full_name?.trim() || m.user_id.slice(0, 8);
}

export function DepartmentMembersTable({
  departmentId,
  members,
  orgMembers,
  canManage,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addUserId, setAddUserId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<DeptMember | null>(null);

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableOrgMembers = orgMembers.filter((m) => !memberIds.has(m.user_id));

  function changeRole(userId: string, role: DepartmentMemberRole) {
    startTransition(async () => {
      const res = await updateDepartmentMemberRoleAction({ departmentId, userId, role });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Papel atualizado");
      router.refresh();
    });
  }

  function addMember() {
    if (!addUserId) return;
    startTransition(async () => {
      const res = await addDepartmentMemberAction({ departmentId, userId: addUserId, role: "viewer" });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Membro adicionado");
      setAddUserId("");
      router.refresh();
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      const res = await removeDepartmentMemberAction({ departmentId, userId: removeTarget.user_id });
      if (!res.ok) {
        appToast.error(res.error);
        setRemoveTarget(null);
        return;
      }
      appToast.success("Membro removido");
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canManage && availableOrgMembers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <select
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            className={inputClass + " min-w-[12rem] flex-1"}
            data-testid="department-add-member-select"
          >
            <option value="">Adicionar membro da org...</option>
            {availableOrgMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name?.trim() || m.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button type="button" onClick={addMember} disabled={pending || !addUserId} className={btnBoardSecondary}>
            Adicionar
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm" data-testid="department-members-table">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Membro</th>
              <th className="px-4 py-2 font-semibold">Papel</th>
              {canManage ? <th className="px-4 py-2 font-semibold" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-border bg-aurora-surface">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3 text-aurora-fg">{memberLabel(member)}</td>
                <td className="px-4 py-3">
                  {canManage && member.user_id !== currentUserId ? (
                    <select
                      value={member.role}
                      disabled={pending}
                      onChange={(e) => changeRole(member.user_id, e.target.value as DepartmentMemberRole)}
                      className={inputClass + " text-sm"}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-aurora-muted">{departmentRoleLabel(member.role)}</span>
                  )}
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    {member.user_id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(member)}
                        className="rounded p-1 text-aurora-danger hover:bg-aurora-danger/10"
                        aria-label="Remover membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remover membro?"
        message={removeTarget ? `Remover ${memberLabel(removeTarget)} do departamento?` : ""}
        confirmLabel="Remover"
        pending={pending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
