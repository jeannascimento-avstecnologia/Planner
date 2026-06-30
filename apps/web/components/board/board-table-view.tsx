"use client";

import { useMemo, useState } from "react";
import { PriorityBadge, TagChip } from "./badges";
import { TifluxCardButton } from "./tiflux-card-button";
import {
  formatDue,
  formatStart,
  memberLabel,
  type BoardCard,
  type ColumnRow,
  type ProfileRow,
  type TagRow,
} from "./types";

type SortKey = "title" | "due_date";
type SortDir = "asc" | "desc";

type Props = {
  cards: BoardCard[];
  columns: ColumnRow[];
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  readOnlyTiflux?: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardTableView({
  cards,
  columns,
  tags,
  profilesById,
  tifluxEnabled,
  readOnlyTiflux = false,
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
            <th className="px-3 py-2">
              <button type="button" onClick={() => toggleSort("due_date")} className="hover:text-aurora-fg">
                Prazo {sortKey === "due_date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            </th>
            <th className="px-3 py-2">Responsavel</th>
            <th className="px-3 py-2">Marcadores</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={tifluxEnabled ? 8 : 7} className="px-3 py-8 text-center text-aurora-muted">
                Nenhum card com os filtros atuais.
              </td>
            </tr>
          ) : (
            sorted.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-b border-board-border/60 hover:bg-board-accent-muted/30"
                onClick={() => onSelectCard(c.id)}
              >
                <td className="px-3 py-2 font-medium text-aurora-fg">{c.title}</td>
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
                <td className="px-3 py-2 text-aurora-muted">{formatDue(c.due_date) || "—"}</td>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
