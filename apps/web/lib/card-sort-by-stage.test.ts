import { describe, expect, it } from "vitest";
import { getStageSortWeight, sortCardIdsByStageWeight } from "./card-sort-by-stage";
import type { BoardCard, ColumnRow, StageRow } from "@/components/board/types";

function card(id: string, columnId: string, stageId: string | null): BoardCard {
  return {
    id,
    column_id: columnId,
    position: "a0",
    parent_id: null,
    tree_x: null,
    tree_y: null,
    title: id,
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    target_date: null,
    estimated_hours: null,
    story_points: null,
    assignee_id: null,
    completed_at: null,
    stage_id: stageId,
    tagIds: [],
    checklistItems: [],
    comments: [],
    attachments: [],
    treeParentIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
  };
}

const columns: ColumnRow[] = [{ id: "col1", name: "A", default_stage_id: null }];
const stagesById = new Map<string, StageRow>([
  ["parado", { id: "parado", name: "Parado", color: "#000", position: 0, is_system: true, system_key: "parado" }],
  ["prog", { id: "prog", name: "Em Progresso", color: "#000", position: 1, is_system: true, system_key: "em_progresso" }],
  ["done", { id: "done", name: "Concluído", color: "#000", position: 2, is_system: true, system_key: "concluido" }],
  ["cancel", { id: "cancel", name: "Cancelado", color: "#000", position: 3, is_system: true, system_key: "cancelado" }],
]);

describe("getStageSortWeight", () => {
  it("atribui pesos corretos", () => {
    expect(getStageSortWeight(null)).toBe(0);
    expect(getStageSortWeight(stagesById.get("parado")!)).toBe(1);
    expect(getStageSortWeight(stagesById.get("prog")!)).toBe(2);
    expect(getStageSortWeight(stagesById.get("done")!)).toBe(3);
    expect(getStageSortWeight(stagesById.get("cancel")!)).toBe(4);
  });
});

describe("sortCardIdsByStageWeight", () => {
  it("ordena por peso de estágio (sem estágio no topo, concluído no final)", () => {
    const c1 = card("c1", "col1", "done");
    const c2 = card("c2", "col1", "parado");
    const c3 = card("c3", "col1", null);
    const c4 = card("c4", "col1", "prog");
    const c5 = card("c5", "col1", "cancel");
    const map = new Map([
      ["c1", c1],
      ["c2", c2],
      ["c3", c3],
      ["c4", c4],
      ["c5", c5],
    ]);
    expect(sortCardIdsByStageWeight(["c1", "c2", "c3", "c4", "c5"], map, columns, stagesById)).toEqual([
      "c3",
      "c2",
      "c4",
      "c1",
      "c5",
    ]);
  });

  it("mantém ordem original em empate (stable sort)", () => {
    const c1 = card("c1", "col1", "parado");
    const c2 = card("c2", "col1", "parado");
    const map = new Map([
      ["c1", c1],
      ["c2", c2],
    ]);
    expect(sortCardIdsByStageWeight(["c1", "c2"], map, columns, stagesById)).toEqual(["c1", "c2"]);
    expect(sortCardIdsByStageWeight(["c2", "c1"], map, columns, stagesById)).toEqual(["c2", "c1"]);
  });
});
