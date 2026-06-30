"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Plus } from "lucide-react";
import { deleteTag, createTag } from "@/app/(app)/boards/[boardId]/actions";
import { createStage, deleteStage } from "@/app/(app)/boards/[boardId]/stages/actions";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColorPicker } from "@/components/ui/color-picker";
import { inputBoardClassSm, btnBoardPrimarySm, TAG_DEFAULT_COLORS, chipInteractiveBoard } from "@/lib/ui-classes";
import { tagColor } from "./badges";
import { hasActiveFilters, memberLabel, type CardFilters, type ProfileRow, type StageRow, type TagRow } from "./types";

type Props = {
  boardId: string;
  orgId: string;
  tags: TagRow[];
  stages: StageRow[];
  members: ProfileRow[];
  value: CardFilters;
  isOrgAdmin?: boolean;
  onManageStages?: () => void;
  onChange: (next: CardFilters) => void;
  onClear: () => void;
};

const PRESETS = [3, 5, 10, 30];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CardFilterBar({
  boardId,
  orgId,
  tags,
  stages,
  members,
  value,
  isOrgAdmin = false,
  onManageStages,
  onChange,
  onClear,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_DEFAULT_COLORS[0]);
  const [tagCreateError, setTagCreateError] = useState<string | null>(null);
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6366F1");
  const [stageCreateError, setStageCreateError] = useState<string | null>(null);
  const [deleteStageTarget, setDeleteStageTarget] = useState<StageRow | null>(null);
  const active = hasActiveFilters(value);
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  function confirmDeleteTag() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("tagId", deleteTarget.id);
    fd.set("boardId", boardId);
    startTransition(async () => {
      const result = await deleteTag(fd);
      setDeleteTarget(null);
      if ("ok" in result) {
        onChange({ ...value, tagIds: value.tagIds.filter((id) => id !== deleteTarget.id) });
        router.refresh();
      }
    });
  }

  function handleCreateTag() {
    if (!newTagName.trim()) return;
    setTagCreateError(null);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("boardId", boardId);
    fd.set("name", newTagName.trim());
    fd.set("color", newTagColor);
    startTransition(async () => {
      const res = await createTag(fd);
      if ("error" in res) {
        setTagCreateError(res.error);
        return;
      }
      setNewTagName("");
      setShowNewTag(false);
      router.refresh();
    });
  }

  function handleCreateStage() {
    if (!newStageName.trim()) return;
    setStageCreateError(null);
    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("name", newStageName.trim());
    fd.set("color", newStageColor);
    startTransition(async () => {
      const res = await createStage(fd);
      if ("error" in res) {
        setStageCreateError(res.error);
        return;
      }
      setNewStageName("");
      setShowNewStage(false);
      router.refresh();
    });
  }

  function confirmDeleteStage() {
    if (!deleteStageTarget || deleteStageTarget.is_system) return;
    const fd = new FormData();
    fd.set("stageId", deleteStageTarget.id);
    fd.set("boardId", boardId);
    const removedId = deleteStageTarget.id;
    startTransition(async () => {
      const res = await deleteStage(fd);
      setDeleteStageTarget(null);
      if ("error" in res) return;
      onChange({ ...value, stageIds: value.stageIds.filter((id) => id !== removedId) });
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-2 rounded-xl border border-board-border bg-board-surface p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-aurora-muted" />
            <input
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              placeholder="Buscar por titulo"
              className={inputBoardClassSm + " pl-8"}
            />
          </div>

          {onManageStages ? (
            <button
              type="button"
              data-testid="manage-stages"
              onClick={onManageStages}
              className="rounded-md border border-board-border px-2 py-1.5 text-xs font-medium text-aurora-fg hover:bg-board-accent-muted/40"
            >
              Estagios
            </button>
          ) : null}

          <div className="flex items-center gap-1">
            {PRESETS.map((d) => {
              const on = value.duePreset === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ ...value, duePreset: on ? null : d, dueExact: null })}
                  className={`rounded-md border px-2 py-1.5 text-xs transition ${
                    on
                      ? "border-board-accent bg-board-accent text-white"
                      : "border-board-border text-aurora-muted hover:bg-board-accent-muted/40"
                  }`}
                >
                  {d}d
                </button>
              );
            })}
            <DatePickerPopover
              name="filterDueExact"
              defaultValue={value.dueExact ?? ""}
              placeholder="Dia exato"
              variant="board"
              onChange={(v) => onChange({ ...value, dueExact: v || null, duePreset: null })}
            />
          </div>

          {active ? (
            <button
              type="button"
              onClick={onClear}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-aurora-muted hover:bg-board-accent-muted/40 hover:text-aurora-fg"
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-medium text-aurora-muted">Responsavel:</span>
          <button
            type="button"
            onClick={() => onChange({ ...value, assignees: toggle(value.assignees, "none") })}
            className={chipClass(value.assignees.includes("none"))}
          >
            Sem responsavel
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...value, assignees: toggle(value.assignees, m.id) })}
              className={chipClass(value.assignees.includes(m.id))}
            >
              {memberLabel(m)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-medium text-aurora-muted">Marcador:</span>
          {tags.map((t) => {
            const on = value.tagIds.includes(t.id);
            const color = tagColor(t.color);
            return (
              <span key={t.id} className="group/tag relative inline-flex max-w-[11rem]">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, tagIds: toggle(value.tagIds, t.id) })}
                  className={`max-w-full truncate whitespace-nowrap rounded-full border py-0.5 pl-2 text-xs transition ${
                    isOrgAdmin ? "pr-6" : "pr-2"
                  } ${on ? "text-white" : "text-aurora-fg hover:opacity-90"}`}
                  style={
                    on
                      ? { backgroundColor: color, borderColor: color }
                      : { backgroundColor: `${color}22`, borderColor: color }
                  }
                  title={t.name}
                >
                  {t.name}
                </button>
                {isOrgAdmin ? (
                  <button
                    type="button"
                    aria-label={`Excluir marcador ${t.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(t);
                    }}
                    className={`absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-0 transition group-hover/tag:opacity-100 ${
                      on ? "text-white/90 hover:bg-white/20" : "text-aurora-muted hover:bg-black/10"
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
          <button
            type="button"
            data-testid="filter-tag-add"
            onClick={() => setShowNewTag((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-board-border text-aurora-muted hover:bg-board-accent-muted/40"
            title="Novo marcador"
            aria-label="Novo marcador"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showNewTag ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-board-border p-2">
            <div className="min-w-32 flex-1">
              <label className="mb-1 block text-xs text-aurora-muted">Nome</label>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Novo marcador"
                aria-label="Nome do marcador"
                required
                className={inputBoardClassSm}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-aurora-muted">Cor</label>
              <ColorPicker defaultValue={newTagColor} onChange={setNewTagColor} />
            </div>
            <button type="button" disabled={pending} onClick={handleCreateTag} className={btnBoardPrimarySm}>
              Criar
            </button>
            {tagCreateError ? (
              <p className="w-full text-xs font-semibold text-aurora-danger">{tagCreateError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-medium text-aurora-muted">Estagio:</span>
          <button
            type="button"
            data-testid="filter-stage-none"
            onClick={() => onChange({ ...value, stageIds: toggle(value.stageIds, "none") })}
            className={chipClass(value.stageIds.includes("none"))}
          >
            Sem estagio
          </button>
          {sortedStages.map((s) => {
            const on = value.stageIds.includes(s.id);
            return (
              <span key={s.id} className="group/stage relative inline-flex max-w-[11rem]">
                <button
                  type="button"
                  data-testid={`filter-stage-${s.system_key ?? s.id}`}
                  onClick={() => onChange({ ...value, stageIds: toggle(value.stageIds, s.id) })}
                  className={`max-w-full truncate whitespace-nowrap rounded-full border py-0.5 text-xs transition ${
                    !s.is_system ? "pl-2 pr-6" : "px-2"
                  } ${on ? "text-white" : "text-aurora-fg hover:opacity-90"}`}
                  style={
                    on
                      ? { backgroundColor: s.color, borderColor: s.color }
                      : { backgroundColor: `${s.color}22`, borderColor: s.color }
                  }
                  title={s.name}
                >
                  {s.name}
                </button>
                {!s.is_system ? (
                  <button
                    type="button"
                    data-testid={`filter-stage-delete-${s.id}`}
                    aria-label={`Excluir estagio ${s.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteStageTarget(s);
                    }}
                    className={`absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-0 transition group-hover/stage:opacity-100 ${
                      on ? "text-white/90 hover:bg-white/20" : "text-aurora-muted hover:bg-black/10"
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
          <button
            type="button"
            data-testid="filter-stage-add"
            onClick={() => setShowNewStage((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-board-border text-aurora-muted hover:bg-board-accent-muted/40"
            title="Novo estagio"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showNewStage ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-board-border p-2">
            <div className="min-w-32 flex-1">
              <label className="mb-1 block text-xs text-aurora-muted">Nome</label>
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Novo estagio"
                required
                className={inputBoardClassSm}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateStage();
                  }
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-aurora-muted">Cor</label>
              <ColorPicker defaultValue={newStageColor} onChange={setNewStageColor} />
            </div>
            <button type="button" disabled={pending} onClick={handleCreateStage} className={btnBoardPrimarySm}>
              Criar
            </button>
            {stageCreateError ? (
              <p className="w-full text-xs font-semibold text-aurora-danger">{stageCreateError}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir marcador?"
        message={
          deleteTarget
            ? `O marcador "${deleteTarget.name}" sera removido de todos os cards.`
            : ""
        }
        pending={pending}
        onConfirm={confirmDeleteTag}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteStageTarget !== null}
        title="Excluir estagio?"
        message={
          deleteStageTarget
            ? `O estagio "${deleteStageTarget.name}" sera removido. Cards que o usam ficarao sem este estagio.`
            : ""
        }
        pending={pending}
        onConfirm={confirmDeleteStage}
        onCancel={() => setDeleteStageTarget(null)}
      />
    </>
  );
}

function chipClass(on: boolean): string {
  return `${chipInteractiveBoard} ${on ? "border-board-accent bg-board-accent text-white" : ""}`;
}
