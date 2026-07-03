"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useGuardedNavigate } from "@/lib/client-url-state";
import { getRecentBoards, pruneRecentBoards, type RecentBoard } from "@/lib/recent-boards";

type Props = { collapsed?: boolean; accessibleBoardIds: string[] };

export function RecentProjects({ collapsed, accessibleBoardIds }: Props) {
  const pathname = usePathname();
  const { onNavigateClick } = useGuardedNavigate();
  const [items, setItems] = useState<RecentBoard[]>([]);

  useEffect(() => {
    pruneRecentBoards(accessibleBoardIds);
  }, [accessibleBoardIds]);

  useEffect(() => {
    const refresh = () => setItems(getRecentBoards());
    refresh();
    window.addEventListener("ngp:recent-boards", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ngp:recent-boards", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname]);

  if (collapsed || items.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-white/10 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Recentes</p>
      <ul className="space-y-0.5">
        {items.map((b) => {
          const href = `/boards/${b.id}`;
          return (
          <li key={b.id}>
            <Link
              href={href}
              prefetch={false}
              onClick={(e) => onNavigateClick(e, href)}
              className="block truncate rounded px-2 py-1 text-sm text-white/90 hover:bg-white/10 hover:text-white"
            >
              {b.name}
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
