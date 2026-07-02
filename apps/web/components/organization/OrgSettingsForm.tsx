"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationAction } from "@/app/(app)/settings/organization/actions";
import { btnPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  initialName: string;
  initialSlug: string;
  canManage: boolean;
};

export function OrgSettingsForm({ orgId, initialName, initialSlug, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-aurora-muted">Apenas o proprietario pode editar a organizacao.</p>;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateOrganizationAction({ orgId, name: name.trim(), slug: slug.trim() });
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
        <label htmlFor="org-name" className="text-sm font-medium text-aurora-fg">
          Nome da organizacao
        </label>
        <input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          data-testid="org-settings-name"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="org-slug" className="text-sm font-medium text-aurora-fg">
          Slug (URL)
        </label>
        <input
          id="org-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          className={inputClass}
          data-testid="org-settings-slug"
        />
        <p className="text-xs text-aurora-muted">Apenas letras minusculas, numeros e hifens.</p>
      </div>
      {error ? <p className="text-sm text-aurora-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className={btnPrimary} data-testid="org-settings-save">
        {pending ? "Salvando..." : "Salvar alteracoes"}
      </button>
    </form>
  );
}
