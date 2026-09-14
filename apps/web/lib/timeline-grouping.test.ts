import { describe, expect, it } from "vitest";
import type { BoardCard, StageRow } from "@/components/board/types";
import { STAGE_NONE_LABEL } from "@/components/board/types";
import { deriveTimelineLanes, parseTimelineGroupBy, timelineGroupParam } from "./timeline-grouping";

function stubCard(overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    id: "c1",
    column_id: "col-a",
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

const stages: StageRow[] = [
  { id: "st-prog", name: "Em Progresso", color: "#f59e0b", position: 1, is_system: true, system_key: "em_progresso" },
  { id: "st-done", name: "Concluido", color: "#10b981", position: 2, is_system: true, system_key: "concluido" },
];

const ctx = {
  columns: [
    { id: "col-a", name: "To Start", default_stage_id: "st-prog" },
    { id: "col-b", name: "Done", default_stage_id: "st-done" },
  ],
  members: [
    { id: "u1", full_name: "Ana" },
    { id: "u2", full_name: "Bruno" },
  ],
  tags: [
    { id: "t-back", name: "backend", color: "#456993" },
    { id: "t-urg", name: "urgente", color: "#334155" },
  ],
  stagesById: new Map(stages.map((s) => [s.id, s])),
};

describe("timeline-grouping", () => {
  it("parse/omit default group", () => {
    expect(parseTimelineGroupBy(null)).toBe("none");
    expect(parseTimelineGroupBy("stage")).toBe("stage");
    expect(timelineGroupParam("none")).toBeNull();
    expect(timelineGroupParam("assignee")).toBe("assignee");
  });

  it("none: uma lane, nao muta entrada", () => {
    const cards = [stubCard({ id: "a" }), stubCard({ id: "b", column_id: "col-b" })];
    const frozen = cards.map((c) => c.id);
    const lanes = deriveTimelineLanes(cards, "none", ctx);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.cards.map((c) => c.id)).toEqual(frozen);
    expect(cards.map((c) => c.id)).toEqual(frozen);
  });

  it("column: ordem das colunas, omite vazias", () => {
    const cards = [
      stubCard({ id: "b", column_id: "col-b" }),
      stubCard({ id: "a", column_id: "col-a" }),
    ];
    const lanes = deriveTimelineLanes(cards, "column", ctx);
    expect(lanes.map((l) => l.key)).toEqual(["col-a", "col-b"]);
  });

  it("assignee: membros depois Sem responsavel no fim", () => {
    const cards = [
      stubCard({ id: "n", assignee_id: null }),
      stubCard({ id: "a", assignee_id: "u1" }),
    ];
    const lanes = deriveTimelineLanes(cards, "assignee", ctx);
    expect(lanes.map((l) => l.key)).toEqual(["u1", "none"]);
    expect(lanes[1]?.label).toBe("Sem responsavel");
  });

  it("stage: herda default da coluna; sem estagio no fim", () => {
    const cards = [
      stubCard({ id: "inherited", column_id: "col-a", stage_id: null }),
      stubCard({ id: "explicit", column_id: "col-a", stage_id: "st-done" }),
      stubCard({ id: "blank", column_id: "col-x", stage_id: null }),
    ];
    const lanes = deriveTimelineLanes(cards, "stage", ctx);
    expect(lanes.find((l) => l.key === "st-prog")?.cards.map((c) => c.id)).toEqual(["inherited"]);
    expect(lanes.find((l) => l.key === "st-done")?.cards.map((c) => c.id)).toEqual(["explicit"]);
    expect(lanes.at(-1)?.label).toBe(STAGE_NONE_LABEL);
    expect(lanes.at(-1)?.cards.map((c) => c.id)).toEqual(["blank"]);
  });

  it("tag: combinacao ordenada pelo catalogo; card unico; sem marcador no fim", () => {
    const multi = stubCard({ id: "multi", tagIds: ["t-urg", "t-back"] });
    const none = stubCard({ id: "none" });
    const lanes = deriveTimelineLanes([multi, none], "tag", ctx);
    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.key).toBe("t-back|t-urg");
    expect(lanes[0]?.label).toBe("backend · urgente");
    expect(lanes[0]?.cards).toHaveLength(1);
    expect(lanes[1]?.key).toBe("none");
    expect(lanes[1]?.label).toBe("Sem marcador");
  });
});
