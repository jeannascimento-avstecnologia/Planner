"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Move } from "lucide-react";
import { PriorityBadge, StageBadge, TagChip } from "./badges";
import { TifluxCardButton } from "./tiflux-card-button";
import { stageCardStyle } from "@/lib/color-utils";
import { tileBoardInteractive, tileBoardOverdue } from "@/lib/ui-classes";
import { formatDue, isCardOverdue, memberLabel, resolveCardStage, type BoardCard, type ColumnRow, type ProfileRow, type StageRow, type TagRow } from "./types";

export type CardMoveHandleProps = {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  listeners: SyntheticListenerMap | undefined;
  attributes: DraggableAttributes;
};

type Props = {
  card: BoardCard;
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  readOnlyTiflux?: boolean;
  subtasksProgress?: { done: number; total: number } | null;
  moveHandle?: CardMoveHandleProps;
  onSelect: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardCardTile({
  card,
  columns,
  stagesById,
  tags,
  profilesById,
  tifluxEnabled,
  readOnlyTiflux = false,
  subtasksProgress = null,
  moveHandle,
  onSelect,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  const overdue = isCardOverdue(card, stagesById);
  const assignee = card.assignee_id ? profilesById[card.assignee_id] : undefined;
  const stage = resolveCardStage(card, columns, stagesById);
  const cardStyle = stage ? stageCardStyle(stage.color) : undefined;

  function openCard() {
    onSelect(card.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`board-card-${card.id}`}
      onClick={(e) => {
        e.stopPropagation();
        openCard();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCard();
        }
      }}
      className={`relative w-full cursor-pointer p-3 text-left ${
        moveHandle ? "pb-9" : ""
      } ${overdue ? tileBoardOverdue : tileBoardInteractive}`}
      data-overdue={overdue ? "true" : undefined}
      style={
        cardStyle
          ? {
              backgroundColor: cardStyle.backgroundColor,
              color: cardStyle.color,
              ...(overdue ? { borderColor: "var(--color-aurora-danger)" } : {}),
            }
          : overdue
            ? { borderColor: "var(--color-aurora-danger)" }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 break-words text-sm leading-snug">{card.title}</p>
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <TifluxCardButton
            card={card}
            tifluxEnabled={tifluxEnabled}
            readOnly={readOnlyTiflux}
            compact
            onOpenTifluxCreate={onOpenTifluxCreate}
            onOpenTifluxLink={onOpenTifluxLink}
          />
        </span>
      </div>
      <div className="mt-2 w-full">
        <div className="flex flex-wrap items-center gap-1">
          {stage ? <StageBadge name={stage.name} color={stage.color} /> : null}
          <PriorityBadge priority={card.priority} />
          {card.due_date ? (
            <span className={`text-xs ${overdue ? "font-semibold text-aurora-danger" : "text-aurora-muted"}`}>
              {formatDue(card.due_date)}
            </span>
          ) : null}
          {assignee ? <span className="text-xs text-aurora-muted">{memberLabel(assignee)}</span> : null}
          {subtasksProgress && subtasksProgress.total > 0 ? (
            <span
              className="rounded bg-board-accent-muted/60 px-1.5 py-0.5 text-xs text-aurora-muted"
              data-testid={`subtasks-badge-${card.id}`}
            >
              {subtasksProgress.done}/{subtasksProgress.total}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {card.tagIds.map((tid) => {
            const t = tags.find((x) => x.id === tid);
            return t ? <TagChip key={tid} tag={t} /> : null;
          })}
        </div>
      </div>
      {moveHandle ? (
        <button
          type="button"
          ref={moveHandle.setActivatorNodeRef}
          aria-label="Mover card"
          data-testid={`drag-handle-${card.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 cursor-grab touch-none rounded-md p-1 text-aurora-muted/80 hover:bg-board-accent-muted/50 hover:text-aurora-fg active:cursor-grabbing"
          {...moveHandle.listeners}
          {...moveHandle.attributes}
        >
          <Move className="h-4 w-4" strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}
