"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertCircle, CalendarClock, HelpCircle } from "lucide-react";
import type { PlanSidebarCard } from "@/lib/plan/types";
import { formatDue } from "@/components/board/types";
import { planSidebarCardClass, planSidebarCardDraggingClass } from "@/lib/ui-classes";

const BUCKET_META: Record<
  PlanSidebarCard["bucket"],
  { label: string; icon: typeof AlertCircle; accent: string; cardBorder: string }
> = {
  overdue: {
    label: "Atrasados",
    icon: AlertCircle,
    accent: "text-aurora-danger",
    cardBorder: "border-l-2 border-l-aurora-danger",
  },
  unscheduled: {
    label: "Nao agendados",
    icon: CalendarClock,
    accent: "text-aurora-brand",
    cardBorder: "border-l-2 border-l-aurora-brand",
  },
  no_estimate: {
    label: "Sem estimativa",
    icon: HelpCircle,
    accent: "text-aurora-muted",
    cardBorder: "border-l-2 border-l-aurora-border",
  },
};

type Props = {
  cards: PlanSidebarCard[];
  canEdit: boolean;
  testId?: string;
};

function DraggableSidebarCard({ card, canEdit }: { card: PlanSidebarCard; canEdit: boolean }) {
  const meta = BUCKET_META[card.bucket];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${card.cardId}`,
    data: { type: "sidebar-card", cardId: card.cardId },
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? { ...listeners, ...attributes } : {})}
      className={`${planSidebarCardClass} ${meta.cardBorder} ${
        canEdit ? "cursor-grab active:cursor-grabbing" : "opacity-70"
      } ${isDragging ? planSidebarCardDraggingClass : ""}`}
      data-testid={`plan-sidebar-card-${card.cardId}`}
    >
      <p className="truncate font-medium text-aurora-fg">{card.title}</p>
      {card.description?.trim() ? (
        <p className="line-clamp-2 text-xs text-aurora-muted">{card.description.trim()}</p>
      ) : null}
      <p className="truncate text-xs text-aurora-muted">
        Entrega estimada: {card.targetDate ? formatDue(card.targetDate) : "—"}
      </p>
      <p className="truncate text-xs text-aurora-muted">
        Prazo final: {card.dueDate ? formatDue(card.dueDate) : "—"}
      </p>
      <p className="truncate text-xs text-aurora-muted">{card.boardName}</p>
    </div>
  );
}

export function PlanSidebar({ cards, canEdit, testId = "plan-sidebar" }: Props) {
  const buckets: PlanSidebarCard["bucket"][] = ["overdue", "unscheduled", "no_estimate"];

  return (
    <aside
      className={`hub-panel-enter w-full shrink-0 space-y-4 rounded-xl border border-aurora-border bg-aurora-surface-2/40 p-3 md:w-56 lg:w-64`}
      aria-label="Cards para agendar"
      data-testid={testId}
    >
      {canEdit ? (
        <p className="text-xs text-aurora-muted">Arraste cards para o calendario. Depois, clique em um dia para apontar horas.</p>
      ) : null}
      {buckets.map((bucket) => {
        const items = cards.filter((c) => c.bucket === bucket);
        if (items.length === 0) return null;
        const meta = BUCKET_META[bucket];
        const Icon = meta.icon;
        return (
          <section key={bucket}>
            <h3 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${meta.accent}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {meta.label}
              <span className="rounded-full bg-aurora-surface px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-aurora-fg">
                {items.length}
              </span>
            </h3>
            <div className="space-y-2">
              {items.map((card) => (
                <DraggableSidebarCard key={card.cardId} card={card} canEdit={canEdit} />
              ))}
            </div>
          </section>
        );
      })}
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-aurora-border bg-aurora-surface px-3 py-4 text-center text-xs text-aurora-muted">
          Nenhum card pendente de planejamento.
        </p>
      ) : null}
    </aside>
  );
}
