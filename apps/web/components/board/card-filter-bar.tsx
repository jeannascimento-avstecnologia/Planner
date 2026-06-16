"use client";

import { Search, X } from "lucide-react";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { inputBoardClassSm } from "@/lib/ui-classes";
import { hasActiveFilters, memberLabel, type CardFilters, type ProfileRow, type TagRow } from "./types";

type Props = {
  tags: TagRow[];
  members: ProfileRow[];
  value: CardFilters;
  onChange: (next: CardFilters) => void;
  onClear: () => void;
};

const PRESETS = [3, 5, 10, 30];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CardFilterBar({ tags, members, value, onChange, onClear }: Props) {
  const active = hasActiveFilters(value);

  return (
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
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ ...value, tagIds: toggle(value.tagIds, t.id) })}
                className={`rounded-full border px-2 py-0.5 text-xs transition ${
                  on ? "text-white" : "text-aurora-fg hover:bg-board-accent-muted/40"
                }`}
                style={on ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function chipClass(on: boolean): string {
  return `rounded-full border px-2 py-0.5 text-xs transition ${
    on
      ? "border-board-accent bg-board-accent text-white"
      : "border-board-border text-aurora-muted hover:bg-board-accent-muted/40"
  }`;
}
