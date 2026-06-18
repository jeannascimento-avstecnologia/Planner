"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRecentBoards, type RecentBoard } from "@/lib/recent-boards";

type Props = { collapsed?: boolean };

export function RecentProjects({ collapsed }: Props) {
  const pathname = usePathname();
  const [items, setItems] = useState<RecentBoard[]>([]);

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
    <div className="space-y-1 border-t border-aurora-sidebar-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-aurora-sidebar-muted">Recentes</p>
      <ul className="space-y-0.5">
        {items.map((b) => (
          <li key={b.id}>
            <Link
              href={`/boards/${b.id}`}
              className="block truncate rounded px-2 py-1 text-sm text-aurora-sidebar-fg hover:bg-white/10"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
