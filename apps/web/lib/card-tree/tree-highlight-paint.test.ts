import { describe, expect, it } from "vitest";
import { treeHighlightOpacity, treeHighlightPaintKey } from "./tree-highlight-paint";

describe("treeHighlightOpacity / paintKey", () => {
  it("strong and default are fully opaque", () => {
    expect(treeHighlightOpacity({ strong: true, muted: false, dim: false })).toBe(1);
    expect(treeHighlightOpacity({ strong: false, muted: false, dim: false })).toBe(1);
  });

  it("muted and dim reduce opacity", () => {
    expect(treeHighlightOpacity({ strong: false, muted: true, dim: false })).toBe(0.4);
    expect(treeHighlightOpacity({ strong: false, muted: false, dim: true })).toBe(0.12);
  });

  it("paint key changes when highlight changes (forces remount)", () => {
    const none = treeHighlightPaintKey({ strong: false, muted: false, dim: false });
    const dim = treeHighlightPaintKey({ strong: false, muted: false, dim: true });
    const strong = treeHighlightPaintKey({ strong: true, muted: false, dim: false });
    expect(none).not.toBe(dim);
    expect(dim).not.toBe(strong);
  });
});
