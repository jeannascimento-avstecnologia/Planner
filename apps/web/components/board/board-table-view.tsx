"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { updateCardFieldsAction } from "@/app/(app)/boards/[boardId]/field-actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import { PriorityBadge, TagChip } from "./badges";
import { TifluxCardButton } from "./tiflux-card-button";
import { formatDue, formatStart, isCardOverdue, memberLabel, type BoardCard, type ColumnRow, type ProfileRow, type StageRow, type TagRow } from "./types";

type SortKey = "title" | "due_date";
type SortDir = "asc" | "desc";

type Props = {
  cards: BoardCard[];
  columns: ColumnRow[];
  stages: StageRow[];
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  readOnlyTiflux?: boolean;
  canEdit?: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardTableView({
  cards,
  columns,
  stages,
  tags,
  profilesById,
  tifluxEnabled,
  readOnlyTiflux = false,
  canEdit = false,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const colName = useMemo(() => {
    const m = new Map(columns.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? "?";
  }, [columns]);

  const stagesById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const sorted = useMemo(() => {
    const list = [...cards];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        cmp = ad - bd;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [cards, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const fieldLocksRef = useRef(new Set<string>());

  async function commitField(cardId: string, field: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    const lockKey = `table:${cardId}:${field}`;
    if (fieldLocksRef.current.has(lockKey) || !acquireInFlightLock(lockKey)) return;
    fieldLocksRef.current.add(lockKey);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Erro ao salvar");
    } finally {
      fieldLocksRef.current.delete(lockKey);
      releaseInFlightLock(lockKey);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-board-border bg-board-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-board-border bg-board-surface-2/60 text-xs text-aurora-muted">
          <tr>
            <th className="px-3 py-2">
              <button type="button" onClick={() => toggleSort("title")} className="hover:text-aurora-fg">
                Titulo {sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            </th>
            {tifluxEnabled ? <th className="px-3 py-2">Tiflux</th> : null}
            <th className="px-3 py-2">Coluna</th>
            <th className="px-3 py-2">Prioridade</th>
            <th className="px-3 py-2">Inicio</th>
            <th className="px-3 py-2">Entrega est.</th>
            <th className="px-3 py-2">
              <button type="button" onClick={() => toggleSort("due_date")} className="hover:text-aurora-fg">
                Prazo final {sortKey === "due_date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            </th>
            <th className="px-3 py-2">Horas</th>
            <th className="px-3 py-2">Responsavel</th>
            <th className="px-3 py-2">Marcadores</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={tifluxEnabled ? 11 : 10} className="px-3 py-8 text-center text-aurora-muted">
                Nenhum card com os filtros atuais.
              </td>
            </tr>
          ) : (
            sorted.map((c) => {
              const overdue = isCardOverdue(c, stagesById);
              return (
              <tr
                key={c.id}
                className={`cursor-pointer border-b border-board-border/60 hover:bg-board-accent-muted/30 ${
                  overdue ? "border-l-4 border-l-aurora-danger" : ""
                }`}
                onClick={() => onSelectCard(c.id)}
              >
                <td className="px-3 py-2 font-medium text-aurora-fg" onClick={(e) => e.stopPropagation()}>
                  {canEdit ? (
                    <input
                      defaultValue={c.title}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-board-border focus:border-board-accent"
                      data-testid={`table-edit-title-${c.id}`}
                      onBlur={async (e) => {
                        const v = e.target.value.trim();
                        if (!v || v === c.title) return;
                        await commitField(c.id, "title", () =>
                          updateCardFieldsAction({ cardId: c.id, patch: { title: v } }),
                        );
                      }}
                    />
                  ) : (
                    c.title
                  )}
                </td>
                {tifluxEnabled ? (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <TifluxCardButton
                      card={c}
                      tifluxEnabled={tifluxEnabled}
                      readOnly={readOnlyTiflux}
                      onOpenTifluxCreate={onOpenTifluxCreate}
                      onOpenTifluxLink={onOpenTifluxLink}
                      compact
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2 text-aurora-muted">{colName(c.column_id)}</td>
                <td className="px-3 py-2">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-3 py-2 text-aurora-muted">{formatStart(c.start_date) || "—"}</td>
                <td className="px-3 py-2 text-aurora-muted" onClick={(e) => e.stopPropagation()}>
                  {canEdit ? (
                    <input
                      type="date"
                      defaultValue={c.target_date ? c.target_date.slice(0, 10) : ""}
                      className="rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-board-border focus:border-board-accent"
                      data-testid={`table-edit-target-${c.id}`}
                      onBlur={async (e) => {
                        const v = e.target.value;
                        const cur = c.target_date ? c.target_date.slice(0, 10) : "";
                        if (v === cur) return;
                        await commitField(c.id, "target_date", () =>
                          updateCardFieldsAction({
                            cardId: c.id,
                            patch: { target_date: v ? `${v}T12:00:00.000Z` : null },
                          }),
                        );
                      }}
                    />
                  ) : (
                    formatDue(c.target_date) || "—"
                  )}
                </td>
                <td className={`px-3 py-2 ${overdue ? "font-semibold text-aurora-danger" : "text-aurora-muted"}`}>
                  {formatDue(c.due_date) || "—"}
                </td>
                <td className="px-3 py-2 tabular-nums text-aurora-muted" onClick={(e) => e.stopPropagation()}>
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      max={999.99}
                      step={0.5}
                      defaultValue={c.estimated_hours ?? ""}
                      className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-board-border focus:border-board-accent"
                      data-testid={`table-edit-hours-${c.id}`}
                      onBlur={async (e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : Number(raw);
                        const cur = c.estimated_hours;
                        if (v === cur || (v === null && cur == null)) return;
                        await commitField(c.id, "estimated_hours", () =>
                          updateCardFieldsAction({
                            cardId: c.id,
                            patch: { estimated_hours: v },
                          }),
                        );
                      }}
                    />
                  ) : (
                    c.estimated_hours != null ? `${c.estimated_hours}h` : "—"
                  )}
                </td>
                <td className="px-3 py-2 text-aurora-muted">
                  {c.assignee_id ? memberLabel(profilesById[c.assignee_id]) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.tagIds.map((tid) => {
                      const t = tags.find((x) => x.id === tid);
                      return t ? <TagChip key={tid} tag={t} /> : null;
                    })}
                  </div>
                </td>
              </tr>
            );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
