"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBoard, updateBoardSettings } from "@/app/(app)/boards/actions";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { ShareProjectPanel, type BoardMember } from "@/components/board/share-project-panel";
import { canManageBoardMembers } from "@/lib/board-member-roles";
import { inputClass, btnPrimary, btnDanger } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { removeRecentBoard } from "@/lib/recent-boards";
import type { ProjectBoardRow } from "./types";

type Props = {
  board: ProjectBoardRow;
  members: BoardMember[];
  isOrgAdmin: boolean;
  currentUserId?: string | null;
  onClose: () => void;
};

export function ProjectSettingsModal({ board, members, isOrgAdmin, currentUserId, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const userBoardRole = members.find((m) => m.user_id === currentUserId)?.role ?? null;
  const canManageMembers = canManageBoardMembers(isOrgAdmin, userBoardRole);

  function save(fd: FormData) {
    setError(null);
    fd.set("boardId", board.id);
    fd.set("archived", fd.get("archived") === "on" ? "true" : "false");
    fd.set("tifluxEnabled", fd.get("tifluxEnabled") === "on" ? "true" : "false");
    startTransition(async () => {
      const result = await updateBoardSettings(fd);
      if ("error" in result) {
        setError(result.error);
        appToast.error(result.error);
      } else {
        appToast.success("Projeto atualizado");
        router.refresh();
        onClose();
      }
    });
  }

  function confirmDelete() {
    const fd = new FormData();
    fd.set("boardId", board.id);
    startTransition(async () => {
      const result = await deleteBoard(fd);
      if ("error" in result) {
        setError(result.error);
        appToast.error(result.error);
        setDeleteOpen(false);
      } else {
        removeRecentBoard(board.id);
        appToast.success("Projeto excluido");
        router.push("/boards");
        router.refresh();
      }
    });
  }

  return (
    <>
      <AuroraModal
        onClose={onClose}
        title={`Configuracoes — ${board.name}`}
        size="lg"
        testId="project-settings-modal"
        bodyClassName="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5"
      >
        <form action={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Nome</label>
            <input name="name" defaultValue={board.name} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-muted">Descricao</label>
            <textarea name="description" defaultValue={board.description ?? ""} rows={3} className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-3">
            <IconPicker name="icon" defaultValue={board.icon ?? undefined} />
            <ColorPicker name="color" defaultValue={board.color ?? undefined} />
          </div>

          <label className="flex items-center gap-2 text-sm text-aurora-fg">
            <input type="checkbox" name="archived" defaultChecked={board.archived} />
            Projeto arquivado
          </label>

          <fieldset className="rounded-lg border border-aurora-border p-3">
            <legend className="px-1 text-sm font-medium text-aurora-fg">Integracoes</legend>
            <label className="mt-1 flex items-center gap-2 text-sm text-aurora-fg">
              <input type="checkbox" name="tifluxEnabled" defaultChecked={board.tiflux_enabled} />
              Vincular ao Tiflux
            </label>
          </fieldset>

          {error ? <p className="text-sm text-aurora-danger">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aurora-border pt-4">
            {isOrgAdmin ? (
              <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger} disabled={pending}>
                Excluir projeto
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium text-aurora-fg">Membros e permissoes</p>
          <ShareProjectPanel
            boardId={board.id}
            members={members}
            canManageMembers={canManageMembers}
            currentUserId={currentUserId}
          />
        </div>
      </AuroraModal>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir projeto?"
        message="Todos os cards e colunas serao removidos permanentemente."
        confirmLabel="Excluir"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
