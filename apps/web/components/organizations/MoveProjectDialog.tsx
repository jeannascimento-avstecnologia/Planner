"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveBoardToOrgAction } from "@/app/(app)/settings/organizations/actions";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { btnBoardPrimary, btnBoardSecondary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type TargetOrg = { orgId: string; name: string };

type Props = {
  boardId: string;
  boardName: string;
  sourceOrgName: string;
  targetOrgs: TargetOrg[];
  onClose: () => void;
};

export function MoveProjectDialog({ boardId, boardName, sourceOrgName, targetOrgs, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [targetOrgId, setTargetOrgId] = useState(targetOrgs[0]?.orgId ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const targetName = targetOrgs.find((o) => o.orgId === targetOrgId)?.name ?? "";

  function submit() {
    if (step === 1) {
      if (!targetOrgId) {
        appToast.error("Selecione a organizacao de destino.");
        return;
      }
      setStep(2);
      return;
    }

    startTransition(async () => {
      const res = await moveBoardToOrgAction({ boardId, targetOrgId });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      appToast.success("Projeto movido");
      onClose();
      router.refresh();
    });
  }

  return (
    <AuroraModal
      open
      onClose={onClose}
      title="Mover projeto"
      subtitle={boardName}
      size="sm"
      testId="move-project-dialog"
      role="alertdialog"
      footer={
        <div className="flex justify-end gap-2">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className={btnBoardSecondary}
              disabled={pending}
            >
              Voltar
            </button>
          ) : (
            <button type="button" onClick={onClose} className={btnBoardSecondary} disabled={pending}>
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || (step === 2 && !confirmed)}
            className="rounded-lg border border-aurora-danger/40 bg-aurora-danger/10 px-3 py-2 text-sm font-medium text-aurora-danger hover:bg-aurora-danger/20 disabled:opacity-60"
            data-testid="move-project-confirm"
          >
            {pending ? "Movendo..." : step === 1 ? "Continuar" : "Confirmar movimentacao"}
          </button>
        </div>
      }
    >
      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-aurora-muted">
            Mover <strong className="text-aurora-fg">{boardName}</strong> de{" "}
            <strong className="text-aurora-fg">{sourceOrgName}</strong> para outra organizacao.
          </p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-aurora-fg">Organizacao de destino</span>
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className={inputClass}
              data-testid="move-project-target"
            >
              {targetOrgs.map((o) => (
                <option key={o.orgId} value={o.orgId}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-aurora-danger">
            Esta acao move o projeto e todos os dados vinculados para{" "}
            <strong>{targetName}</strong>. Nao pode ser desfeita facilmente.
          </p>
          <label className="flex items-start gap-2 text-sm text-aurora-fg">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
              data-testid="move-project-checkbox"
            />
            <span>Entendo que o projeto saira de {sourceOrgName} e passara para {targetName}.</span>
          </label>
        </div>
      )}
    </AuroraModal>
  );
}
