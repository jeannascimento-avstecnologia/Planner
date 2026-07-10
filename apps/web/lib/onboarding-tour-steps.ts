import type { DriveStep } from "driver.js";

export type OnboardingTourStepDef = {
  id: string;
  tourTarget?: string;
  title: string;
  description: string;
  requiresWorkload?: boolean;
};

/** Definicoes estaticas — copy resumida de help-content.ts */
export const ONBOARDING_TOUR_STEP_DEFS: OnboardingTourStepDef[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Agify",
    description:
      "Este tour rapido mostra onde encontrar cada area do app. Use Proximo para avancar ou Fechar para pular — voce pode rever em Ajuda.",
  },
  {
    id: "home",
    tourTarget: "nav-boards",
    title: "Home",
    description:
      "Painel inicial com grade de projetos, mini-calendario dos proximos 7 dias e lista de prazos. Clique em um projeto para abrir o kanban.",
  },
  {
    id: "projects",
    tourTarget: "nav-projects",
    title: "Projetos",
    description:
      "Hub para comparar e filtrar projetos sem entrar no kanban. Selecione um tile para ver detalhes no painel lateral.",
  },
  {
    id: "calendar",
    tourTarget: "nav-calendar",
    title: "Calendario",
    description:
      "Visao unificada de prazos e entregas de todos os projetos aos quais voce tem acesso.",
  },
  {
    id: "plan",
    tourTarget: "nav-plan",
    title: "Meu plano",
    description:
      "Organize o trabalho do dia: cards atribuidos a voce, ordenados por prioridade e prazo.",
  },
  {
    id: "workload",
    tourTarget: "nav-workload",
    title: "Carga",
    description:
      "Visao de carga da equipe por periodo — disponivel para gestores e admins da organizacao.",
    requiresWorkload: true,
  },
  {
    id: "help",
    tourTarget: "nav-help",
    title: "Ajuda",
    description:
      "Centro de ajuda com guias detalhados. Use Ver tour guiado para rever este passo a passo quando quiser.",
  },
  {
    id: "settings",
    tourTarget: "nav-settings",
    title: "Configuracoes",
    description:
      "Gerencie membros, convites, integracoes e permissoes da organizacao ativa.",
  },
  {
    id: "finish",
    title: "Pronto para comecar",
    description:
      "Explore os projetos na Home ou abra Ajuda para aprofundar. Bom trabalho!",
  },
];

export function tourSelector(target: string): string {
  return `[data-tour="${target}"]`;
}

export function buildOnboardingDriveSteps(showWorkload: boolean): DriveStep[] {
  const defs = ONBOARDING_TOUR_STEP_DEFS.filter(
    (step) => !step.requiresWorkload || showWorkload,
  );

  return defs.map((step) => {
    const popover = {
      title: step.title,
      description: step.description,
      popoverClass: "agify-tour-popover",
    };

    if (!step.tourTarget) {
      return { popover };
    }

    return {
      element: tourSelector(step.tourTarget),
      popover,
    };
  });
}
