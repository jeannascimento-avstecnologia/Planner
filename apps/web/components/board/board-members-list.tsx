"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeBoardMember } from "@/app/(app)/boards/[boardId]/actions";
import { assignBoardMemberPresetAction, listAccessPresetsForBoardAction } from "@/app/(app)/settings/access-presets/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SYSTEM_PRESET_BY_ROLE, type AccessPresetRow } from "@/lib/access-presets";
import { boardRoleLabel } from "@/lib/board-member-roles";
import { appToast } from "@/lib/toast";
import type { BoardMember } from "./board-member";
import type { BoardMemberRole } from "@nextgen/contracts";

type Props = {
  boardId: string;
  members: BoardMember[];
  canManageMembers?: boolean;
  currentUserId?: string | null;
  /** Catálogo org+sistema (mesmo do invite). Se omitido, carrega via action. */
  presets?: AccessPresetRow[];
  onError?: (message: string) => void;
};

function memberLabel(member: BoardMember): string {
  return member.profile?.full_name ?? member.user_id.slice(0, 8);
}

function memberLevelLabel(member: BoardMember): string {
  return member.presetName ?? boardRoleLabel(member.role);
}

function memberPresetId(member: BoardMember): string {
  if (member.preset_id) return member.preset_id;
  const role = member.role as BoardMemberRole;
  if (role === "manager" || role === "admin" || role === "viewer") {
    return SYSTEM_PRESET_BY_ROLE[role];
  }
  return SYSTEM_PRESET_BY_ROLE.viewer;
}

export function BoardMembersList({
  boardId,
  members,
  canManageMembers = false,
  currentUserId = null,
  presets: presetsProp,
  onError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<BoardMember | null>(null);
  const [presets, setPresets] = useState<AccessPresetRow[] | null>(presetsProp ?? null);

  useEffect(() => {
    if (presetsProp && presetsProp.length > 0) {
      setPresets(presetsProp);
      return;
    }
    let cancelled = false;
    void listAccessPresetsForBoardAction(boardId).then((res) => {
      if (cancelled) return;
      if (res.presets.length > 0) setPresets(res.presets);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId, presetsProp]);

  const options = useMemo(() => {
    if (presets && presets.length > 0) {
      return presets.map((p) => ({ id: p.id, label: p.name }));
    }
    return [
      { id: SYSTEM_PRESET_BY_ROLE.viewer, label: "Visualizador" },
      { id: SYSTEM_PRESET_BY_ROLE.admin, label: "Editor" },
      { id: SYSTEM_PRESET_BY_ROLE.manager, label: "Administrador" },
    ];
  }, [presets]);

  function changePreset(userId: string, presetId: string) {
    startTransition(async () => {
      const res = await assignBoardMemberPresetAction({ boardId, userId, presetId });
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
                      value={memberPresetId(m)}
                      onChange={(e) => changePreset(m.user_id, e.target.value)}
                      className="rounded border border-board-border bg-board-surface px-1.5 py-0.5 text-xs"
                      aria-label={`Nivel de ${memberLabel(m)}`}
                      data-testid={`member-preset-select-${m.user_id}`}
                    >
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
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
                  <span
                    className="shrink-0 text-aurora-muted"
                    data-testid={`member-preset-label-${m.user_id}`}
                  >
                    {memberLevelLabel(m)}
                  </span>
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
