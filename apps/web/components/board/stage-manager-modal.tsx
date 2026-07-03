"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  createStage,
  deleteStage,
  updateStage,
} from "@/app/(app)/boards/[boardId]/stages/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { MODAL_BODY_PADDED_CLASS } from "@/components/ui/aurora-surface";
import { ColorPicker } from "@/components/ui/color-picker";
import { btnBoardPrimarySm, btnBoardSecondary, inputBoardClassSm } from "@/lib/ui-classes";
import type { StageRow } from "./types";

type Props = {
  boardId: string;
  stages: StageRow[];
  onClose: () => void;
};

export function StageManagerModal({ boardId, stages, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366F1");
  const [deleteTarget, setDeleteTarget] = useState<StageRow | null>(null);
  const sorted = [...stages].sort((a, b) => a.position - b.position);

  function refresh() {
    router.refresh();
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("name", newName);
    fd.set("color", newColor);
    startTransition(async () => {
      await createStage(fd);
      setNewName("");
      refresh();
    });
  }

  function moveStage(stage: StageRow, dir: -1 | 1) {
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    startTransition(async () => {
      const fd1 = new FormData();
      fd1.set("stageId", stage.id);
      fd1.set("boardId", boardId);
      fd1.set("position", String(swap.position));
      const fd2 = new FormData();
      fd2.set("stageId", swap.id);
      fd2.set("boardId", boardId);
      fd2.set("position", String(stage.position));
      await updateStage(fd1);
      await updateStage(fd2);
      refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget || deleteTarget.is_system) return;
    const fd = new FormData();
    fd.set("stageId", deleteTarget.id);
    fd.set("boardId", boardId);
    startTransition(async () => {
      await deleteStage(fd);
      setDeleteTarget(null);
      refresh();
    });
  }

  function handleUpdate(stage: StageRow, name: string, color: string) {
    const fd = new FormData();
    fd.set("stageId", stage.id);
    fd.set("boardId", boardId);
    fd.set("name", name);
    fd.set("color", color);
    startTransition(() => updateStage(fd).then(refresh));
  }

  return (
    <>
      <AuroraModal
        onClose={onClose}
        title="Gerenciar estagios"
        variant="board"
        size="lg"
        showHairline={false}
        zIndex={200}
        bodyClassName={MODAL_BODY_PADDED_CLASS}
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={btnBoardSecondary}>
              Fechar
            </button>
          </div>
        }
      >
        <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto">
          {sorted.map((stage, idx) => (
            <li key={stage.id} className="flex items-center gap-2 rounded-lg border border-board-border p-2">
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
              <input
                defaultValue={stage.name}
                className={`${inputBoardClassSm} flex-1`}
                onBlur={(e) => {
                  if (e.target.value !== stage.name) handleUpdate(stage, e.target.value, stage.color);
                }}
              />
              <input
                type="color"
                defaultValue={stage.color}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-board-border"
                onChange={(e) => handleUpdate(stage, stage.name, e.target.value)}
              />
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  disabled={idx === 0 || pending}
                  onClick={() => moveStage(stage, -1)}
                  className="rounded p-0.5 text-aurora-muted hover:bg-board-accent-muted/40 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === sorted.length - 1 || pending}
                  onClick={() => moveStage(stage, 1)}
                  className="rounded p-0.5 text-aurora-muted hover:bg-board-accent-muted/40 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {!stage.is_system ? (
                <button
                  type="button"
                  data-testid={`delete-stage-${stage.id}`}
                  onClick={() => setDeleteTarget(stage)}
                  disabled={pending}
                  className="rounded p-1 text-aurora-danger hover:bg-aurora-danger/10"
                  aria-label={`Excluir estagio ${stage.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-[10px] text-aurora-muted">padrao</span>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreate} className="space-y-2 border-t border-board-border pt-3">
          <p className="text-xs font-medium text-aurora-muted">Novo estagio</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do estagio"
            required
            className={inputBoardClassSm}
          />
          <ColorPicker name="color" defaultValue={newColor} onChange={setNewColor} />
          <button type="submit" disabled={pending || !newName.trim()} className={`${btnBoardPrimarySm} inline-flex items-center gap-1`}>
            <Plus className="h-4 w-4" /> Criar estagio
          </button>
        </form>
      </AuroraModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir estagio?"
        message={
          deleteTarget
            ? `O estagio "${deleteTarget.name}" sera removido. Cards que o usam ficarao sem este estagio.`
            : ""
        }
        pending={pending}
        variant="board"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
