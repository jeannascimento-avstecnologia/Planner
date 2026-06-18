"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { deleteBoard, updateBoardSettings } from "@/app/(app)/boards/actions";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShareProjectPanel, type BoardMember } from "@/components/board/share-project-panel";
import { canManageBoardMembers } from "@/lib/board-member-roles";
import { inputClass, btnPrimary, btnDanger } from "@/lib/ui-classes";
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
      if ("error" in result) setError(result.error);
      else {
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
        setDeleteOpen(false);
      } else {
        router.push("/boards");
        router.refresh();
      }
    });
  }

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={onClose}
              data-testid="project-settings-modal"
            >
              <div
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-aurora-border bg-aurora-surface shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="flex items-center justify-between border-b border-aurora-border px-5 py-4">
                  <h2 className="text-lg font-semibold text-aurora-fg">Configuracoes — {board.name}</h2>
                  <button type="button" onClick={onClose} className="text-aurora-muted hover:text-aurora-fg">
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                  <form action={save} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-aurora-muted">Nome</label>
                      <input name="name" defaultValue={board.name} required className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-aurora-muted">Descricao</label>
                      <textarea
                        name="description"
                        defaultValue={board.description ?? ""}
                        rows={3}
                        className={inputClass}
                      />
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
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(true)}
                          className={btnDanger}
                          disabled={pending}
                        >
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
                    <ShareProjectPanel boardId={board.id} members={members} canManageMembers={canManageMembers} />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
