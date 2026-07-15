"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganizationAction } from "@/app/(app)/settings/organization/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { btnBoardPrimary, inputClassSm } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  orgName: string;
  onDeleted?: () => void;
};

export function DeleteOrganizationSection({ orgId, orgName, onDeleted }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  function confirmDelete() {
    if (confirmName.trim() !== orgName.trim()) {
      appToast.error("Digite o nome da organizacao exatamente como exibido.");
      return;
    }
    startTransition(async () => {
      const res = await deleteOrganizationAction(orgId);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setOpen(false);
      setConfirmName("");
      appToast.success("Organizacao excluida");
      onDeleted?.();
      router.push(res.nextPath ?? "/boards");
      router.refresh();
    });
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-aurora-danger/40 bg-aurora-danger/5 p-4"
      data-testid="delete-organization-section"
    >
      <div>
        <h3 className="text-sm font-semibold text-aurora-danger">Excluir organizacao</h3>
        <p className="mt-1 text-sm text-aurora-muted">
          Remove permanentemente {orgName}, todos os projetos, membros e convites. Esta acao nao pode ser desfeita.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnBoardPrimary} border-aurora-danger bg-aurora-danger hover:bg-aurora-danger/90`}
        data-testid="delete-organization-open"
      >
        Excluir organizacao
      </button>

      <AuroraModal
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirmName("");
        }}
        title="Excluir organizacao?"
        size="sm"
        role="alertdialog"
        showClose={false}
        zIndex={210}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmName("");
              }}
              disabled={pending}
              className="rounded-md border border-aurora-border px-3 py-1.5 text-sm text-aurora-fg hover:bg-aurora-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={pending}
              className="rounded-md bg-aurora-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              data-testid="delete-organization-confirm"
            >
              {pending ? "Aguarde..." : "Excluir permanentemente"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-aurora-muted">
            Todos os projetos e dados de <strong className="text-aurora-fg">{orgName}</strong> serao apagados. Digite
            o nome da organizacao para confirmar.
          </p>
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={orgName}
            className={inputClassSm + " w-full"}
            data-testid="delete-organization-confirm-input"
          />
        </div>
      </AuroraModal>
    </section>
  );
}
