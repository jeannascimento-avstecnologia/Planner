"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createBoard } from "@/app/(app)/boards/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { inputClass, btnPrimary, btnBoardSecondary } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

export type CreateProjectOrgOption = {
  orgId: string;
  name: string;
  isActive: boolean;
  logoUrl: string | null;
  departmentOptions: { id: string | null; label: string }[];
};

type Props = {
  orgOptions: CreateProjectOrgOption[];
  defaultOrgId: string;
  defaultDepartmentId?: string | null;
};

export function CreateProjectForm({ orgOptions, defaultOrgId, defaultDepartmentId = null }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(defaultDepartmentId ?? "general");

  const selectedOrg = orgOptions.find((o) => o.orgId === selectedOrgId) ?? orgOptions[0];
  const deptOptions = selectedOrg?.departmentOptions ?? [{ id: null, label: "Geral" }];

  function close() {
    setOpen(false);
    setFormKey((k) => k + 1);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await createBoard(formData);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Projeto criado");
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnPrimary + " inline-flex items-center gap-2"}
        data-testid="create-project-open"
      >
        <Plus className="h-4 w-4" />
        Novo projeto
      </button>

      <AuroraModal
        open={open}
        onClose={close}
        title="Novo projeto"
        subtitle="Escolha a organizacao e preencha os dados do projeto"
        size="md"
        testId="create-project-modal"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} disabled={pending} className={btnBoardSecondary}>
              Cancelar
            </button>
            <button
              type="submit"
              form="create-project-form"
              disabled={pending}
              className={btnPrimary}
              data-testid="create-project-submit"
            >
              {pending ? "Criando..." : "Criar projeto"}
            </button>
          </div>
        }
      >
        <form
          id="create-project-form"
          key={formKey}
          action={submit}
          className="space-y-4"
          data-testid="create-project-form"
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Organizacao</span>
            <div className="flex items-center gap-2">
              {selectedOrg ? (
                <OrgLogo name={selectedOrg.name} logoUrl={selectedOrg.logoUrl} size="md" />
              ) : null}
              <select
                name="orgId"
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  setSelectedDeptId("general");
                }}
                className={inputClass + " flex-1"}
                data-testid="create-project-org"
                required
              >
                {orgOptions.map((org) => (
                  <option key={org.orgId} value={org.orgId}>
                    {org.name}
                    {org.isActive ? " (ativa)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-aurora-muted">O projeto sera vinculado a esta organizacao.</p>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Departamento</span>
            <select
              name="departmentId"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className={inputClass}
              data-testid="create-project-department"
            >
              {deptOptions.map((d) => (
                <option key={d.id ?? "general"} value={d.id ?? "general"}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Nome do projeto</span>
            <input name="name" placeholder="Ex.: Roadmap Q3" required className={inputClass} autoFocus />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Descricao (opcional)</span>
            <input name="description" placeholder="Breve descricao" className={inputClass} />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <IconPicker name="icon" />
            <ColorPicker name="color" />
          </div>
        </form>
      </AuroraModal>
    </>
  );
}
