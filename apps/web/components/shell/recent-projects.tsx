"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BoardIcon } from "@/components/board/board-icon";
import { NavLink } from "@/components/shell/nav-link";
import {
  enrichRecentBoards,
  getRecentBoards,
  pruneRecentBoards,
  type BoardMeta,
  type RecentBoard,
} from "@/lib/recent-boards";

type Props = {
  collapsed?: boolean;
  accessibleBoardIds: string[];
  boardMetaById: Record<string, BoardMeta>;
};

export function RecentProjects({ collapsed, accessibleBoardIds, boardMetaById }: Props) {
  const pathname = usePathname();
  const [items, setItems] = useState<RecentBoard[]>([]);

  useEffect(() => {
    pruneRecentBoards(accessibleBoardIds);
  }, [accessibleBoardIds]);

  useEffect(() => {
    const refresh = () => setItems(enrichRecentBoards(getRecentBoards(), boardMetaById));
    refresh();
    window.addEventListener("ngp:recent-boards", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ngp:recent-boards", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname, boardMetaById]);

  const visible = useMemo(
    () => items.filter((b) => accessibleBoardIds.includes(b.id)),
    [items, accessibleBoardIds],
  );

  if (visible.length === 0) return null;

  if (collapsed) {
    return (
      <div className="mt-3 space-y-1 border-t border-white/10 pt-3" data-testid="recent-projects-collapsed">
        {visible.map((b) => {
          const href = `/boards/${b.id}`;
          return (
            <NavLink
              key={b.id}
              href={href}
              title={b.name}
              data-testid={`recent-board-icon-${b.id}`}
              className="flex justify-center rounded-lg px-2 py-2 transition hover:bg-white/10"
            >
              <BoardIcon icon={b.icon ?? null} color={b.color ?? null} size="sm" />
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1 border-t border-white/10 pt-3" data-testid="recent-projects-expanded">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Recentes</p>
      <ul className="space-y-0.5">
        {visible.map((b) => {
          const href = `/boards/${b.id}`;
          return (
            <li key={b.id}>
              <NavLink
                href={href}
                className="flex items-center gap-2 truncate rounded px-2 py-1 text-sm text-white/90 hover:bg-white/10 hover:text-white"
              >
                <BoardIcon icon={b.icon ?? null} color={b.color ?? null} size="sm" />
                <span className="truncate">{b.name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
