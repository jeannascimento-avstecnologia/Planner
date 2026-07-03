"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createOrganizationHubAction } from "@/app/(app)/settings/organizations/actions";
import type { CreatedOrganization } from "@/app/(app)/settings/organizations/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { btnBoardPrimary, btnBoardSecondary, inputClass } from "@/lib/ui-classes";
import { formatCnpj } from "@/lib/org-slug";
import { appToast } from "@/lib/toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (org: CreatedOrganization) => void;
};

export function CreateOrganizationDialog({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createOrganizationHubAction({
        name,
        displayName: displayName || undefined,
        cnpj: cnpj || undefined,
      });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      const supabase = createClient();
      await supabase.auth.refreshSession();
      appToast.success("Organizacao criada");
      if (res.org) onCreated?.(res.org);
      setName("");
      setDisplayName("");
      setCnpj("");
      onClose();
      router.refresh();
    });
  }

  return (
    <AuroraModal
      open={open}
      onClose={onClose}
      title="Criar organizacao"
      size="sm"
      testId="create-org-dialog"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnBoardSecondary} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !name.trim()}
            className={btnBoardPrimary}
            data-testid="create-org-submit"
          >
            {pending ? "Criando..." : "Criar"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-aurora-fg">Nome da empresa</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Razao social ou nome interno"
            data-testid="create-org-name"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-aurora-fg">Nome de exibicao (opcional)</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            placeholder="Como aparece no menu e na Home"
            data-testid="create-org-display-name"
          />
          <p className="text-xs text-aurora-muted">Se vazio, usa o nome da empresa.</p>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-aurora-fg">CNPJ (opcional)</span>
          <input
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            className={inputClass}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            data-testid="create-org-cnpj"
          />
        </label>
      </div>
    </AuroraModal>
  );
}
