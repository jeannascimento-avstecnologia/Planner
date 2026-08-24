"use client";

import { useMemo, useState, useTransition } from "react";
import type { OrgMemberRole } from "@nextgen/contracts";
import { inviteToOrgBatch } from "@/app/(app)/settings/organization/actions";
import { btnBoardPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { z } from "zod";

export type WorkspaceOption = {
  orgId: string;
  name: string;
};

type Props = {
  workspaces: WorkspaceOption[];
};

const emailSchema = z.string().email();

export function UserCreateForm({ workspaces }: Props) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("viewer");
  const defaultWorkspaceIds = useMemo(
    () => (workspaces.length === 1 ? [workspaces[0]!.orgId] : []),
    [workspaces],
  );
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(defaultWorkspaceIds);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const singleWorkspace = workspaces.length === 1;
  const hasWorkspaceSelection = selectedWorkspaceIds.length > 0;

  function toggleWorkspace(orgId: string) {
    if (singleWorkspace) return;
    setWorkspaceError(null);
    setSelectedWorkspaceIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setWorkspaceError(null);

    if (!hasWorkspaceSelection) {
      setWorkspaceError("Selecione pelo menos um workspace.");
      return;
    }

    const parsedEmail = emailSchema.safeParse(email.trim());
    if (!parsedEmail.success) {
      setFormError("Informe um email valido.");
      return;
    }
    if (!fullName.trim()) {
      setFormError("Informe o nome do usuario.");
      return;
    }

    startTransition(async () => {
      const normalizedEmail = parsedEmail.data.toLowerCase();
      const failures: string[] = [];

      for (const orgId of selectedWorkspaceIds) {
        const res = await inviteToOrgBatch({
          orgId,
          invites: [{ email: normalizedEmail, role }],
        });
        if (!res.ok) {
          failures.push(res.error);
          continue;
        }
        const item = res.results[0];
        if (!item?.ok) failures.push(item?.error ?? "Falha ao convidar.");
      }

      if (failures.length > 0) {
        setFormError(failures[0] ?? "Falha ao criar usuario.");
        appToast.error(failures[0] ?? "Falha ao criar usuario.");
        return;
      }

      appToast.success("Convite(s) enviado(s). O usuario recebera acesso aos workspaces selecionados.");
      setFullName("");
      setEmail("");
      setRole("viewer");
      if (!singleWorkspace) setSelectedWorkspaceIds([]);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-aurora-border bg-aurora-bg p-4"
      data-testid="user-create-form"
    >
      <div>
        <h3 className="text-sm font-semibold text-aurora-fg">Novo usuario</h3>
        <p className="text-xs text-aurora-muted">Envia convite por email para os workspaces selecionados.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-aurora-muted" htmlFor="user-create-name">
            Nome
          </label>
          <input
            id="user-create-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            data-testid="user-create-name"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-aurora-muted" htmlFor="user-create-email">
            Email
          </label>
          <input
            id="user-create-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            data-testid="user-create-email"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-aurora-muted" htmlFor="user-create-role">
          Papel padrao
        </label>
        <select
          id="user-create-role"
          value={role}
          onChange={(e) => setRole(e.target.value as OrgMemberRole)}
          className={inputClass}
          data-testid="user-create-role"
        >
          <option value="viewer">Visualizador</option>
          <option value="manager">Gerente</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-aurora-muted">Workspaces *</legend>
        <ul className="space-y-2" data-testid="user-create-workspaces">
          {workspaces.map((ws) => {
            const checked = selectedWorkspaceIds.includes(ws.orgId);
            return (
              <li key={ws.orgId}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-aurora-fg">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={singleWorkspace}
                    onChange={() => toggleWorkspace(ws.orgId)}
                    data-testid={`user-create-workspace-${ws.orgId}`}
                  />
                  {ws.name}
                </label>
              </li>
            );
          })}
        </ul>
        {workspaceError ? (
          <p className="text-xs font-medium text-aurora-danger" data-testid="user-create-workspace-error">
            {workspaceError}
          </p>
        ) : null}
      </fieldset>

      {formError ? <p className="text-xs text-aurora-danger">{formError}</p> : null}

      <button
        type="submit"
        disabled={pending || !hasWorkspaceSelection}
        className={btnBoardPrimary}
        data-testid="user-create-submit"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
