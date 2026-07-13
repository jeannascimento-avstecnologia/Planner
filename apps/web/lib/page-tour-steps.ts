import type { DriveStep } from "driver.js";
import { HELP_CATEGORIES } from "@/lib/help-content";
import { helpSectionToTourDescription, tourSelector, type PageTourStepDef } from "@/lib/help-tour-copy";

export type PageTourId =
  | "home"
  | "projects"
  | "calendar"
  | "plan"
  | "workload"
  | "settings"
  | "help"
  | "board-kanban";

function findHelpSection(id: string) {
  for (const cat of HELP_CATEGORIES) {
    const section = cat.sections.find((s) => s.id === id);
    if (section) return section;
  }
  return undefined;
}

const homeHelp = findHelpSection("home");
const projectsHelp = findHelpSection("projects-hub");
const calendarHelp = findHelpSection("calendar");
const planHelp = findHelpSection("plan");
const workloadHelp = findHelpSection("workload");
const settingsHelp = findHelpSection("settings-hub");
const kanbanHelp = findHelpSection("kanban");

export const PAGE_TOUR_STEP_DEFS: Record<PageTourId, PageTourStepDef[]> = {
  home: [
    {
      id: "home-header",
      tourTarget: "home-header",
      title: "Seu painel de comando",
      description:
        homeHelp
          ? helpSectionToTourDescription(
              homeHelp,
              "Daqui voce enxerga o portifolio inteiro da organizacao ativa sem abrir um kanban.",
            )
          : "A Home reune projetos, prazos e alertas da organizacao ativa em um unico lugar.",
    },
    {
      id: "home-deadlines",
      tourTarget: "home-deadlines",
      title: "Prazos nos proximos 7 dias",
      description:
        "Chips coloridos mostram entregas iminentes; vermelho indica atraso. Clique em um chip para ir direto ao projeto ou abra o calendario completo.",
    },
    {
      id: "home-view-switcher",
      tourTarget: "home-view-switcher",
      title: "Grade ou lista",
      description:
        "Alterne a visualizacao conforme prefere comparar projetos — util quando ha muitos boards por departamento.",
    },
    {
      id: "home-projects",
      tourTarget: "home-projects",
      title: "Portifolio por organizacao",
      description:
        "Projetos agrupados por org e departamento. Um clique no tile abre o kanban; a engrenagem abre configuracoes do board.",
    },
    {
      id: "home-create-project",
      tourTarget: "home-create-project",
      title: "Novo projeto",
      description:
        "Crie um board informando organizacao, departamento e nome. O projeto entra na grade assim que for salvo.",
    },
  ],
  projects: [
    {
      id: "projects-header",
      tourTarget: "projects-header",
      title: "Hub de comparacao",
      description:
        projectsHelp
          ? helpSectionToTourDescription(
              projectsHelp,
              "Compare e filtre sem sair desta tela — ideal para priorizar antes de mergulhar no kanban.",
            )
          : "Filtre e compare projetos da organizacao ativa em um unico hub.",
    },
    {
      id: "projects-filters",
      tourTarget: "projects-filters",
      title: "Filtros precisos",
      description:
        "Organizacao, departamento, busca por nome, ordenacao e arquivados. Troque a org ativa aqui antes de analisar os tiles.",
    },
    {
      id: "projects-grid",
      tourTarget: "projects-grid",
      title: "Selecione um projeto",
      description:
        "Clique em um tile para abrir o painel lateral com estatisticas, participantes e proximas tarefas — sem navegar ao kanban.",
    },
    {
      id: "projects-detail",
      tourTarget: "projects-detail",
      title: "Painel lateral",
      description:
        "Abrir Projeto leva ao kanban; Participantes concentra convites e papeis do board. Use a engrenagem para configuracoes avancadas.",
    },
  ],
  calendar: [
    {
      id: "calendar-header",
      tourTarget: "calendar-header",
      title: "Calendario unificado",
      description:
        calendarHelp
          ? helpSectionToTourDescription(calendarHelp)
          : "Todos os prazos finais dos projetos que voce acessa, em uma grade mensal.",
    },
    {
      id: "calendar-ical",
      tourTarget: "calendar-ical",
      title: "Feed iCal",
      description:
        "Gere um link de sincronizacao para Google Calendar, Outlook ou outro app — prazos atualizam conforme voce reagenda no Agify.",
    },
    {
      id: "calendar-grid",
      tourTarget: "calendar-grid",
      title: "Grade e arrastar",
      description:
        "Arraste chips entre dias para reagendar; clique curto abre o card no board. Dias com +3 prazos mostram contador de overflow.",
    },
    {
      id: "calendar-list",
      tourTarget: "calendar-list",
      title: "Lista completa",
      description:
        "Visao tabular de todos os prazos com link ao projeto. Datas vencidas aparecem em destaque vermelho.",
    },
  ],
  plan: [
    {
      id: "plan-header",
      tourTarget: "plan-header",
      title: "Seu plano de 11 dias",
      description:
        planHelp
          ? helpSectionToTourDescription(
              planHelp,
              "Cinco dias passados, hoje e cinco futuros — aloque horas com precisao.",
            )
          : "Grade de alocacao pessoal com buckets de cards atrasados e nao agendados.",
    },
    {
      id: "plan-legend",
      tourTarget: "plan-legend",
      title: "Legenda de cores",
      description:
        "Ambar marca entrega estimada; vermelho, prazo final ou vencido. A barra de utilizacao mostra quando o dia passa de 80% ou 100% da capacidade.",
    },
    {
      id: "plan-toolbar",
      tourTarget: "plan-toolbar",
      title: "Filtros e fins de semana",
      description:
        "Restrinja por organizacao e projeto; inclua sabados e domingos quando planejar semanas completas.",
    },
    {
      id: "plan-sidebar",
      tourTarget: "plan-sidebar",
      title: "Buckets laterais",
      description:
        "Atrasados, Nao agendados e Sem estimativa alimentam a grade — arraste um card para um dia para agendar.",
    },
    {
      id: "plan-grid",
      tourTarget: "plan-grid",
      title: "Alocar e reordenar",
      description:
        "Digite horas na celula (0–24, passo 0,5); use o grip para reordenar dentro do projeto. Mova chips de horas entre dias quando precisar remanejar.",
    },
  ],
  workload: [
    {
      id: "workload-header",
      tourTarget: "workload-header",
      title: "Carga da equipe",
      description:
        workloadHelp
          ? helpSectionToTourDescription(workloadHelp)
          : "Visao gerencial de capacidade por membro — disponivel para gestores e admins.",
      requiresWorkload: true,
    },
    {
      id: "workload-mode",
      tourTarget: "workload-mode",
      title: "Semana ou 15 dias",
      description:
        "Alterne entre utilizacao semanal e heatmap quinzenal. A visao de 15 dias complementa o detalhe diario do Meu plano.",
      requiresWorkload: true,
    },
    {
      id: "workload-main",
      tourTarget: "workload-main",
      title: "Utilizacao e drilldown",
      description:
        "Barras verde, ambar e vermelho refletem % da capacidade. Clique no membro para ver cards alocados; edite capacidade semanal quando for gestor.",
      requiresWorkload: true,
    },
  ],
  settings: [
    {
      id: "settings-header",
      tourTarget: "settings-header",
      title: "Central de configuracao",
      description:
        settingsHelp
          ? helpSectionToTourDescription(settingsHelp)
          : "Atalhos para membros, convites, integracoes e conta — sempre no contexto da org ativa.",
    },
    {
      id: "settings-org-switcher",
      tourTarget: "settings-org-switcher",
      title: "Organizacao ativa",
      description:
        "Troque a org antes de editar membros ou integracoes. Dados e permissoes seguem a organizacao selecionada.",
    },
    {
      id: "settings-org-cards",
      tourTarget: "settings-org-cards",
      title: "Gestao da organizacao",
      description:
        "Membros, convites, dados gerais e minhas organizacoes. Cada card leva a uma area dedicada.",
    },
    {
      id: "settings-admin-cards",
      tourTarget: "settings-admin-cards",
      title: "Administracao",
      description:
        "Integracoes (Slack, Teams, Google), auditoria de eventos e permissoes por campo — visivel para admins da org.",
      requiresAdmin: true,
    },
  ],
  help: [
    {
      id: "help-index",
      tourTarget: "help-index",
      title: "Indice navegavel",
      description:
        "Atalhos para cada guia do centro de ajuda. Use o indice lateral em telas grandes para pular direto ao topico.",
    },
    {
      id: "help-categories",
      tourTarget: "help-categories",
      title: "Guias por area",
      description:
        "Cada secao expande passos detalhados, dicas e link para a pagina correspondente no app.",
    },
    {
      id: "help-tour-global",
      tourTarget: "help-tour-global",
      title: "Tours interativos",
      description:
        "Reabra o tour da sidebar ou o tour da pagina em que voce estiver. Ideal para treinar novos membros da equipe.",
    },
  ],
  "board-kanban": [
    {
      id: "board-header",
      tourTarget: "board-header",
      title: "Contexto do projeto",
      description:
        kanbanHelp
          ? helpSectionToTourDescription(
              kanbanHelp,
              "Breadcrumb e titulo confirmam o board aberto antes de editar cards.",
            )
          : "Quadro kanban do projeto com colunas, filtros e multiplas visoes.",
    },
    {
      id: "board-view-switcher",
      tourTarget: "board-view-switcher",
      title: "Multiplas visoes",
      description:
        "Kanban, Linha do tempo, Calendario e Tabela no mesmo projeto. Whiteboard e Dashboard ficam nos links do topo.",
    },
    {
      id: "board-filters",
      tourTarget: "board-filters",
      title: "Filtros avancados",
      description:
        "Busca por titulo, estagios, prazos relativos, responsavel e marcadores — combine filtros para focar no que importa agora.",
    },
    {
      id: "board-kanban",
      tourTarget: "board-kanban",
      title: "Colunas e cards",
      description:
        "Arraste cards entre colunas para mudar status (Editor+). Clique para abrir o drawer com prazos, responsavel e plano de trabalho.",
    },
    {
      id: "board-actions",
      tourTarget: "board-actions",
      title: "Acoes do board",
      description:
        "Convide integrantes, gerencie acesso, automacoes e links para dashboard. Agrupe por responsavel para swimlanes.",
    },
  ],
};

export type PageTourContext = {
  showWorkload: boolean;
  showAdminSettings: boolean;
};

export function buildPageDriveSteps(tourId: PageTourId, ctx: PageTourContext): DriveStep[] {
  const defs = PAGE_TOUR_STEP_DEFS[tourId].filter((step) => {
    if (step.requiresWorkload && !ctx.showWorkload) return false;
    if (step.requiresAdmin && !ctx.showAdminSettings) return false;
    return true;
  });

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

export const PAGE_TOUR_LABELS: Record<PageTourId, string> = {
  home: "Home",
  projects: "Projetos",
  calendar: "Calendario",
  plan: "Meu plano",
  workload: "Carga",
  settings: "Configuracoes",
  help: "Ajuda",
  "board-kanban": "Kanban do projeto",
};
