"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getRouteTitle } from "@/lib/route-titles";
import { parseBoardViewMode, type BoardViewMode } from "@/components/board/types";

const VIEW_LABELS: Record<BoardViewMode, string> = {
  kanban: "Kanban",
  tree: "Arvore",
  timeline: "Linha do tempo",
  calendar: "Calendario",
  table: "Tabela",
};

function TopbarTitleInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isBoardDetail = /^\/boards\/[^/]+$/.test(pathname);
  const boardMode = isBoardDetail ? parseBoardViewMode(searchParams.get("view")) : null;
  const boardLabel = boardMode ? VIEW_LABELS[boardMode] : null;

  if (isBoardDetail && boardMode && boardLabel) {
    return (
      <span
        data-testid="board-view-topbar-title"
        className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm"
      >
        {boardLabel}
      </span>
    );
  }

  if (pathname === "/boards") {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Home
      </span>
    );
  }

  if (pathname === "/projects") {
    const layout = searchParams.get("layout");
    const label = layout === "list" ? "Lista" : "Projetos";
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        {label}
      </span>
    );
  }

  if (pathname === "/calendar") {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Calendario
      </span>
    );
  }

  if (pathname === "/plan") {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Meu plano
      </span>
    );
  }

  if (pathname === "/workload") {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Carga
      </span>
    );
  }

  if (pathname === "/settings") {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Configuracoes
      </span>
    );
  }

  if (pathname.startsWith("/settings/organizations")) {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Organizacoes
      </span>
    );
  }

  if (pathname.startsWith("/settings/organization")) {
    return (
      <span className="inline-flex max-w-[38vw] items-center truncate rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 sm:max-w-none sm:px-3 md:text-sm">
        Organizacao
      </span>
    );
  }

  const title = getRouteTitle(pathname);
  if (!title) return null;
  return <h1 className="truncate text-sm font-semibold text-white md:text-base">{title}</h1>;
}

export function TopbarTitle() {
  return (
    <Suspense fallback={<span className="h-5 w-20 animate-pulse rounded bg-white/20" />}>
      <TopbarTitleInner />
    </Suspense>
  );
}
