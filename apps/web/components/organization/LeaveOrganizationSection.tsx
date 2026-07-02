"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveOrganizationAction } from "@/app/(app)/settings/organization/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { btnBoardPrimary } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  orgName: string;
};

export function LeaveOrganizationSection({ orgId, orgName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function confirmLeave() {
    startTransition(async () => {
      const res = await leaveOrganizationAction(orgId);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setOpen(false);
      appToast.success("Voce saiu da organizacao");
      router.push("/boards");
      router.refresh();
    });
  }

  return (
    <section
      className="max-w-lg space-y-3 rounded-xl border border-aurora-danger/30 bg-aurora-surface p-6"
      data-testid="leave-organization-section"
    >
      <div>
        <h2 className="text-base font-semibold text-aurora-fg">Sair da organizacao</h2>
        <p className="mt-1 text-sm text-aurora-muted">
          Voce perdera acesso a {orgName} e todos os projetos associados.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnBoardPrimary} border-aurora-danger bg-aurora-danger hover:bg-aurora-danger/90`}
        data-testid="leave-organization-open"
      >
        Sair da organizacao
      </button>

      <ConfirmDialog
        open={open}
        title="Sair da organizacao?"
        message={`Tem certeza que deseja sair de ${orgName}?`}
        confirmLabel="Sair"
        pending={pending}
        onConfirm={confirmLeave}
        onCancel={() => setOpen(false)}
      />
    </section>
  );
}
