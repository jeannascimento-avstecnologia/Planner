import { describe, expect, it } from "vitest";
import type { BoardCard } from "@/components/board/types";
import { buildCardForest } from "./index";
import { layoutOrgChart } from "./layout-org-chart";

function card(
  id: string,
  opts: { parent_id?: string | null; position?: string } = {},
): BoardCard {
  return {
    id,
    column_id: "col",
    position: opts.position ?? id,
    parent_id: opts.parent_id ?? null,
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
    stage_id: null,
    tagIds: [],
    checklistItems: [],
    treeParentIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
  };
}

describe("layoutOrgChart", () => {
  it("posiciona raiz no topo e filhos abaixo", () => {
    const forest = buildCardForest([
      card("root", { position: "a0" }),
      card("c1", { parent_id: "root", position: "a0" }),
      card("c2", { parent_id: "root", position: "a1" }),
    ]);
    const layout = layoutOrgChart(forest, {
      nodeWidth: 100,
      nodeHeight: 50,
      gapX: 20,
      gapY: 40,
    });

    const root = layout.nodes.find((n) => n.id === "root")!;
    const c1 = layout.nodes.find((n) => n.id === "c1")!;
    const c2 = layout.nodes.find((n) => n.id === "c2")!;

    expect(root.y).toBe(0);
    expect(c1.y).toBeGreaterThan(root.y);
    expect(c2.y).toBe(c1.y);
    expect(c1.x).toBeLessThan(c2.x);
    expect(layout.edges).toHaveLength(2);
    expect(layout.edges[0].path).toMatch(/^M /);
  });

  it("floresta vazia", () => {
    const layout = layoutOrgChart([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.width).toBe(0);
  });

  it("multiplas raizes lado a lado", () => {
    const forest = buildCardForest([
      card("a", { position: "a0" }),
      card("b", { position: "a1" }),
    ]);
    const layout = layoutOrgChart(forest, { nodeWidth: 100, gapX: 20 });
    const a = layout.nodes.find((n) => n.id === "a")!;
    const b = layout.nodes.find((n) => n.id === "b")!;
    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
    expect(b.x).toBeGreaterThan(a.x);
  });
});
