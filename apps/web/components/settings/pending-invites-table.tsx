"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import {
  cancelOrgInvitationAction,
  regenerateOrgInvitationLinkAction,
} from "@/app/(app)/settings/organization/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { appToast } from "@/lib/toast";

export type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
};

type Props = {
  orgId: string;
  invites: PendingInviteRow[];
};

export function PendingInvitesTable({ orgId, invites: initialInvites }: Props) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [pending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<PendingInviteRow | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);

  function handleCopyLink(invite: PendingInviteRow) {
    setCopyingId(invite.id);
    startTransition(async () => {
      const res = await regenerateOrgInvitationLinkAction({ orgId, invitationId: invite.id });
      setCopyingId(null);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      const copied = await copyToClipboard(res.inviteUrl);
      if (copied.ok) {
        appToast.success("Link copiado!");
      } else {
        appToast.error("Nao foi possivel copiar o link.");
      }
    });
  }

  function confirmCancel() {
    if (!cancelTarget) return;
    const removed = cancelTarget;
    setCancelTarget(null);
    setInvites((prev) => prev.filter((i) => i.id !== removed.id));
    startTransition(async () => {
      const res = await cancelOrgInvitationAction({ orgId, invitationId: removed.id });
      if (!res.ok) {
        setInvites((prev) => [...prev, removed].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        appToast.error(res.error);
        return;
      }
      appToast.success("Convite cancelado.");
      router.refresh();
    });
  }

  if (invites.length === 0) {
    return <p className="text-sm text-aurora-muted">Nenhum convite pendente.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm" data-testid="org-pending-invites-table">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Email</th>
              <th className="px-4 py-2 font-semibold">Enviado em</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-border bg-aurora-surface">
            {invites.map((invite) => (
              <tr key={invite.id} data-testid={`org-pending-invite-row-${invite.id}`}>
                <td className="px-4 py-3 text-aurora-fg">{invite.email}</td>
                <td className="px-4 py-3 text-aurora-muted">
                  {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                    Pendente
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleCopyLink(invite)}
                      className="inline-flex items-center gap-1 rounded-md border border-aurora-border bg-aurora-surface px-2 py-1 text-xs text-aurora-fg hover:bg-aurora-surface-2 disabled:opacity-50"
                      data-testid={`org-invite-copy-${invite.id}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copyingId === invite.id ? "..." : "Copiar link"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setCancelTarget(invite)}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-aurora-danger hover:bg-aurora-danger/10"
                      aria-label={`Cancelar convite para ${invite.email}`}
                      data-testid={`org-invite-cancel-${invite.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancelar convite?"
        message={
          cancelTarget
            ? `Cancelar convite para ${cancelTarget.email}? Esta acao nao pode ser desfeita.`
            : ""
        }
        confirmLabel="Cancelar convite"
        pending={pending}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
