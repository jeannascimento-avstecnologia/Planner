"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { createDepartmentAction } from "@/app/(app)/settings/departments/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { DepartmentIcon } from "@/components/departments/DepartmentIcon";
import { DepartmentManageModal } from "@/components/departments/DepartmentManageModal";
import { btnBoardSecondary, btnPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow } from "@nextgen/contracts";

export type DepartmentOverview = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  memberCount: number;
  boardCount: number;
  myRole: string | null;
  members: { user_id: string; role: string; full_name: string | null }[];
};

type Props = {
  orgId: string;
  canManageDepartments: boolean;
  orgMembers: OrgMemberRow[];
  currentUserId: string;
  departments: DepartmentOverview[];
};

export function DepartmentsPanel({
  orgId,
  canManageDepartments,
  orgMembers,
  currentUserId,
  departments,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageDept, setManageDept] = useState<DepartmentOverview | null>(null);
  const [pending, startTransition] = useTransition();

  function submitCreate(fd: FormData) {
    fd.set("orgId", orgId);
    startTransition(async () => {
      const res = await createDepartmentAction(fd);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Departamento criado");
      setCreateOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="departments-panel">
      {canManageDepartments ? (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={btnPrimary + " inline-flex items-center gap-2"}
          data-testid="create-department-open"
        >
          <Plus className="h-4 w-4" />
          Novo departamento
        </button>
      ) : (
        <p className="text-sm text-aurora-muted">Apenas o proprietario pode criar departamentos.</p>
      )}

      {departments.length === 0 ? (
        <p className="text-sm text-aurora-muted">Nenhum departamento nesta organizacao.</p>
      ) : (
        <ul className="divide-y divide-aurora-border rounded-lg border border-aurora-border">
          {departments.map((dept) => (
            <li
              key={dept.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              data-testid={`department-row-${dept.id}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <DepartmentIcon icon={dept.icon} color={dept.color} size="sm" />
                <div>
                  <p className="font-medium text-aurora-fg">{dept.name}</p>
                  <p className="text-xs text-aurora-muted">
                    {dept.memberCount} membro{dept.memberCount === 1 ? "" : "s"} · {dept.boardCount} projeto
                    {dept.boardCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {(canManageDepartments || dept.myRole === "manager") && (
                <button
                  type="button"
                  onClick={() => setManageDept(dept)}
                  className="rounded-lg border border-aurora-border p-2 text-aurora-muted hover:bg-aurora-surface-2"
                  aria-label={`Gerenciar ${dept.name}`}
                  data-testid={`department-manage-${dept.id}`}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <AuroraModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo departamento"
        size="md"
        testId="create-department-modal"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={pending} className={btnBoardSecondary}>
              Cancelar
            </button>
            <button type="submit" form="create-department-form" disabled={pending} className={btnPrimary}>
              {pending ? "Criando..." : "Criar"}
            </button>
          </div>
        }
      >
        <form id="create-department-form" action={submitCreate} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Nome</span>
            <input name="name" required className={inputClass} placeholder="Ex.: RH" data-testid="create-department-name" />
          </label>
          <div className="flex flex-wrap gap-3">
            <IconPicker name="icon" />
            <ColorPicker name="color" />
          </div>
        </form>
      </AuroraModal>

      {manageDept ? (
        <DepartmentManageModal
          department={manageDept}
          orgMembers={orgMembers}
          currentUserId={currentUserId}
          canManageDepartments={canManageDepartments}
          onClose={() => setManageDept(null)}
        />
      ) : null}
    </div>
  );
}
