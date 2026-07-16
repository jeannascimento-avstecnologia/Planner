"use client";

import type { ReactNode } from "react";
import { btnBoardSecondary } from "@/lib/ui-classes";
import { AuroraDrawer } from "@/components/ui/aurora-drawer";
import { stageCardStyle } from "@/lib/color-utils";
import { PriorityBadge, StageBadge, TagChip } from "./badges";
import { TifluxTicketBadges } from "./tiflux-ticket-badges";
import { ChecklistEditor } from "./checklist-editor";
import {
  formatDue,
  memberLabel,
  resolveCardStage,
  type BoardCard,
  type ColumnRow,
  type ProfileRow,
  type StageRow,
  type TagRow,
} from "./types";

type Props = {
  card: BoardCard;
  boardId: string;
  columns: ColumnRow[];
  stages: StageRow[];
  tags: TagRow[];
  members: ProfileRow[];
  allCards?: BoardCard[];
  tifluxEnabled?: boolean;
  onClose: () => void;
};

function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-aurora-muted">{label}</p>
      <div className="text-sm text-aurora-fg">{children}</div>
    </div>
  );
}

export function CardDrawerReadOnly({
  card,
  boardId,
  columns,
  stages,
  tags,
  members,
  allCards = [],
  tifluxEnabled = false,
  onClose,
}: Props) {
  const stagesById = new Map(stages.map((s) => [s.id, s]));
  const stage = resolveCardStage(card, columns, stagesById);
  const headerStyle = stage ? stageCardStyle(stage.color) : undefined;
  const assignee = card.assignee_id ? members.find((m) => m.id === card.assignee_id) : undefined;
  const children = allCards
    .filter((c) => c.parent_id === card.id)
    .sort((a, b) => a.position.localeCompare(b.position));

  return (
    <AuroraDrawer onClose={onClose} showHeader={false} testId="card-drawer-readonly">
      <header
          className="flex items-center justify-between border-b border-board-border px-4 py-3"
          style={headerStyle ? { backgroundColor: headerStyle.backgroundColor, color: headerStyle.color } : undefined}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Ver card</h2>
            {stage ? <StageBadge name={stage.name} color={stage.color} /> : null}
          </div>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            Fechar
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <ReadOnlyField label="Titulo">{card.title}</ReadOnlyField>

          <ReadOnlyField label="Descricao">
            {card.description?.trim() ? (
              <p className="whitespace-pre-wrap">{card.description}</p>
            ) : (
              <span className="text-aurora-muted">—</span>
            )}
          </ReadOnlyField>

          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Inicio">
              {card.start_date ? formatDue(card.start_date) : <span className="text-aurora-muted">—</span>}
            </ReadOnlyField>
            <ReadOnlyField label="Entrega estimada">
              {card.target_date ? formatDue(card.target_date) : <span className="text-aurora-muted">—</span>}
            </ReadOnlyField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Prazo final">
              {card.due_date ? formatDue(card.due_date) : <span className="text-aurora-muted">—</span>}
            </ReadOnlyField>
            <ReadOnlyField label="Horas estimadas">
              {card.estimated_hours != null ? `${card.estimated_hours}h` : <span className="text-aurora-muted">—</span>}
            </ReadOnlyField>
          </div>

          <ReadOnlyField label="Prioridade">
            <PriorityBadge priority={card.priority} />
          </ReadOnlyField>

          <ReadOnlyField label="Responsavel">
            {assignee ? memberLabel(assignee) : <span className="text-aurora-muted">Sem responsavel</span>}
          </ReadOnlyField>

          <ReadOnlyField label="Marcadores">
            {card.tagIds.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {card.tagIds.map((tid) => {
                  const t = tags.find((x) => x.id === tid);
                  return t ? <TagChip key={tid} tag={t} /> : null;
                })}
              </div>
            ) : (
              <span className="text-aurora-muted">—</span>
            )}
          </ReadOnlyField>

          <ReadOnlyField label="Subtarefas">
            {children.length === 0 ? (
              <span className="text-aurora-muted">Nenhuma</span>
            ) : (
              <ul className="space-y-1" data-testid="drawer-subtasks-readonly">
                {children.map((child) => (
                  <li key={child.id} className="text-sm">
                    {child.title}
                  </li>
                ))}
              </ul>
            )}
          </ReadOnlyField>

          <div data-testid="drawer-checklist-readonly">
            <p className="mb-1 text-xs font-medium text-aurora-muted">To-dos</p>
            <ChecklistEditor cardId={card.id} boardId={boardId} items={card.checklistItems} canEdit={false} />
          </div>

          {tifluxEnabled && card.tiflux_ticket_number ? (
            <ReadOnlyField label="Tiflux">
              <div className="flex flex-col items-start gap-2">
                <TifluxTicketBadges ticketNumber={card.tiflux_ticket_number} />
                <a
                  href={`https://suporte.avstecnologia.cloud/v/tickets/${card.tiflux_ticket_id ?? card.tiflux_ticket_number}/appointments`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 ${btnBoardSecondary}`}
                  data-testid="tiflux-show-appointments"
                >
                  Mostrar apontamentos
                </a>
              </div>
            </ReadOnlyField>
          ) : null}
        </div>
    </AuroraDrawer>
  );
}
