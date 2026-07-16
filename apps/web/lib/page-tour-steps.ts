import type { DriveStep } from "driver.js";
import { tourSelector, type PageTourStepDef } from "@/lib/help-tour-copy";

export type PageTourId =
  | "home"
  | "projects"
  | "calendar"
  | "plan"
  | "workload"
  | "settings"
  | "help"
  | "board-kanban";

export const PAGE_TOUR_STEP_DEFS: Record<PageTourId, PageTourStepDef[]> = {
  home: [
    {
      id: "home-header",
      tourTarget: "home-header",
      title: "Painel da org",
      description: "Visao geral, prazos e alertas da organizacao ativa em um so lugar.",
    },
    {
      id: "home-deadlines",
      tourTarget: "home-deadlines",
      title: "Proximos 7 dias",
      description: "Prazos dos proximos dias; vermelho = atrasado. Clique para ir ao projeto.",
    },
    {
      id: "home-view-switcher",
      tourTarget: "home-view-switcher",
      title: "Grade ou lista",
      description: "Alterne a visualizacao conforme preferir comparar projetos.",
    },
    {
      id: "home-projects",
      tourTarget: "home-projects",
      title: "Seus projetos",
      description: "Agrupados por org e departamento. O cartao abre o quadro; a engrenagem, as configuracoes.",
    },
    {
      id: "home-create-project",
      tourTarget: "home-create-project",
      title: "Novo projeto",
      description: "Informe org, departamento e nome — o projeto entra na grade ao salvar.",
    },
  ],
  projects: [
    {
      id: "projects-header",
      tourTarget: "projects-header",
      title: "Hub de projetos",
      description: "Compare e filtre sem entrar no quadro.",
    },
    {
      id: "projects-filters",
      tourTarget: "projects-filters",
      title: "Filtros",
      description: "Org, departamento, busca, ordenacao e arquivados.",
    },
    {
      id: "projects-grid",
      tourTarget: "projects-grid",
      title: "Selecionar projeto",
      description: "Clique no cartao para abrir o painel lateral — sem entrar no quadro.",
    },
    {
      id: "projects-detail",
      tourTarget: "projects-detail",
      title: "Painel lateral",
      description: "Abrir Projeto vai ao quadro; Participantes gerencia convites e papeis.",
    },
  ],
  calendar: [
    {
      id: "calendar-header",
      tourTarget: "calendar-header",
      title: "Calendario unificado",
      description: "Todos os prazos finais dos projetos que voce acessa.",
    },
    {
      id: "calendar-ical",
      tourTarget: "calendar-ical",
      title: "Calendario externo",
      description: "Link para Google Calendar, Outlook e outros apps.",
    },
    {
      id: "calendar-grid",
      tourTarget: "calendar-grid",
      title: "Grade",
      description: "Arraste os prazos para reagendar; clique curto abre o card.",
    },
    {
      id: "calendar-list",
      tourTarget: "calendar-list",
      title: "Lista",
      description: "Tabela de prazos com link ao projeto; vencidos em vermelho.",
    },
  ],
  plan: [
    {
      id: "plan-header",
      tourTarget: "plan-header",
      title: "Plano de 11 dias",
      description: "5 dias passados, hoje e 5 futuros — aloque horas nos seus cards.",
    },
    {
      id: "plan-legend",
      tourTarget: "plan-legend",
      title: "Legenda",
      description: "Ambar = entrega estimada; vermelho = prazo final. Barra mostra utilizacao.",
    },
    {
      id: "plan-toolbar",
      tourTarget: "plan-toolbar",
      title: "Filtros",
      description: "Org e projeto; inclua fins de semana se precisar.",
    },
    {
      id: "plan-sidebar",
      tourTarget: "plan-sidebar",
      title: "Listas laterais",
      description: "Atrasados, Nao agendados e Sem estimativa — arraste para um dia.",
    },
    {
      id: "plan-grid",
      tourTarget: "plan-grid",
      title: "Alocar",
      description: "Digite horas (0–24); o icone de arrastar reordena; mova blocos entre dias.",
    },
  ],
  workload: [
    {
      id: "workload-header",
      tourTarget: "workload-header",
      title: "Carga da equipe",
      description: "Capacidade por membro — gestores e admins.",
      requiresWorkload: true,
    },
    {
      id: "workload-mode",
      tourTarget: "workload-mode",
      title: "Semana ou 15 dias",
      description: "Utilizacao semanal ou mapa de cores dos proximos 15 dias.",
      requiresWorkload: true,
    },
    {
      id: "workload-main",
      tourTarget: "workload-main",
      title: "Utilizacao",
      description: "Barras por capacidade; clique no membro para ver detalhes.",
      requiresWorkload: true,
    },
  ],
  settings: [
    {
      id: "settings-header",
      tourTarget: "settings-header",
      title: "Configuracoes",
      description: "Atalhos de membros, convites, integracoes e conta.",
    },
    {
      id: "settings-org-switcher",
      tourTarget: "settings-org-switcher",
      title: "Org ativa",
      description: "Troque a org antes de editar membros ou integracoes.",
    },
    {
      id: "settings-org-cards",
      tourTarget: "settings-org-cards",
      title: "Organizacao",
      description: "Membros, convites, dados gerais e minhas orgs.",
    },
    {
      id: "settings-admin-cards",
      tourTarget: "settings-admin-cards",
      title: "Administracao",
      description: "Slack/Teams/Google, auditoria e permissoes por campo.",
      requiresAdmin: true,
    },
  ],
  help: [
    {
      id: "help-index",
      tourTarget: "help-index",
      title: "Indice",
      description: "Atalhos para cada guia do centro de ajuda.",
    },
    {
      id: "help-categories",
      tourTarget: "help-categories",
      title: "Guias",
      description: "Passos, dicas e link para a pagina no app.",
    },
    {
      id: "help-tour-global",
      tourTarget: "help-tour-global",
      title: "Tours",
      description: "Reabra o tour da sidebar ou da pagina atual.",
    },
  ],
  "board-kanban": [
    {
      id: "board-header",
      tourTarget: "board-header",
      title: "Projeto aberto",
      description: "O caminho de volta e o nome do projeto no topo confirmam onde voce esta antes de editar.",
    },
    {
      id: "board-view-switcher",
      tourTarget: "board-view-switcher",
      title: "Visoes",
      description: "Kanban, Linha do tempo, Calendario, Tabela e Arvore. Whiteboard e Dashboard no topo.",
    },
    {
      id: "board-tree-guide",
      tourTarget: "board-view-switcher",
      title: "Arvore",
      description:
        "Organograma: ligue pelos pontos de conexao; Adicionar card Filho cria filhos; role a roda para zoom; botao do meio ou direito arrasta a tela; Organize alinha o layout. Os cards valem nas outras visoes.",
    },
    {
      id: "board-filters",
      tourTarget: "board-filters",
      title: "Filtros",
      description: "Titulo, estagios, prazos, responsavel e marcadores.",
    },
    {
      id: "board-kanban",
      tourTarget: "board-kanban",
      title: "Colunas e cards",
      description: "Arraste entre colunas (papel Editor ou acima). Clique abre o painel do card.",
    },
    {
      id: "board-actions",
      tourTarget: "board-actions",
      title: "Acoes",
      description: "Convites, acesso, automacoes e faixas por responsavel (Agrupar por responsavel).",
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
