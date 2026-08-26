import { describe, expect, it } from "vitest";
import type { BoardCard } from "@/components/board/types";
import {
  computeScheduleForWeekDrop,
  isTimelineUnscheduled,
  parseTimelineWeekId,
  timelineWeekId,
} from "./timeline-schedule";

function stubCard(overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    id: "c1",
    column_id: "col",
    position: "a",
    parent_id: null,
    tree_x: null,
    tree_y: null,
    title: "Card",
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    target_date: null,
    estimated_hours: null,
    story_points: null,
    assignee_id: null,
    completed_at: null,
    stage_id: null,
    tagIds: [],
    checklistItems: [],
    comments: [],
    attachments: [],
    treeParentIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
    ...overrides,
  };
}

describe("timeline-schedule", () => {
  const weekMon = new Date("2026-08-17T12:00:00");

  it("card sem datas fica unscheduled", () => {
    expect(isTimelineUnscheduled(stubCard())).toBe(true);
  });

  it("sem datas: drop na semana define seg-dom", () => {
    const result = computeScheduleForWeekDrop(stubCard(), weekMon);
    expect(result.start_date).toBe("2026-08-17T12:00:00.000Z");
    expect(result.due_date).toBe("2026-08-23T12:00:00.000Z");
  });

  it("com datas: mantem duracao ao reposicionar", () => {
    const card = stubCard({
      start_date: "2026-08-10T12:00:00.000Z",
      due_date: "2026-08-12T12:00:00.000Z",
    });
    const result = computeScheduleForWeekDrop(card, weekMon);
    expect(result.start_date).toBe("2026-08-17T12:00:00.000Z");
    expect(result.due_date).toBe("2026-08-19T12:00:00.000Z");
  });

  it("week id roundtrip", () => {
    const id = timelineWeekId(weekMon);
    expect(parseTimelineWeekId(id)?.toISOString().slice(0, 10)).toBe("2026-08-17");
  });
});
