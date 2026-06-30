"use client";

import Link from "next/link";
import { ArrowLeftRight, ExternalLink, Settings } from "lucide-react";
import { BoardIcon } from "@/components/board/board-icon";
import { ShareProjectPanel, type BoardMember } from "@/components/board/share-project-panel";
import { formatDue } from "@/components/board/types";
import { canEditBoardUI, canManageBoardMembers } from "@/lib/board-member-roles";
import { btnPrimary, btnSecondary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import type { ProjectBoardRow } from "./types";

export type UpcomingTask = {
  id: string;
  title: string;
  due_date: string;
};

type Props = {
  board: ProjectBoardRow;
  members: BoardMember[];
  upcomingTasks: UpcomingTask[];
  isOrgAdmin: boolean;
  userBoardRole: string | null;
  onClearSelection: () => void;
  onOpenSettings: () => void;
};

export function ProjectHubDetail({
  board,
  members,
  upcomingTasks,
  isOrgAdmin,
  userBoardRole,
  onClearSelection,
  onOpenSettings,
}: Props) {
  const canManage = canManageBoardMembers(isOrgAdmin, userBoardRole);
  const canEdit = canEditBoardUI(isOrgAdmin, userBoardRole);
  const tint = board.color || DEFAULT_BOARD_COLOR;

  return (
    <aside
      className="hub-panel-enter rounded-xl border border-aurora-border bg-aurora-surface p-4 lg:sticky lg:top-4"
      data-testid="project-hub-detail"
    >
      <div className="mb-4 flex items-start gap-3" style={{ borderLeft: `4px solid ${tint}`, paddingLeft: 12 }}>
        <BoardIcon icon={board.icon} color={board.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-aurora-fg">{board.name}</h3>
            {canEdit ? (
              <button
                type="button"
                aria-label="Configuracoes do projeto"
                data-testid="project-hub-settings"
                onClick={onOpenSettings}
                className="rounded-md p-1.5 text-aurora-muted transition hover:bg-aurora-surface-2 hover:text-aurora-fg"
              >
                <Settings className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-aurora-muted">
            {board.description || "Sem descricao"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-aurora-muted">
            <span>{board.open_cards} cards abertos</span>
            {board.tiflux_enabled ? (
              <span className="rounded bg-aurora-accent px-1.5 py-0.5 font-medium text-white">Tiflux</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/boards/${board.id}`}
          className={`inline-flex items-center gap-2 ${btnPrimary}`}
          data-testid="open-project"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir Projeto
        </Link>
        <button type="button" onClick={onClearSelection} className={`inline-flex items-center gap-2 ${btnSecondary}`}>
          <ArrowLeftRight className="h-4 w-4" />
          Trocar projeto
        </button>
      </div>

      <div className="space-y-4">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-aurora-muted">Participantes</h4>
          <ShareProjectPanel boardId={board.id} members={members} canManageMembers={canManage} />
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-aurora-muted">
            Proximas tarefas
          </h4>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-aurora-muted">Nenhuma tarefa com prazo nos proximos dias.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-aurora-border px-3 py-2 text-sm transition hover:border-aurora-accent/50 hover:bg-aurora-surface-2"
                >
                  <p className="font-medium text-aurora-fg">{t.title}</p>
                  <p className="text-xs text-aurora-muted">{formatDue(t.due_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
