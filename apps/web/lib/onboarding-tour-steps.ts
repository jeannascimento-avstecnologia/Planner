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
    description:
      "Planeje, execute e acompanhe projetos com clareza. Este passeio mostra onde cada area vive na barra lateral — leva menos de um minuto.",
  },
  {
    id: "home",
    tourTarget: "nav-boards",
    title: "Home — visao do portifolio",
    description:
      "Sua base apos o login: projetos por org, prazos dos proximos 7 dias e alertas de atraso. Um clique no tile abre o kanban.",
  },
  {
    id: "projects",
    tourTarget: "nav-projects",
    title: "Projetos — comparar sem entrar",
    description:
      "Filtre, ordene e inspecione boards no painel lateral antes de mergulhar no trabalho. Ideal para priorizar a semana.",
  },
  {
    id: "calendar",
    tourTarget: "nav-calendar",
    title: "Calendario — prazos unificados",
    description:
      "Todos os due dates da organizacao em uma grade. Arraste para reagendar e exporte feed iCal para seu calendario externo.",
  },
  {
    id: "plan",
    tourTarget: "nav-plan",
    title: "Meu plano — seu foco diario",
    description:
      "Alocacao pessoal em 11 dias: arraste cards, distribua horas e acompanhe utilizacao. Seu compromisso com o que importa hoje.",
  },
  {
    id: "workload",
    tourTarget: "nav-workload",
    title: "Carga — capacidade da equipe",
    description:
      "Para gestores: utilizacao por membro, capacidade editavel e drilldown de alocacoes. Evite sobrecarga antes que vire gargalo.",
    requiresWorkload: true,
  },
  {
    id: "help",
    tourTarget: "nav-help",
    title: "Ajuda — quando precisar de detalhe",
    description:
      "Guias por area e tours interativos por pagina. Volte aqui para treinar a equipe ou rever um fluxo especifico.",
  },
  {
    id: "settings",
    tourTarget: "nav-settings",
    title: "Configuracoes — org e conta",
    description:
      "Membros, convites, integracoes Slack/Teams/Google, auditoria e permissoes por campo — tudo no contexto da org ativa.",
  },
  {
    id: "finish",
    title: "Pronto para trabalhar",
    description:
      "Abra a Home e escolha um projeto — cada pagina tem um tour proprio na primeira visita. Bom trabalho.",
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
