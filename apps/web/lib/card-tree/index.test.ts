import { describe, expect, it } from "vitest";
import type { BoardCard } from "@/components/board/types";
import {
  buildCardForest,
  canReparent,
  canReparentErrorMessage,
  collectAncestorIds,
  countChildrenProgress,
  filterTreeHighlight,
  getDepth,
  MAX_CARD_TREE_DEPTH,
  subtreeHeight,
  wouldExceedMaxDepth,
} from "./index";

function card(
  id: string,
  opts: { parent_id?: string | null; position?: string; completed_at?: string | null; title?: string } = {},
): BoardCard {
  return {
    id,
    column_id: "col",
    position: opts.position ?? id,
    parent_id: opts.parent_id ?? null,
    tree_x: null,
    tree_y: null,
    title: opts.title ?? id,
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    target_date: null,
    estimated_hours: null,
    story_points: null,
    assignee_id: null,
    completed_at: opts.completed_at ?? null,
    stage_id: null,
    tagIds: [],
    checklistItems: [],
    treeParentIds: opts.parent_id ? [opts.parent_id] : [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
  };
}

describe("buildCardForest", () => {
  it("builds nested forest sorted by position", () => {
    const cards = [
      card("a", { position: "b" }),
      card("b", { parent_id: "a", position: "b" }),
      card("c", { parent_id: "a", position: "a" }),
      card("d", { position: "a" }),
    ];
    const forest = buildCardForest(cards);
    expect(forest.map((n) => n.card.id)).toEqual(["d", "a"]);
    expect(forest[1].children.map((n) => n.card.id)).toEqual(["c", "b"]);
    expect(forest[1].depth).toBe(1);
    expect(forest[1].children[0].depth).toBe(2);
  });

  it("treats orphan parent_id as root", () => {
    const forest = buildCardForest([card("x", { parent_id: "missing" })]);
    expect(forest).toHaveLength(1);
    expect(forest[0].card.id).toBe("x");
  });
});

describe("getDepth / wouldExceedMaxDepth", () => {
  it("counts depth from root=1", () => {
    const cards = [
      card("1"),
      card("2", { parent_id: "1" }),
      card("3", { parent_id: "2" }),
    ];
    expect(getDepth(cards, "1")).toBe(1);
    expect(getDepth(cards, "3")).toBe(3);
  });

  it("guards max depth 8", () => {
    const cards: BoardCard[] = [card("1")];
    for (let i = 2; i <= MAX_CARD_TREE_DEPTH; i++) {
      cards.push(card(String(i), { parent_id: String(i - 1) }));
    }
    expect(wouldExceedMaxDepth(cards, String(MAX_CARD_TREE_DEPTH))).toBe(true);
    expect(wouldExceedMaxDepth(cards, String(MAX_CARD_TREE_DEPTH - 1))).toBe(false);
    expect(wouldExceedMaxDepth(cards, null)).toBe(false);
  });
});

describe("collectAncestorIds", () => {
  it("returns path to root", () => {
    const cards = [card("a"), card("b", { parent_id: "a" }), card("c", { parent_id: "b" })];
    expect(collectAncestorIds(cards, "c")).toEqual(["b", "a"]);
  });
});

describe("filterTreeHighlight", () => {
  it("marks match strong and ancestors muted+expand", () => {
    const cards = [
      card("root", { title: "Root" }),
      card("mid", { parent_id: "root", title: "Mid" }),
      card("leaf", { parent_id: "mid", title: "Match me" }),
    ];
    const hl = filterTreeHighlight(cards, (c) => c.title.includes("Match"));
    expect(hl.strongIds.has("leaf")).toBe(true);
    expect(hl.mutedIds.has("mid")).toBe(true);
    expect(hl.mutedIds.has("root")).toBe(true);
    expect(hl.expandIds.has("mid")).toBe(true);
    expect(hl.expandIds.has("root")).toBe(true);
    expect(hl.mutedIds.has("leaf")).toBe(false);
  });

  it("zero matches → empty strong/muted (UI empty-state)", () => {
    const cards = [
      card("a", { title: "Alpha" }),
      card("b", { parent_id: "a", title: "Beta" }),
    ];
    const hl = filterTreeHighlight(cards, (c) => c.title.includes("ZZZZ"));
    expect(hl.strongIds.size).toBe(0);
    expect(hl.mutedIds.size).toBe(0);
  });
});

describe("countChildrenProgress", () => {
  it("counts direct children done/total", () => {
    const cards = [
      card("p"),
      card("c1", { parent_id: "p", completed_at: "2026-01-01" }),
      card("c2", { parent_id: "p" }),
      card("g", { parent_id: "c1", completed_at: "2026-01-01" }),
    ];
    expect(countChildrenProgress(cards, "p")).toEqual({ done: 1, total: 2 });
  });
});

describe("subtreeHeight / canReparent", () => {
  it("leaf height is 1; nested adds up", () => {
    const cards = [
      card("a"),
      card("b", { parent_id: "a" }),
      card("c", { parent_id: "b" }),
    ];
    expect(subtreeHeight(cards, "c")).toBe(1);
    expect(subtreeHeight(cards, "b")).toBe(2);
    expect(subtreeHeight(cards, "a")).toBe(3);
  });

  it("rejects self and cycle", () => {
    const cards = [card("a"), card("b", { parent_id: "a" }), card("c", { parent_id: "b" })];
    expect(canReparent(cards, "a", "a")).toEqual({ ok: false, reason: "self" });
    expect(canReparent(cards, "a", "c")).toEqual({ ok: false, reason: "cycle" });
    expect(canReparentErrorMessage("cycle")).toMatch(/ciclo/i);
  });

  it("rejects depth overflow for subtree", () => {
    const cards: BoardCard[] = [card("1")];
    for (let i = 2; i <= MAX_CARD_TREE_DEPTH; i++) {
      cards.push(card(String(i), { parent_id: String(i - 1) }));
    }
    cards.push(card("orphan"));
    // Parent at depth 8 → orphan would be depth 9
    expect(canReparent(cards, "orphan", String(MAX_CARD_TREE_DEPTH))).toEqual({
      ok: false,
      reason: "depth",
    });
    expect(canReparent(cards, "orphan", "1").ok).toBe(true);
  });

  it("rejects moving tall subtree under deep parent", () => {
    const cards = [
      card("root"),
      card("mid", { parent_id: "root" }),
      card("chain1"),
      card("chain2", { parent_id: "chain1" }),
      card("chain3", { parent_id: "chain2" }),
    ];
    // Fill to depth 6 under root so mid is at 2; move chain1 (height 3) under a depth-6 node
    const deep: BoardCard[] = [card("d1")];
    for (let i = 2; i <= 6; i++) {
      deep.push(card(`d${i}`, { parent_id: `d${i - 1}` }));
    }
    deep.push(card("tall"), card("tall-c", { parent_id: "tall" }), card("tall-gc", { parent_id: "tall-c" }));
    // d6 depth=6, tall height=3 → 6+3=9 > 8
    expect(canReparent(deep, "tall", "d6")).toEqual({ ok: false, reason: "depth" });
    expect(canReparent(deep, "tall", "d5").ok).toBe(true); // 5+3=8
    expect(canReparent(cards, "mid", "root")).toEqual({ ok: false, reason: "noop" });
  });

  it("allows promote to root and valid reparent", () => {
    const cards = [card("a"), card("b", { parent_id: "a" }), card("c")];
    expect(canReparent(cards, "b", null)).toEqual({ ok: true });
    expect(canReparent(cards, "b", "c")).toEqual({ ok: true });
    expect(canReparent(cards, "b", "a")).toEqual({ ok: false, reason: "noop" });
  });
});
