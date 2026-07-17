"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteBoard,
  getBoardTifluxStatusAction,
  updateBoardSettings,
} from "@/app/(app)/boards/actions";
import { setBoardDepartmentAction, getBoardDepartmentContextAction } from "@/app/(app)/settings/departments/actions";
import type { BoardDepartmentContext } from "@/lib/load-board-department-context";
import { isTifluxConfigured } from "@/lib/board-integrations";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { MODAL_BODY_PADDED_CLASS } from "@/components/ui/aurora-surface";
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
  isOrgOwner?: boolean;
  currentUserId?: string | null;
  onClose: () => void;
};

export function ProjectSettingsModal({
  board,
  members,
  isOrgAdmin,
  isOrgOwner = false,
  currentUserId,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deptContext, setDeptContext] = useState<BoardDepartmentContext | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("general");
  const [tifluxEnabled, setTifluxEnabled] = useState(board.tiflux_enabled);
  const [tifluxConfigured, setTifluxConfigured] = useState(isTifluxConfigured(board.integrations));
  const userBoardRole = members.find((m) => m.user_id === currentUserId)?.role ?? null;
  const canManageMembers = canManageBoardMembers(isOrgOwner, userBoardRole);

  useEffect(() => {
    let cancelled = false;
    void getBoardDepartmentContextAction(board.id).then((ctx) => {
      if (cancelled || !ctx) return;
      setDeptContext(ctx);
      setDepartmentId(ctx.currentDepartmentId ?? "general");
    });
    return () => {
      cancelled = true;
    };
  }, [board.id]);

  useEffect(() => {
    let cancelled = false;
    void getBoardTifluxStatusAction(board.id).then((status) => {
      if (cancelled) return;
      setTifluxConfigured(status.configured);
    });
    return () => {
      cancelled = true;
    };
  }, [board.id, board.integrations, board.tiflux_enabled]);

  const showTifluxTokenInput = tifluxEnabled && !tifluxConfigured;

  function save(fd: FormData) {
    setError(null);
    fd.set("boardId", board.id);
    fd.set("archived", fd.get("archived") === "on" ? "true" : "false");
    fd.set("tifluxEnabled", tifluxEnabled ? "true" : "false");
    if (!tifluxEnabled || tifluxConfigured) {
      fd.delete("tifluxApiToken");
    }
    if (showTifluxTokenInput) {
      const token = String(fd.get("tifluxApiToken") ?? "").trim();
      if (!token) {
        const msg = "Informe o codigo de API do Tiflux.";
        setError(msg);
        appToast.error(msg);
        return;
      }
    }
    startTransition(async () => {
      const result = await updateBoardSettings(fd);
      if ("error" in result) {
        setError(result.error);
        appToast.error(result.error);
        return;
      }

      const nextDept = departmentId;
      const currentDept = deptContext?.currentDepartmentId ?? null;
      const normalizedNext = nextDept === "general" ? null : nextDept;
      if (deptContext?.canMove && normalizedNext !== currentDept) {
        const deptFd = new FormData();
        deptFd.set("boardId", board.id);
        deptFd.set("departmentId", nextDept);
        const moveRes = await setBoardDepartmentAction(deptFd);
        if (!moveRes.ok) {
          setError(moveRes.error);
          appToast.error(moveRes.error);
          return;
        }
      }

      appToast.success("Projeto atualizado");
      if (!tifluxEnabled) {
        setTifluxConfigured(false);
      } else if (showTifluxTokenInput) {
        setTifluxConfigured(true);
      }
      router.refresh();
      onClose();
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
        bodyClassName={`flex flex-col gap-4 ${MODAL_BODY_PADDED_CLASS}`}
      >
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
              rows={2}
              className={`${inputClass} max-h-24 resize-y`}
              data-testid="project-settings-description"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <IconPicker name="icon" defaultValue={board.icon ?? undefined} />
            <ColorPicker name="color" defaultValue={board.color ?? undefined} />
          </div>

          {deptContext?.canMove ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-aurora-muted">Departamento</span>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputClass}
                data-testid="project-settings-department"
              >
                {deptContext.options.map((opt) => (
                  <option key={opt.id ?? "general"} value={opt.id ?? "general"}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-aurora-fg">
            <input type="checkbox" name="archived" defaultChecked={board.archived} />
            Projeto arquivado
          </label>

          <fieldset className="rounded-lg border border-aurora-border p-3">
            <legend className="px-1 text-sm font-medium text-aurora-fg">Integracoes</legend>
            <label className="mt-1 flex items-center gap-2 text-sm text-aurora-fg">
              <input
                type="checkbox"
                name="tifluxEnabled"
                checked={tifluxEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTifluxEnabled(checked);
                  if (!checked) {
                    setTifluxConfigured(false);
                  }
                }}
                data-testid="project-settings-tiflux-enabled"
              />
              Vincular ao Tiflux
            </label>
            {showTifluxTokenInput ? (
              <label className="mt-3 block space-y-1">
                <span className="text-xs font-medium text-aurora-muted">Codigo de API</span>
                <input
                  type="password"
                  name="tifluxApiToken"
                  required
                  minLength={8}
                  autoComplete="off"
                  data-1p-ignore
                  placeholder="Cole o token Bearer do Tiflux"
                  className={inputClass}
                  data-testid="project-settings-tiflux-token"
                />
                <p className="text-xs text-aurora-muted">
                  O token e validado no Tiflux antes de salvar e nao sera exibido novamente.
                </p>
              </label>
            ) : null}
            {tifluxEnabled && tifluxConfigured ? (
              <p className="mt-3 text-sm text-aurora-fg" data-testid="project-settings-tiflux-configured">
                API configurada
                <span className="mt-1 block text-xs text-aurora-muted">
                  Para alterar o token, desmarque e marque novamente, informe o novo codigo e salve.
                </span>
              </p>
            ) : null}
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
            <button type="submit" disabled={pending} className={btnPrimary} data-testid="project-settings-save">
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
