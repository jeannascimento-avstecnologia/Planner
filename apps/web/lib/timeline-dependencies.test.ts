import { describe, expect, it } from "vitest";
import type { CardDependencyRow } from "@/components/board/types";
import {
  buildTimelineDependencyPaths,
  filterBoardDependencies,
  type TimelineBarRect,
} from "./timeline-dependencies";

const dep = (id: string, blocker: string, blocked: string): CardDependencyRow => ({
  id,
  blocker_card_id: blocker,
  blocked_card_id: blocked,
  type: "finish_to_start",
});

describe("timeline-dependencies", () => {
  it("filtra endpoints fora do board e duplicatas", () => {
    const rows = [
      { id: "d1", blocker_card_id: "a", blocked_card_id: "b", type: "finish_to_start" },
      { id: "d1", blocker_card_id: "a", blocked_card_id: "b", type: "finish_to_start" },
      { id: "d2", blocker_card_id: "a", blocked_card_id: "x", type: "finish_to_start" },
      { id: "d3", blocker_card_id: "a", blocked_card_id: "b", type: "start_to_start" },
    ];
    const out = filterBoardDependencies(rows, new Set(["a", "b"]));
    expect(out).toEqual([dep("d1", "a", "b")]);
  });

  it("path FS mesma linha e cross-lane; omite endpoint ausente; ordem por id", () => {
    const rects = new Map<string, TimelineBarRect>([
      ["a", { cardId: "a", x: 0, y: 10, width: 40, height: 20 }],
      ["b", { cardId: "b", x: 80, y: 10, width: 40, height: 20 }],
      ["c", { cardId: "c", x: 80, y: 70, width: 40, height: 20 }],
    ]);
    const paths = buildTimelineDependencyPaths(
      [dep("z2", "a", "c"), dep("a1", "a", "b"), dep("m", "a", "missing")],
      rects,
    );
    expect(paths.map((p) => p.dependencyId)).toEqual(["a1", "z2"]);
    expect(paths[0]?.d).toBe("M 40 20 L 80 20");
    expect(paths[1]?.d).toBe("M 40 20 H 50 V 80 H 80");
  });

  it("direcao reversa ainda desenha (sem validar temporalidade)", () => {
    const rects = new Map<string, TimelineBarRect>([
      ["a", { cardId: "a", x: 100, y: 0, width: 20, height: 10 }],
      ["b", { cardId: "b", x: 0, y: 40, width: 20, height: 10 }],
    ]);
    const paths = buildTimelineDependencyPaths([dep("d", "a", "b")], rects);
    expect(paths).toHaveLength(1);
    expect(paths[0]?.d).toContain("M 120 5");
  });
});
