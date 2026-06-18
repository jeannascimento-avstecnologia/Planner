"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getRouteTitle } from "@/lib/route-titles";
import { parseBoardViewMode } from "@/components/board/types";

const VIEW_LABELS: Record<string, string> = {
  kanban: "Kanban",
  timeline: "Linha do tempo",
  calendar: "Calendario",
  table: "Tabela",
};

function TopbarTitleInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isBoardDetail = /^\/boards\/[^/]+$/.test(pathname);
  if (isBoardDetail) {
    const mode = parseBoardViewMode(searchParams.get("view"));
    return (
      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-aurora-topbar-bg md:text-sm">
        {VIEW_LABELS[mode]}
      </span>
    );
  }

  if (pathname === "/boards") {
    const layout = searchParams.get("layout");
    const label = layout === "list" ? "Lista" : "Projetos";
    return (
      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-aurora-topbar-bg md:text-sm">
        {label}
      </span>
    );
  }

  if (pathname === "/calendar") {
    return (
      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-aurora-topbar-bg md:text-sm">
        Calendario
      </span>
    );
  }

  const title = getRouteTitle(pathname);
  return <h1 className="truncate text-sm font-semibold text-white md:text-base">{title}</h1>;
}

export function TopbarTitle() {
  return (
    <Suspense fallback={<span className="h-5 w-20 animate-pulse rounded bg-white/20" />}>
      <TopbarTitleInner />
    </Suspense>
  );
}
