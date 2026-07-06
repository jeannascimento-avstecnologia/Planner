"use client";

import type { PresenceState } from "@/hooks/use-board-presence";

type Props = { cursors: PresenceState[] };

export function BoardPresenceLayer({ cursors }: Props) {
  if (!cursors.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50" data-testid="board-presence-layer">
      {cursors.map((c) =>
        c.cursor ? (
          <div
            key={c.userId}
            className="absolute flex items-center gap-1"
            style={{ left: c.cursor.x, top: c.cursor.y, transform: "translate(-2px,-2px)" }}
          >
            <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: c.color }} />
            <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">{c.displayName}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}
