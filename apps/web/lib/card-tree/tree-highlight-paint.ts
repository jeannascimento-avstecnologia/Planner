/** Opacity for tree canvas highlight (strong=1, muted=0.4, dim=0.12). */
export function treeHighlightOpacity(flags: {
  strong: boolean;
  muted: boolean;
  dim: boolean;
}): number {
  if (flags.dim) return 0.12;
  if (flags.muted) return 0.4;
  return 1;
}

/** React paint key — @xyflow Node has no filterKey API. */
export function treeHighlightPaintKey(flags: {
  strong: boolean;
  muted: boolean;
  dim: boolean;
}): string {
  const o = treeHighlightOpacity(flags);
  return `${flags.strong ? "s" : ""}${flags.muted ? "m" : ""}${flags.dim ? "d" : ""}|${o}`;
}
