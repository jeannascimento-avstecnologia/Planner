"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { attachTag, createTag, deleteTag, detachTag } from "@/app/(app)/boards/[boardId]/actions";
import { inputBoardClassSm, btnBoardPrimarySm, TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { computeFixedPopoverPosition } from "@/lib/popover-position";
import { AuroraPopover } from "@/components/ui/aurora-popover";
import { TagChip } from "./badges";
import type { TagRow } from "./types";

type Props = {
  cardId: string;
  boardId: string;
  orgId: string;
  tagIds: string[];
  tags: TagRow[];
  isOrgAdmin?: boolean;
};

const TAG_PANEL_W = 256;
const TAG_PANEL_H = 320;

export function TagPickerPopover({ cardId, boardId, orgId, tagIds, tags, isOrgAdmin = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_DEFAULT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = computeFixedPopoverPosition(rect, TAG_PANEL_W, TAG_PANEL_H);
    setPos({ top: next.top, left: next.left });
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) {
      updatePosition();
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const attached = tags.filter((t) => tagIds.includes(t.id));

  function toggleTag(tagId: string, isAttached: boolean) {
    const fd = new FormData();
    fd.set("cardId", cardId);
    fd.set("boardId", boardId);
    fd.set("tagId", tagId);
    startTransition(async () => {
      await (isAttached ? detachTag(fd) : attachTag(fd));
      router.refresh();
    });
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("boardId", boardId);
    fd.set("name", name);
    fd.set("color", newColor);

    startTransition(async () => {
      const result = await createTag(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const attachFd = new FormData();
      attachFd.set("cardId", cardId);
      attachFd.set("boardId", boardId);
      attachFd.set("tagId", result.tagId);
      await attachTag(attachFd);
      setNewName("");
      setOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("tagId", deleteTarget.id);
    fd.set("boardId", boardId);
    startTransition(async () => {
      const result = await deleteTag(fd);
      if ("error" in result) {
        setError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {attached.map((t) => (
          <span key={t.id} className="inline-flex max-w-full items-center gap-0.5">
            <TagChip tag={t} />
            <button
              type="button"
              aria-label={`Remover ${t.name}`}
              disabled={pending}
              onClick={() => toggleTag(t.id, true)}
              className="rounded-full p-0.5 text-aurora-muted hover:bg-board-accent-muted hover:text-aurora-fg"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative" ref={ref}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setOpen((o) => {
                const next = !o;
                if (next) setTimeout(updatePosition, 0);
                return next;
              });
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-aurora-muted text-aurora-muted hover:border-board-accent hover:text-board-accent"
            aria-label="Adicionar marcador"
          >
            <Plus className="h-4 w-4" />
          </button>

          {open ? (
            <AuroraPopover
              open
              variant="board"
              testId="tag-picker-popover"
              zIndex={100}
              style={{ top: pos.top, left: pos.left, width: TAG_PANEL_W }}
              className="p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div ref={panelRef} role="dialog" aria-label="Marcadores">
                  <p className="mb-2 text-xs font-medium text-aurora-muted">Marcadores</p>
                  <ul className="max-h-36 space-y-1 overflow-y-auto">
                    {tags.length === 0 ? (
                      <li className="text-xs text-aurora-muted">Nenhum marcador neste projeto.</li>
                    ) : (
                      tags.map((t) => {
                        const on = tagIds.includes(t.id);
                        return (
                          <li key={t.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => toggleTag(t.id, on)}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-board-accent-muted/50 ${on ? "ring-1 ring-board-accent" : ""}`}
                            >
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              <span className="truncate text-aurora-fg">{t.name}</span>
                            </button>
                            {isOrgAdmin ? (
                              <button
                                type="button"
                                aria-label={`Excluir marcador ${t.name}`}
                                disabled={pending}
                                onClick={() => setDeleteTarget(t)}
                                className="shrink-0 rounded p-1 text-aurora-muted hover:bg-aurora-danger/10 hover:text-aurora-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <div className="mt-2 flex gap-1 border-t border-board-border pt-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Novo"
                      aria-label="Nome do marcador"
                      className={inputBoardClassSm + " flex-1"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreate();
                        }
                      }}
                    />
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-full border border-board-border"
                      aria-label="Cor do marcador"
                    />
                    <button
                      type="button"
                      aria-label="Criar marcador"
                      onClick={handleCreate}
                      className={btnBoardPrimarySm}
                      disabled={pending}
                    >
                      +
                    </button>
                  </div>
                  {error ? <p className="mt-1 text-xs text-aurora-danger">{error}</p> : null}
              </div>
            </AuroraPopover>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir marcador"
        message={
          deleteTarget
            ? `Excluir marcador "${deleteTarget.name}"? Remove de todos os cards.`
            : ""
        }
        confirmLabel="Excluir"
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
