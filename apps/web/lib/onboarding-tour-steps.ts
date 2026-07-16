import type { DriveStep } from "driver.js";

export type OnboardingTourStepDef = {
  id: string;
  tourTarget?: string;
  title: string;
  description: string;
  requiresWorkload?: boolean;
};

/** Tour global da sidebar — tom premium, orientacao espacial. */
export const ONBOARDING_TOUR_STEP_DEFS: OnboardingTourStepDef[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Agify",
    description: "Planeje e acompanhe projetos pela barra lateral — menos de um minuto.",
  },
  {
    id: "home",
    tourTarget: "nav-boards",
    title: "Home — visao geral",
    description: "Projetos, prazos dos proximos 7 dias e atrasos. Clique no cartao para abrir o quadro.",
  },
  {
    id: "projects",
    tourTarget: "nav-projects",
    title: "Projetos — comparar",
    description: "Filtre e inspecione projetos no painel lateral antes de entrar no quadro.",
  },
  {
    id: "calendar",
    tourTarget: "nav-calendar",
    title: "Calendario — prazos",
    description: "Prazos da org na grade. Arraste para reagendar; exporte para Google Calendar ou Outlook.",
  },
  {
    id: "plan",
    tourTarget: "nav-plan",
    title: "Meu plano — foco diario",
    description: "11 dias de alocacao: arraste cards, defina horas e veja utilizacao.",
  },
  {
    id: "workload",
    tourTarget: "nav-workload",
    title: "Carga — equipe",
    description: "Para gestores: utilizacao por membro, capacidade e detalhes das alocacoes.",
    requiresWorkload: true,
  },
  {
    id: "help",
    tourTarget: "nav-help",
    title: "Ajuda",
    description: "Guias por area e tours por pagina. Reabra quando precisar.",
  },
  {
    id: "settings",
    tourTarget: "nav-settings",
    title: "Configuracoes",
    description: "Membros, convites, Slack/Teams/Google e permissoes da org ativa.",
  },
  {
    id: "finish",
    title: "Pronto",
    description: "Abra a Home e escolha um projeto — cada pagina tem tour na primeira visita.",
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
