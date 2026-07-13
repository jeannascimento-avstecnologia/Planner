"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";

type ProjectsPageTourPrepProps = {
  firstBoardId: string | null;
};

/** Seleciona o primeiro projeto para o passo do painel lateral no tour. */
export function ProjectsPageTourPrep({ firstBoardId }: ProjectsPageTourPrepProps) {
  const { registerTourPrep } = useOnboardingTour();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    registerTourPrep("projects", () => {
      if (!firstBoardId) return;
      if (searchParams.get("board")) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("board", firstBoardId);
      router.replace(`/projects?${params.toString()}`);
    });
  }, [firstBoardId, registerTourPrep, router, searchParams]);

  return null;
}

/** Garante visao kanban padrao no tour do board. */
export function BoardKanbanTourPrep() {
  const { registerTourPrep } = useOnboardingTour();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    registerTourPrep("board-kanban", () => {
      const view = searchParams.get("view");
      if (!view || view === "kanban") return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [pathname, registerTourPrep, router, searchParams]);

  return null;
}
