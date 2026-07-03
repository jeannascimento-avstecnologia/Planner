"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/app/(app)/settings/departments/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { DepartmentMembersTable } from "@/components/departments/DepartmentMembersTable";
import { DepartmentIcon } from "@/components/departments/DepartmentIcon";
import type { DepartmentOverview } from "@/components/departments/DepartmentsPanel";
import { btnBoardSecondary, btnDanger, btnPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow } from "@nextgen/contracts";

type Props = {
  department: DepartmentOverview;
  orgMembers: OrgMemberRow[];
  currentUserId: string;
  canManageDepartments: boolean;
  onClose: () => void;
};

export function DepartmentManageModal({
  department,
  orgMembers,
  currentUserId,
  canManageDepartments,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canManageMembers = canManageDepartments || department.myRole === "manager";

  function saveIdentity(fd: FormData) {
    fd.set("departmentId", department.id);
    startTransition(async () => {
      const res = await updateDepartmentAction(fd);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Departamento atualizado");
      router.refresh();
    });
  }

  function confirmDelete() {
    const fd = new FormData();
    fd.set("departmentId", department.id);
    startTransition(async () => {
      const res = await deleteDepartmentAction(fd);
      if (!res.ok) {
        appToast.error(res.error);
        setDeleteOpen(false);
        return;
      }
      appToast.success("Departamento excluido");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <AuroraModal
        open
        onClose={onClose}
        title={department.name}
        subtitle="Gerenciar departamento"
        size="lg"
        testId="department-manage-modal"
        headerExtra={<DepartmentIcon icon={department.icon} color={department.color} size="sm" />}
      >
        <div className="space-y-6">
          {canManageDepartments ? (
            <form action={saveIdentity} className="space-y-3 rounded-lg border border-aurora-border p-4">
              <p className="text-sm font-medium text-aurora-fg">Identidade</p>
              <input name="name" defaultValue={department.name} required className={inputClass} />
              <div className="flex flex-wrap gap-3">
                <IconPicker name="icon" defaultValue={department.icon ?? undefined} />
                <ColorPicker name="color" defaultValue={department.color ?? undefined} />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={pending} className={btnPrimary}>
                  {pending ? "Salvando..." : "Salvar identidade"}
                </button>
              </div>
            </form>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-aurora-fg">Membros</p>
            <DepartmentMembersTable
              departmentId={department.id}
              members={department.members}
              orgMembers={orgMembers}
              canManage={canManageMembers}
              currentUserId={currentUserId}
            />
          </div>

          {canManageDepartments ? (
            <div className="border-t border-aurora-border pt-4">
              <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger} disabled={pending}>
                Excluir departamento
              </button>
              <p className="mt-1 text-xs text-aurora-muted">Projetos voltam para Geral.</p>
            </div>
          ) : null}
        </div>
      </AuroraModal>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir departamento?"
        message="Membros serao removidos e projetos irao para Geral."
        confirmLabel="Excluir"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
