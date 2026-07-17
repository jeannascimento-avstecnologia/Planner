"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ProjectBoardTile } from "./project-board-tile";
import type { BoardMember } from "@/components/board/share-project-panel";
import {
  PROJECT_GROUP_LABELS,
  type ProjectBoardRow,
  type ProjectGroupBy,
} from "./types";

type Props = {
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  isOrgAdmin: boolean;
  isOrgOwner?: boolean;
  currentUserId?: string | null;
  hubMode?: boolean;
  selectedBoardId?: string | null;
  onSelectBoard?: (id: string) => void;
};

function groupKey(board: ProjectBoardRow, by: ProjectGroupBy): string {
  if (by === "nome") {
    const letter = board.name.trim().charAt(0).toUpperCase();
    return letter.match(/[A-Z0-9]/i) ? letter.toUpperCase() : "#";
  }
  if (by === "responsavel") return board.owner_name?.trim() || "Sem responsavel";
  if (by === "data") {
    const d = new Date(board.created_at);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  if (by === "prazo") {
    if (!board.next_due) return "Sem prazo";
    const d = new Date(board.next_due);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  return "?";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ProjectsListView({
  boards,
  boardMembersByBoardId,
  isOrgAdmin,
  isOrgOwner = false,
  currentUserId,
  hubMode = false,
  selectedBoardId,
  onSelectBoard,
}: Props) {
  const [groupBy, setGroupBy] = useState<ProjectGroupBy>("responsavel");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, ProjectBoardRow[]>();
    for (const b of boards) {
      const key = groupKey(b, groupBy);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([label, items]) => ({
        label,
        items: [...items].sort((x, y) => x.name.localeCompare(y.name, "pt-BR")),
      }));
  }, [boards, groupBy]);

  function toggleGroup(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-aurora-muted">
          Agrupar por
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as ProjectGroupBy)}
            className="rounded-md border border-aurora-border bg-aurora-surface px-2 py-1.5 text-sm text-aurora-fg"
          >
            {(Object.keys(PROJECT_GROUP_LABELS) as ProjectGroupBy[]).map((k) => (
              <option key={k} value={k}>
                {PROJECT_GROUP_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-aurora-border bg-aurora-surface">
        {groups.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-aurora-muted">Nenhum projeto ainda.</p>
        ) : (
          groups.map(({ label, items }) => {
            const shut = collapsed.has(label);
            return (
              <section key={label} className="border-b border-aurora-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(label)}
                  className="flex w-full items-center gap-2 bg-aurora-surface-2/80 px-3 py-2 text-left text-sm font-semibold text-aurora-fg hover:bg-aurora-surface-2"
                >
                  {shut ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {label} ({items.length})
                </button>
                {!shut ? (
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-aurora-border text-xs text-aurora-muted">
                      <tr>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Descricao</th>
                        <th className="px-3 py-2">Responsavel</th>
                        <th className="px-3 py-2">Criado em</th>
                        <th className="px-3 py-2">Proximo prazo</th>
                        <th className="px-3 py-2">Cards abertos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-aurora-border/60 hover:bg-aurora-accent-muted/20"
                        >
                          <td className="px-3 py-2">
                            <ProjectBoardTile
                              board={b}
                              members={boardMembersByBoardId[b.id] ?? []}
                              isOrgAdmin={isOrgAdmin}
                              isOrgOwner={isOrgOwner}
                              currentUserId={currentUserId}
                              variant="list"
                              hubMode={hubMode}
                              selected={hubMode && selectedBoardId === b.id}
                              onSelect={onSelectBoard}
                            />
                          </td>
                          <td className="max-w-xs truncate px-3 py-2 text-aurora-muted">
                            {b.description || "—"}
                          </td>
                          <td className="px-3 py-2 text-aurora-muted">{b.owner_name || "—"}</td>
                          <td className="px-3 py-2 text-aurora-muted">{formatDate(b.created_at)}</td>
                          <td className="px-3 py-2 text-aurora-muted">{formatDate(b.next_due)}</td>
                          <td className="px-3 py-2 text-aurora-muted">{b.open_cards}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
