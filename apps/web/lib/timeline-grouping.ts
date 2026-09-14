import {
  displayStageName,
  memberLabel,
  resolveCardStage,
  STAGE_NONE_LABEL,
  type BoardCard,
  type ColumnRow,
  type ProfileRow,
  type StageRow,
  type TagRow,
} from "@/components/board/types";
import { TIMELINE_LANE_HEADER_PX, TIMELINE_ROW_HEIGHT_PX } from "@/lib/timeline-scale";

export const TIMELINE_GROUPS = ["none", "column", "assignee", "tag", "stage"] as const;
export type TimelineGroupBy = (typeof TIMELINE_GROUPS)[number];

export interface TimelineLane {
  key: string;
  label: string;
  cards: BoardCard[];
}

export interface TimelineGroupingContext {
  columns: ColumnRow[];
  members: ProfileRow[];
  tags: TagRow[];
  stagesById: Map<string, StageRow>;
}

export const DEFAULT_TIMELINE_GROUP: TimelineGroupBy = "none";

export function parseTimelineGroupBy(raw: string | null): TimelineGroupBy {
  if (raw && (TIMELINE_GROUPS as readonly string[]).includes(raw)) {
    return raw as TimelineGroupBy;
  }
  return DEFAULT_TIMELINE_GROUP;
}

export function timelineGroupParam(value: TimelineGroupBy): string | null {
  return value === DEFAULT_TIMELINE_GROUP ? null : value;
}

const NONE_KEY = "none";

function pushIfNonEmpty(
  lanes: TimelineLane[],
  key: string,
  label: string,
  cards: BoardCard[],
): void {
  if (cards.length === 0) return;
  lanes.push({ key, label, cards });
}

function catalogTagIds(tags: TagRow[]): string[] {
  return tags.map((t) => t.id);
}

function orderedTagIds(card: BoardCard, catalog: string[]): string[] {
  const set = new Set(card.tagIds);
  const ordered = catalog.filter((id) => set.has(id));
  const extra = [...set].filter((id) => !catalog.includes(id)).sort();
  return [...ordered, ...extra];
}

function tagLaneKey(ids: string[]): string {
  return ids.length === 0 ? NONE_KEY : ids.join("|");
}

function tagLaneLabel(ids: string[], tagsById: Map<string, TagRow>): string {
  if (ids.length === 0) return "Sem marcador";
  return ids.map((id) => tagsById.get(id)?.name ?? id.slice(0, 8)).join(" · ");
}

export function deriveTimelineLanes(
  cards: BoardCard[],
  groupBy: TimelineGroupBy,
  context: TimelineGroupingContext,
): TimelineLane[] {
  if (groupBy === "none") {
    return cards.length === 0 ? [] : [{ key: "all", label: "", cards: [...cards] }];
  }

  if (groupBy === "column") {
    const byCol = new Map<string, BoardCard[]>();
    for (const card of cards) {
      const list = byCol.get(card.column_id) ?? [];
      list.push(card);
      byCol.set(card.column_id, list);
    }
    const lanes: TimelineLane[] = [];
    for (const col of context.columns) {
      pushIfNonEmpty(lanes, col.id, col.name, byCol.get(col.id) ?? []);
    }
    const known = new Set(context.columns.map((c) => c.id));
    for (const [id, list] of byCol) {
      if (!known.has(id)) pushIfNonEmpty(lanes, id, id.slice(0, 8), list);
    }
    return lanes;
  }

  if (groupBy === "assignee") {
    const byAssignee = new Map<string, BoardCard[]>();
    const unassigned: BoardCard[] = [];
    for (const card of cards) {
      if (!card.assignee_id) {
        unassigned.push(card);
        continue;
      }
      const list = byAssignee.get(card.assignee_id) ?? [];
      list.push(card);
      byAssignee.set(card.assignee_id, list);
    }
    const lanes: TimelineLane[] = [];
    const membersById = new Map(context.members.map((m) => [m.id, m]));
    for (const member of context.members) {
      pushIfNonEmpty(lanes, member.id, memberLabel(member), byAssignee.get(member.id) ?? []);
    }
    for (const [id, list] of byAssignee) {
      if (!membersById.has(id)) {
        pushIfNonEmpty(lanes, id, id.slice(0, 8), list);
      }
    }
    pushIfNonEmpty(lanes, NONE_KEY, "Sem responsavel", unassigned);
    return lanes;
  }

  if (groupBy === "stage") {
    const stages = [...context.stagesById.values()].sort((a, b) => a.position - b.position);
    const byStage = new Map<string, BoardCard[]>();
    const unstaged: BoardCard[] = [];
    for (const card of cards) {
      const stage = resolveCardStage(card, context.columns, context.stagesById);
      if (!stage) {
        unstaged.push(card);
        continue;
      }
      const list = byStage.get(stage.id) ?? [];
      list.push(card);
      byStage.set(stage.id, list);
    }
    const lanes: TimelineLane[] = [];
    for (const stage of stages) {
      pushIfNonEmpty(lanes, stage.id, displayStageName(stage.name), byStage.get(stage.id) ?? []);
    }
    const known = new Set(stages.map((s) => s.id));
    for (const [id, list] of byStage) {
      if (!known.has(id)) pushIfNonEmpty(lanes, id, id.slice(0, 8), list);
    }
    pushIfNonEmpty(lanes, NONE_KEY, STAGE_NONE_LABEL, unstaged);
    return lanes;
  }

  const catalog = catalogTagIds(context.tags);
  const tagsById = new Map(context.tags.map((t) => [t.id, t]));
  const byCombo = new Map<string, { ids: string[]; cards: BoardCard[] }>();
  const untagged: BoardCard[] = [];
  for (const card of cards) {
    const ids = orderedTagIds(card, catalog);
    if (ids.length === 0) {
      untagged.push(card);
      continue;
    }
    const key = tagLaneKey(ids);
    const cur = byCombo.get(key);
    if (cur) cur.cards.push(card);
    else byCombo.set(key, { ids, cards: [card] });
  }
  const combos = [...byCombo.entries()].sort((a, b) =>
    tagLaneLabel(a[1].ids, tagsById).localeCompare(tagLaneLabel(b[1].ids, tagsById), "pt-BR"),
  );
  const lanes: TimelineLane[] = [];
  for (const [key, combo] of combos) {
    pushIfNonEmpty(lanes, key, tagLaneLabel(combo.ids, tagsById), combo.cards);
  }
  pushIfNonEmpty(lanes, NONE_KEY, "Sem marcador", untagged);
  return lanes;
}

export interface TimelineLaidOutRow {
  card: BoardCard;
  y: number;
  laneKey: string;
}

export function layoutTimelineRows(
  lanes: TimelineLane[],
  groupBy: TimelineGroupBy,
): { rows: TimelineLaidOutRow[]; height: number } {
  const showHeaders = groupBy !== "none";
  let y = 0;
  const rows: TimelineLaidOutRow[] = [];
  for (const lane of lanes) {
    if (showHeaders) y += TIMELINE_LANE_HEADER_PX;
    for (const card of lane.cards) {
      rows.push({ card, y, laneKey: lane.key });
      y += TIMELINE_ROW_HEIGHT_PX;
    }
  }
  return { rows, height: Math.max(y, TIMELINE_ROW_HEIGHT_PX) };
}
