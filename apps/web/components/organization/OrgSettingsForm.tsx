"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationAction } from "@/app/(app)/settings/organization/actions";
import { formatCnpj, normalizeCnpj } from "@/lib/org-slug";
import { btnPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  initialLegalName: string;
  initialDisplayName: string;
  initialCnpj: string;
  initialSlug: string;
  canManage: boolean;
};

export function OrgSettingsForm({
  orgId,
  initialLegalName,
  initialDisplayName,
  initialCnpj,
  initialSlug,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [legalName, setLegalName] = useState(initialLegalName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [cnpj, setCnpj] = useState(initialCnpj ? formatCnpj(initialCnpj) : "");
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-aurora-muted">Apenas o proprietario pode editar a organizacao.</p>;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateOrganizationAction({
        orgId,
        legalName: legalName.trim(),
        displayName: displayName.trim(),
        cnpj: normalizeCnpj(cnpj),
        previousDisplayName: initialDisplayName,
        currentSlug: initialSlug,
      });
      if (!res.ok) {
        setError(res.error);
        appToast.error(res.error);
        return;
      }
      appToast.success("Organizacao atualizada");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-aurora-border bg-aurora-surface p-6" data-testid="org-settings-form">
      <div className="space-y-1">
        <label htmlFor="org-legal-name" className="text-sm font-medium text-aurora-fg">
          Nome da empresa
        </label>
        <input
          id="org-legal-name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className={inputClass}
          placeholder="Razao social ou nome interno"
          data-testid="org-settings-legal-name"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="org-display-name" className="text-sm font-medium text-aurora-fg">
          Nome de Exibição
        </label>
        <input
          id="org-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClass}
          placeholder="Como aparece no menu e na Home"
          required
          data-testid="org-settings-display-name"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="org-cnpj" className="text-sm font-medium text-aurora-fg">
          CNPJ
        </label>
        <input
          id="org-cnpj"
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
          className={inputClass}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          data-testid="org-settings-cnpj"
        />
      </div>
      {error ? <p className="text-sm text-aurora-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className={btnPrimary} data-testid="org-settings-save">
        {pending ? "Salvando..." : "Salvar alteracoes"}
      </button>
    </form>
  );
}
