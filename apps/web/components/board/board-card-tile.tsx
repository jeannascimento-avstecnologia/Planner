"use client";

import { PriorityBadge, TagChip } from "./badges";
import { TifluxCardButton } from "./tiflux-card-button";
import { formatDue, isOverdue, memberLabel, type BoardCard, type ProfileRow, type TagRow } from "./types";

type Props = {
  card: BoardCard;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  onSelect: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardCardTile({
  card,
  tags,
  profilesById,
  tifluxEnabled,
  onSelect,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  const overdue = isOverdue(card.due_date, card.completed_at);
  const assignee = card.assignee_id ? profilesById[card.assignee_id] : undefined;

  return (
    <div
      className={`w-full rounded-lg border bg-board-surface p-3 text-left shadow-sm transition hover:border-board-accent ${
        overdue ? "border-aurora-danger/60 ring-1 ring-aurora-danger/30" : "border-board-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelect(card.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="break-words text-sm leading-snug text-aurora-fg">{card.title}</p>
        </button>
        <TifluxCardButton
          card={card}
          tifluxEnabled={tifluxEnabled}
          onOpenTifluxCreate={onOpenTifluxCreate}
          onOpenTifluxLink={onOpenTifluxLink}
        />
      </div>
      <button type="button" onClick={() => onSelect(card.id)} className="mt-2 w-full text-left">
        <div className="flex flex-wrap items-center gap-1">
          <PriorityBadge priority={card.priority} />
          {card.due_date ? (
            <span className={`text-xs ${overdue ? "font-semibold text-aurora-danger" : "text-aurora-muted"}`}>
              {formatDue(card.due_date)}
            </span>
          ) : null}
          {assignee ? <span className="text-xs text-aurora-muted">{memberLabel(assignee)}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {card.tagIds.map((tid) => {
            const t = tags.find((x) => x.id === tid);
            return t ? <TagChip key={tid} tag={t} /> : null;
          })}
        </div>
      </button>
    </div>
  );
}
