"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { BoardCard } from "./types";
import {
  timelineCardDragId,
  timelineResizeDragId,
} from "@/lib/timeline-schedule";
import { TIMELINE_BAR_HEIGHT_PX, TIMELINE_ROW_HEIGHT_PX } from "@/lib/timeline-scale";

export const TIMELINE_STAGE_FALLBACK = "#8993a4";

type Props = {
  card: BoardCard;
  stageLabel: string;
  stageColor: string;
  assigneeLabel: string;
  labelWidth: number;
  canvasWidth: number;
  barX: number;
  barWidth: number;
  barColor: string;
  canEdit: boolean;
  onSelect: (id: string) => void;
};

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? "";
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

export function TimelinePersonAvatar({
  id,
  label,
}: {
  id: string | null;
  label: string;
}) {
  const initials = id ? initialsFromLabel(label) : "?";
  const background = id ? `hsl(${hueFromId(id)} 62% 72%)` : TIMELINE_STAGE_FALLBACK;
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-[#0e1017]"
      style={{ backgroundColor: background }}
      title={label}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function TimelineRow({
  card,
  stageLabel,
  stageColor,
  assigneeLabel,
  labelWidth,
  canvasWidth,
  barX,
  barWidth,
  barColor,
  canEdit,
  onSelect,
}: Props) {
  const description = card.description?.trim() ?? "";

  return (
    <div
      className="flex border-b border-board-border/40"
      style={{ height: TIMELINE_ROW_HEIGHT_PX }}
      data-testid={`timeline-row-${card.id}`}
      data-card-title={card.title}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-board-border bg-board-surface py-1 pl-3 pr-2"
        style={{ width: labelWidth }}
      >
        <span
          className="absolute left-0 top-1 bottom-1 w-1 rounded"
          style={{ backgroundColor: stageColor }}
          aria-hidden
        />
        <p className="truncate text-xs font-medium text-aurora-fg" title={card.title}>
          {card.title}
        </p>
        {description ? (
          <p className="truncate text-[10px] text-aurora-muted" title={description}>
            {description}
          </p>
        ) : null}
        <p className="flex min-w-0 items-center gap-2 text-[10px] text-aurora-muted">
          <span
            className="max-w-[50%] truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${stageColor} 18%, transparent)`,
              color: stageColor,
            }}
            data-testid={`timeline-row-stage-${card.id}`}
          >
            {stageLabel}
          </span>
          <span
            className="flex min-w-0 items-center gap-1 truncate"
            data-testid={`timeline-row-assignee-${card.id}`}
          >
            <TimelinePersonAvatar id={card.assignee_id} label={assigneeLabel} />
            <span className="truncate">{assigneeLabel}</span>
          </span>
        </p>
      </div>
      <div className="relative" style={{ width: canvasWidth, height: TIMELINE_ROW_HEIGHT_PX }}>
        <TimelineBar
          card={card}
          x={barX}
          width={barWidth}
          barColor={barColor}
          canEdit={canEdit}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function TimelineBar({
  card,
  x,
  width,
  barColor,
  canEdit,
  onSelect,
}: {
  card: BoardCard;
  x: number;
  width: number;
  barColor: string;
  canEdit: boolean;
  onSelect: (id: string) => void;
}) {
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: timelineCardDragId(card.id),
    disabled: !canEdit,
    data: { cardId: card.id, kind: "bar" as const },
  });
  if (isDragging) didDragRef.current = true;

  return (
    <div
      className="group absolute"
      style={{
        left: x,
        width: Math.max(width, 8),
        top: (TIMELINE_ROW_HEIGHT_PX - TIMELINE_BAR_HEIGHT_PX) / 2,
        height: TIMELINE_BAR_HEIGHT_PX,
      }}
    >
      <button
        ref={setNodeRef}
        type="button"
        {...(canEdit ? listeners : {})}
        {...(canEdit ? attributes : {})}
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          onSelect(card.id);
        }}
        className={`absolute inset-0 z-[1] rounded-md px-1 text-left text-[10px] font-semibold text-[#0e1017] shadow-sm hover:brightness-110 ${
          canEdit ? "cursor-grab touch-none active:cursor-grabbing" : ""
        } ${isDragging ? "opacity-30" : ""}`}
        style={{ backgroundColor: barColor }}
        title={card.title}
        data-testid={`timeline-bar-${card.id}`}
      >
        <span className="block truncate">{card.title}</span>
      </button>
      {canEdit ? (
        <>
          <ResizeHandle cardId={card.id} edge="start" />
          <ResizeHandle cardId={card.id} edge="end" />
        </>
      ) : null}
    </div>
  );
}

function ResizeHandle({ cardId, edge }: { cardId: string; edge: "start" | "end" }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: timelineResizeDragId(cardId, edge),
    data: { cardId, kind: "resize" as const, edge },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={edge === "start" ? "Redimensionar inicio" : "Redimensionar fim"}
      data-testid={`timeline-resize-${edge}-${cardId}`}
      className={`absolute top-0 z-[2] h-full w-2 cursor-ew-resize touch-none bg-white/30 opacity-0 hover:bg-white/60 group-hover:opacity-100 ${
        edge === "start" ? "left-0 rounded-l" : "right-0 rounded-r"
      }`}
      {...listeners}
      {...attributes}
    />
  );
}
