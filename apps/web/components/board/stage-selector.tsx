"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { createStage, deleteStage, setCardStage } from "@/app/(app)/boards/[boardId]/stages/actions";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { stageBadgeStyle } from "@/lib/color-utils";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";
import type { StageRow } from "./types";

type Props = {
  boardId: string;
  cardId: string;
  currentStageId: string | null;
  stages: StageRow[];
};

export function StageSelector({ boardId, cardId, currentStageId, stages }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6366F1");
  const [deleteTarget, setDeleteTarget] = useState<StageRow | null>(null);
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const current = sorted.find((s) => s.id === currentStageId);

  function applyStage(stageId: string) {
    setError(null);
    startTransition(async () => {
      const res = await setCardStage({ cardId, boardId, stageId });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function select(stage: StageRow) {
    setOpen(false);
    setShowNewStage(false);
    applyStage(stage.id);
  }

  function handleCreateStage() {
    if (!newStageName.trim()) return;
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("name", newStageName.trim());
    fd.set("color", newStageColor);
    startTransition(async () => {
      const res = await createStage(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setNewStageName("");
      setShowNewStage(false);
      setOpen(true);
      router.refresh();
    });
  }

  function confirmDeleteStage() {
    if (!deleteTarget || deleteTarget.is_system) return;
    const fd = new FormData();
    fd.set("stageId", deleteTarget.id);
    fd.set("boardId", boardId);
    startTransition(async () => {
      const res = await deleteStage(fd);
      if ("error" in res) {
        setError(res.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <p className="mb-1 text-xs font-medium text-aurora-muted">Estagio</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-board-border bg-board-surface px-2 py-1.5 text-sm"
      >
        {current ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={stageBadgeStyle(current.color)}
          >
            {current.name}
          </span>
        ) : (
          <span className="text-aurora-muted">Alterar estagio</span>
        )}
        <ChevronDown className="h-4 w-4 text-aurora-muted" />
      </button>

      {open ? (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-board-border bg-board-surface p-1 shadow-lg">
          <ul>
            {sorted.map((stage) => (
              <li key={stage.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => select(stage)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-board-accent-muted/40"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="truncate">{stage.name}</span>
                </button>
                {!stage.is_system ? (
                  <button
                    type="button"
                    data-testid={`stage-selector-delete-${stage.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(stage);
                    }}
                    className="shrink-0 rounded p-1 text-aurora-muted hover:bg-aurora-danger/10 hover:text-aurora-danger"
                    aria-label={`Excluir estagio ${stage.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="stage-selector-add"
            onClick={() => setShowNewStage((v) => !v)}
            className="mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-aurora-muted hover:bg-board-accent-muted/40"
          >
            <Plus className="h-4 w-4" />
            Novo estagio
          </button>
          {showNewStage ? (
            <div className="mt-1 space-y-2 border-t border-board-border p-2">
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nome do estagio"
                required
                className={inputBoardClassSm}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateStage();
                  }
                }}
              />
              <ColorPicker defaultValue={newStageColor} onChange={setNewStageColor} />
              <button type="button" disabled={pending} onClick={handleCreateStage} className={btnBoardPrimarySm}>
                Criar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs font-semibold text-aurora-danger">{error}</p> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir estagio?"
        message={
          deleteTarget
            ? `O estagio "${deleteTarget.name}" sera removido. Cards que o usam ficarao sem este estagio.`
            : ""
        }
        pending={pending}
        onConfirm={confirmDeleteStage}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
