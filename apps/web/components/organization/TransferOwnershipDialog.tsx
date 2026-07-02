"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferOrgOwnershipAction } from "@/app/(app)/settings/organization/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { btnBoardPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgMemberRow } from "@nextgen/contracts";

type Props = {
  orgId: string;
  members: OrgMemberRow[];
  currentUserId: string;
  isOwner: boolean;
  compact?: boolean;
};

function memberLabel(member: OrgMemberRow): string {
  return member.full_name?.trim() || member.user_id.slice(0, 8);
}

export function TransferOwnershipDialog({ orgId, members, currentUserId, isOwner, compact = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const candidates = members.filter((m) => m.user_id !== currentUserId && m.role !== "owner");

  if (!isOwner) return null;

  function openConfirm() {
    if (!selectedId) {
      appToast.error("Selecione um membro.");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmTransfer() {
    startTransition(async () => {
      const res = await transferOrgOwnershipAction({ orgId, newOwnerId: selectedId });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setConfirmOpen(false);
      appToast.success("Propriedade transferida");
      router.refresh();
    });
  }

  const selected = candidates.find((m) => m.user_id === selectedId);

  return (
    <section
      className={`space-y-4 rounded-xl border border-aurora-danger/30 bg-aurora-surface ${compact ? "p-4" : "max-w-lg p-6"}`}
      data-testid="transfer-ownership-section"
    >
      <div>
        <h2 className={`font-semibold text-aurora-fg ${compact ? "text-sm" : "text-base"}`}>Transferir propriedade</h2>
        <p className="mt-1 text-sm text-aurora-muted">
          Cada organizacao tem um unico proprietario. Voce passara a ser administrador; o membro escolhido sera o
          novo proprietario.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="new-owner" className="text-sm font-medium text-aurora-fg">
          Novo proprietario
        </label>
        <select
          id="new-owner"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={inputClass}
          data-testid="transfer-ownership-select"
        >
          <option value="">Selecione um membro</option>
          {candidates.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {memberLabel(member)} ({orgRoleLabel(member.role)})
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={openConfirm}
        disabled={pending || !selectedId}
        className={`${btnBoardPrimary} border-aurora-danger bg-aurora-danger hover:bg-aurora-danger/90`}
        data-testid="transfer-ownership-open"
      >
        Transferir propriedade
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar transferencia?"
        message={
          selected
            ? `Voce transferira a propriedade para ${memberLabel(selected)}. Esta acao e irreversivel sem nova transferencia pelo novo proprietario.`
            : ""
        }
        confirmLabel="Confirmar transferencia"
        pending={pending}
        onConfirm={confirmTransfer}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
