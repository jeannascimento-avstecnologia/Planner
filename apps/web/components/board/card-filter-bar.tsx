"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { deleteTag } from "@/app/(app)/boards/[boardId]/actions";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { TifluxTicketFilterCombobox, type LinkedTicketOption } from "./tiflux-ticket-filter-combobox";
import { tagColor } from "./badges";
import { hasActiveFilters, memberLabel, type CardFilters, type ProfileRow, type TagRow } from "./types";

type Props = {
  boardId: string;
  tags: TagRow[];
  members: ProfileRow[];
  value: CardFilters;
  isOrgAdmin?: boolean;
  tifluxEnabled?: boolean;
  linkedTickets?: LinkedTicketOption[];
  onChange: (next: CardFilters) => void;
  onClear: () => void;
};

const PRESETS = [3, 5, 10, 30];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CardFilterBar({
  boardId,
  tags,
  members,
  value,
  isOrgAdmin = false,
  tifluxEnabled = false,
  linkedTickets = [],
  onChange,
  onClear,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const active = hasActiveFilters(value);

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

          {tifluxEnabled ? (
            <TifluxTicketFilterCombobox
              value={value.tifluxTicket}
              options={linkedTickets}
              onChange={(tifluxTicket) => onChange({ ...value, tifluxTicket })}
            />
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

        {tags.length > 0 ? (
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
    </>
  );
}

function chipClass(on: boolean): string {
  return `rounded-full border px-2 py-0.5 text-xs transition ${
    on
      ? "border-board-accent bg-board-accent text-white"
      : "border-board-border text-aurora-muted hover:bg-board-accent-muted/40"
  }`;
}
