"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeBoardMember, updateBoardMemberRole } from "@/app/(app)/boards/[boardId]/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { boardRoleLabel } from "@/lib/board-member-roles";
import { appToast } from "@/lib/toast";
import type { BoardMember } from "./board-member";

type Props = {
  boardId: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onError?: (message: string) => void;
};

function memberLabel(member: BoardMember): string {
  return member.profile?.full_name ?? member.user_id.slice(0, 8);
}

export function BoardMembersList({
  boardId,
  members,
  canManageMembers = false,
  currentUserId = null,
  onError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<BoardMember | null>(null);

  function changeRole(userId: string, role: string) {
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("userId", userId);
    fd.set("role", role);
    startTransition(async () => {
      const res = await updateBoardMemberRole(fd);
      if (!res.ok) onError?.(res.error);
      else router.refresh();
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("userId", removeTarget.user_id);
    startTransition(async () => {
      const res = await removeBoardMember(fd);
      if (!res.ok) {
        onError?.(res.error);
        appToast.error(res.error);
      } else {
        setRemoveTarget(null);
        appToast.success("Membro removido");
        router.refresh();
      }
    });
  }

  return (
    <div data-testid="board-members-list">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-aurora-muted">Membros</p>
      <ul className={`max-h-40 space-y-1 overflow-y-auto text-sm ${pending ? "opacity-70" : ""}`}>
        {members.length === 0 ? (
          <li className="text-aurora-muted">Nenhum integrante com acesso explicito ao projeto.</li>
        ) : (
          members.map((m) => {
            const isSelf = Boolean(currentUserId && m.user_id === currentUserId);
            return (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-aurora-fg">
                <span className="min-w-0 truncate">{memberLabel(m)}</span>
                {canManageMembers && !isSelf ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value)}
                      className="rounded border border-board-border bg-board-surface px-1.5 py-0.5 text-xs"
                      aria-label={`Papel de ${memberLabel(m)}`}
                    >
                      <option value="viewer">Visualizar</option>
                      <option value="admin">Editor</option>
                      <option value="manager">Gerente</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(m)}
                      className="rounded p-1 text-aurora-muted hover:bg-aurora-danger/10 hover:text-aurora-danger"
                      aria-label={`Remover ${memberLabel(m)}`}
                      data-testid={`remove-board-member-${m.user_id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 text-aurora-muted">{boardRoleLabel(m.role)}</span>
                )}
              </li>
            );
          })
        )}
      </ul>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remover acesso ao projeto?"
        message={
          removeTarget
            ? `${memberLabel(removeTarget)} perdera o acesso a este projeto. Essa acao nao pode ser desfeita.`
            : ""
        }
        confirmLabel="Remover"
        pending={pending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
