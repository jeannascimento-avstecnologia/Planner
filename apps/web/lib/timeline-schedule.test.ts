import { describe, expect, it } from "vitest";
import type { BoardCard } from "@/components/board/types";
import {
  computeScheduleFromRange,
  isTimelineUnscheduled,
  parseTimelineYmd,
  resizeTimelineRange,
  shiftTimelineRange,
  timelineDayToYmd,
  timelineRangeFromDays,
  toTimelineDbDate,
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
  it("card sem datas fica unscheduled", () => {
    expect(isTimelineUnscheduled(stubCard())).toBe(true);
  });
});

describe("computeScheduleFromRange", () => {
  it("intervalo normal persiste T12 UTC", () => {
    const result = computeScheduleFromRange("2026-09-01", "2026-09-10");
    expect(result).toEqual({
      ok: true,
      patch: {
        start_date: "2026-09-01T12:00:00.000Z",
        due_date: "2026-09-10T12:00:00.000Z",
      },
    });
  });

  it("inicio igual ao fim = 1 dia", () => {
    const result = computeScheduleFromRange("2026-09-09", "2026-09-09");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.start_date).toBe("2026-09-09T12:00:00.000Z");
      expect(result.patch.due_date).toBe("2026-09-09T12:00:00.000Z");
    }
  });

  it("inicio > fim retorna start_after_end", () => {
    const result = computeScheduleFromRange("2026-09-10", "2026-09-01");
    expect(result).toEqual({
      ok: false,
      code: "start_after_end",
      message: "Inicio deve ser anterior ou igual ao fim.",
    });
  });

  it("data invalida", () => {
    expect(computeScheduleFromRange("09/09/2026", "2026-09-10").ok).toBe(false);
    expect(computeScheduleFromRange("2026-09-31", "2026-10-01")).toEqual({
      ok: false,
      code: "invalid_date",
      message: "Data invalida.",
    });
  });

  it("virada de mes e ano", () => {
    const result = computeScheduleFromRange("2026-12-30", "2027-01-02");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.start_date).toBe(toTimelineDbDate("2026-12-30"));
      expect(result.patch.due_date).toBe(toTimelineDbDate("2027-01-02"));
    }
  });

  it("leap day", () => {
    const result = computeScheduleFromRange("2028-02-28", "2028-02-29");
    expect(result.ok).toBe(true);
    expect(parseTimelineYmd("2028-02-29")).not.toBeNull();
    expect(parseTimelineYmd("2027-02-29")).toBeNull();
  });
});

describe("shiftTimelineRange / resizeTimelineRange", () => {
  const range = timelineRangeFromDays(parseTimelineYmd("2026-01-30")!, parseTimelineYmd("2026-02-02")!);

  it("shift preserva duracao inclusiva e vira o mes", () => {
    const shifted = shiftTimelineRange(range, 2);
    expect(shifted.startYmd).toBe("2026-02-01");
    expect(shifted.endYmd).toBe("2026-02-04");
    expect(shifted.endDay - shifted.startDay).toBe(range.endDay - range.startDay);
  });

  it("resize start clampa contra inversao", () => {
    const resized = resizeTimelineRange(range, "start", 10);
    expect(resized.startYmd).toBe(range.endYmd);
    expect(resized.endYmd).toBe(range.endYmd);
  });

  it("resize end clampa contra inversao", () => {
    const resized = resizeTimelineRange(range, "end", -10);
    expect(resized.endYmd).toBe(range.startYmd);
    expect(resized.startYmd).toBe(range.startYmd);
  });

  it("resize start para a esquerda", () => {
    const resized = resizeTimelineRange(range, "start", -1);
    expect(resized.startYmd).toBe("2026-01-29");
    expect(resized.endYmd).toBe("2026-02-02");
  });

  it("day ordinal roundtrip", () => {
    const day = parseTimelineYmd("2026-09-09")!;
    expect(timelineDayToYmd(day)).toBe("2026-09-09");
  });
});
