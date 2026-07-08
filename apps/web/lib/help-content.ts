/** Copy estatico do Centro de Ajuda — espelha navegacao e UI real do app. */

export type HelpBadge = "Admin" | "Gestor";

export type HelpSection = {
  id: string;
  title: string;
  href?: string;
  summary: string;
  steps: string[];
  tips?: string[];
  badge?: HelpBadge;
};

export type HelpCategory = {
  id: string;
  title: string;
  sections: HelpSection[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "projects",
    title: "Inicio e projetos",
    sections: [
      {
        id: "home",
        title: "Home",
        href: "/boards",
        summary:
          "Painel inicial apos o login: grade de projetos agrupados por organizacao e departamento, mini-calendario dos proximos 7 dias e lista de prazos iminentes.",
        steps: [
          "Use o toggle Grade / Lista no topo da lista de projetos para alternar a visualizacao.",
          "Filtre por departamento com os chips (Todos + nomes dos departamentos) quando houver mais de um.",
          "Clique em um tile de projeto para abrir o kanban em /boards/{id}.",
          "Na secao Proximos 7 dias, clique em um chip de prazo para ir ao projeto; use Ver calendario para abrir /calendar.",
          "Na secao Prazos, cards com faixa vermelha estao atrasados; faixa colorida indica prazo dentro do prazo.",
          "Clique na engrenagem Configuracoes do projeto no tile para editar nome, cor, departamento, arquivar ou gerenciar membros (nao disponivel para Visualizador).",
          "Use Novo projeto para criar board informando Organizacao, Departamento, Nome e Descricao (opcional).",
        ],
        tips: [
          "Organizacao ativa aparece com badge Org ativa na secao correspondente.",
          "Grupos de departamento sem acesso exibem badge Sem acesso.",
        ],
      },
      {
        id: "projects-hub",
        title: "Projetos",
        href: "/projects",
        summary:
          "Hub de comparacao e gestao: filtre projetos sem entrar no kanban, selecione um tile para ver detalhes no painel lateral e gerencie participantes.",
        steps: [
          "No painel Filtros, escolha Organizacao (troca a org ativa e recarrega a pagina), Departamento (Todos / Geral / nome do dept), Ordenar por (Nome A-Z ou Mais recentes) e Buscar por nome do projeto.",
          "Marque Incluir arquivados para ver projetos arquivados; use Limpar filtros (N) para resetar.",
          "Clique em um tile para seleciona-lo (?board= na URL) — o painel lateral abre sem navegar ao kanban.",
          "No painel: Abrir Projeto vai ao kanban; Trocar projeto limpa a selecao.",
          "Veja estatisticas (cards abertos), badge Tiflux se integrado, lista Participantes e Proximas tarefas com datas formatadas.",
          "Use a engrenagem no painel para abrir Configuracoes do projeto (mesmo modal da Home).",
        ],
        tips: [
          "Convites e papeis de board ficam em Participantes — apenas Gerente do projeto ou admin da org podem convidar.",
          "O subtitulo do header mostra org e departamento ativos (ex.: Minha Org · Marketing).",
        ],
      },
      {
        id: "kanban",
        title: "Kanban do projeto",
        href: "/boards",
        summary:
          "Quadro do projeto com colunas arrastaveis, multiplas visoes, filtros avancados e drawer completo de edicao do card.",
        steps: [
          "Alterne a visao pelo seletor: Kanban (padrao), Linha do tempo, Calendario ou Tabela (?view= na URL).",
          "Whiteboard e Dashboard sao links separados no topo (nao aparecem no seletor de visoes).",
          "No Kanban, marque Agrupar por responsavel para swimlanes (Sem responsavel + nomes dos membros).",
          "Arraste cards entre colunas para mudar status — exige papel Editor no board ou admin da org (Visualizador nao arrasta).",
          "Clique no card para abrir o drawer: Titulo, Descricao, Inicio, Entrega estimada, Prazo final, Horas estimadas, Prioridade, Responsavel, Marcadores.",
          "Se voce e responsavel, o bloco Plano de trabalho mostra link Abrir em Meu plano.",
          "Use a barra de filtros: Buscar por titulo, Estagios, prazos (3d/5d/10d/30d ou Dia exato), Responsavel, Marcador e Estagio.",
          "Automacoes (topo): org admin ou Editor. Gerenciar acesso e Convidar integrante: Gerente ou admin da org.",
        ],
        tips: [
          "Papeis do board: Visualizar (so leitura), Editor (arrasta e edita cards), Gerente (membros e convites).",
          "Prazo final vencido aparece destacado no drawer; Entrega estimada e campo de planejamento opcional.",
        ],
      },
      {
        id: "dashboard",
        title: "Dashboard do projeto",
        summary:
          "Metricas de fluxo do projeto: WIP por coluna, throughput semanal, lead time medio e tabela de gargalos por tempo medio em cada coluna.",
        steps: [
          "Acesse pelo link Dashboard no topo do board ou /boards/{id}/dashboard.",
          "CFD (WIP atual por coluna): grafico de area com quantidade de cards por coluna.",
          "Throughput (conclusoes/semana): barras verdes com cards concluidos por semana.",
          "Lead time medio: horas medias e numero de amostras consideradas.",
          "Gargalos: tabela Coluna | Horas medias | Amostras — identifique onde cards ficam parados mais tempo.",
          "Use Voltar ao projeto para retornar ao kanban.",
        ],
        tips: [
          "Qualquer membro com acesso ao board pode ver o dashboard; nao exige papel especial.",
          "Gargalos vazio (Sem dados de cycle time ainda) indica poucos movimentos registrados no historico.",
        ],
      },
    ],
  },
  {
    id: "planning",
    title: "Planejamento",
    sections: [
      {
        id: "calendar",
        title: "Calendario de prazos",
        href: "/calendar",
        summary:
          "Grade mensal com todos os prazos finais (due_date) da organizacao. Arraste chips entre dias com confirmacao, clique no dia para vincular ou criar prazo, e exporte feed iCal.",
        steps: [
          "Navegue com Mes anterior / Proximo mes (setas no topo).",
          "Chips coloridos = cor do projeto; chips vermelhos = prazo vencido. Maximo 3 chips visiveis por dia (+N para overflow).",
          "Arraste um chip para outro dia — aparece barra Mover {titulo} para {data}? com Cancelar e Confirmar.",
          "Clique curto no chip (sem arrastar) abre o card no board (?cardId=).",
          "Clique em dia vazio ou no + abre modal Agenda — {data} com abas Vincular existente (Buscar card...) e Criar prazo (Titulo, projeto, coluna).",
          "Use Gerar link iCal no header para obter URL de sincronizacao com Google Calendar, Outlook etc. (token por organizacao).",
          "Secao Lista abaixo da grade mostra todos os prazos com link ao projeto; datas atrasadas em vermelho.",
        ],
        tips: [
          "Enquanto arrasta, o dia alvo mostra Soltar em {data}.",
          "Toast Prazo reagendado confirma sucesso; erros aparecem na barra de confirmacao.",
        ],
      },
      {
        id: "plan",
        title: "Meu plano de trabalho",
        href: "/plan",
        summary:
          "Grade de 11 dias (5 anteriores + hoje + 5 futuros) para alocar horas nos seus cards. Sidebar com buckets Atrasados, Nao agendados e Sem estimativa; DnD para agendar e reordenar.",
        steps: [
          "Filtre por Organizacao (Todas ou uma especifica) e Projeto (Todos ou um board).",
          "Marque Exibir sabados e domingos (?weekends=1) para incluir fins de semana na grade.",
          "Arraste cards da sidebar (Atrasados / Nao agendados / Sem estimativa) para uma coluna de dia — isso agenda o card naquele dia.",
          "Clique em celula de horas para digitar alocacao (0–24, passo 0.5); coluna Σ mostra total da linha.",
          "Arraste o icone grip (GripVertical) na linha para reordenar cards dentro do mesmo projeto.",
          "Arraste chip de horas ja alocado para outro dia para mover a alocacao (bloqueado se destino ja tiver horas).",
          "Botao X na linha remove o card do plano de 11 dias (confirma e apaga horas do periodo).",
          "Linha Utilizacao mostra % diario com barra verde (<80%), ambar (80–100%) ou vermelha (>100%).",
          "Navegue periodos com setas; botao Hoje volta a janela atual. Link Ver carga 15d abre /workload?mode=15d.",
        ],
        tips: [
          "Coluna ambar = dia da Entrega estimada (target_date); vermelho = Prazo final (due_date); vermelho claro = dias apos vencimento.",
          "Legenda abaixo do titulo explica todas as cores (Hoje, Entrega estimada, Prazo final, Prazo vencido, utilizacao).",
          "Exportar p/ Teams (header) exige integracao Microsoft configurada em Configuracoes > Integracoes.",
        ],
      },
      {
        id: "workload",
        title: "Carga de trabalho",
        href: "/workload",
        summary:
          "Visao gerencial da capacidade da equipe: utilizacao por membro na semana ou heatmap de 15 dias. Apenas owner, admin ou manager da org.",
        badge: "Gestor",
        steps: [
          "Toggle Semana (?week=) ou 15 dias (?mode=15d) no topo.",
          "Visao Semana: tabela Membro | Utilizacao (barra) | Horas | Capacidade | Cards.",
          "Verde <80%, ambar 80–100%, vermelho >100% de utilizacao.",
          "Owner/manager podem editar Capacidade (1–168h) clicando no valor e confirmando com Enter/blur.",
          "Clique no nome do membro para abrir drilldown: cards alocados, horas, datas e link ao plano.",
          "Secao Sem data planejada lista cards sem alocacao no periodo.",
          "Visao 15 dias: heatmap diario por membro; edite alocacoes no Meu plano (nao diretamente aqui).",
        ],
        tips: [
          "Badge abaixo do titulo mostra org ativa, seu papel e departamentos.",
          "Membros comuns sao redirecionados para /boards — link Carga so aparece na sidebar para gestores.",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Configuracoes",
    sections: [
      {
        id: "settings-hub",
        title: "Hub de configuracoes",
        href: "/settings",
        summary:
          "Central com cards de atalho: Membros, Convites, Dados da organizacao, Integracoes, Auditoria e Permissoes. Menu lateral agrupa Visao geral, Organizacao, Administracao e Conta.",
        steps: [
          "Troque a organizacao ativa no seletor do topo antes de editar dados da org.",
          "Aba Inicio (/settings): visao geral com cards clicaveis para cada area.",
          "Secao Organizacao: Membros, Convites, Geral.",
          "Secao Administracao (owner/admin): Integracoes, Auditoria, Permissoes.",
          "Secao Conta: Minhas organizacoes, Meu perfil (/profile), Mudar senha (/profile/password).",
        ],
        tips: ["Tabs de Administracao ficam ocultas para membros comuns da organizacao."],
      },
      {
        id: "members",
        title: "Membros da organizacao",
        href: "/settings/organization",
        summary:
          "Tabela de membros com papeis editaveis: Visualizador, Gerente, Administrador e Proprietario. Owner e manager podem alterar papeis e remover membros.",
        steps: [
          "Localize o membro na tabela e altere o papel no select.",
          "Proprietario: controle total; so pode haver regras especiais com multi-owner habilitado.",
          "Administrador: acesso a integracoes, auditoria e permissoes de campo.",
          "Gerente: convites, membros e visao de carga.",
          "Visualizador: leitura geral, sem gestao.",
        ],
        badge: "Admin",
      },
      {
        id: "invites",
        title: "Convites",
        href: "/settings/organization/invites",
        summary:
          "Formulario para convidar por e-mail com papel inicial. Tabela Convites pendentes mostra e-mail, papel e data de expiracao.",
        steps: [
          "Preencha e-mail e escolha papel (Visualizador, Gerente, Administrador ou Proprietario).",
          "Envie o convite — aparece na tabela Convites pendentes.",
          "Acompanhe expiracao e reenvie se necessario.",
        ],
        tips: ["Apenas proprietario ou gerente pode enviar convites."],
        badge: "Admin",
      },
      {
        id: "org-general",
        title: "Geral da organizacao",
        href: "/settings/organization/settings",
        summary:
          "Logo, nome legal, CNPJ, slug e departamentos. Owner pode transferir propriedade, habilitar multi-owner ou excluir a org; demais membros veem Sair da organizacao.",
        steps: [
          "Faca upload do logo da organizacao.",
          "Edite Dados da organizacao: nome de exibicao, razao social, CNPJ e slug.",
          "Configure departamentos para segmentar projetos e filtros.",
          "Owner: opcoes avancadas de transferencia e exclusao da org.",
        ],
        badge: "Admin",
      },
    ],
  },
  {
    id: "admin",
    title: "Administracao",
    sections: [
      {
        id: "integrations",
        title: "Integracoes",
        href: "/settings/integrations",
        summary:
          "Conecte Slack (webhook para automacoes), Microsoft Teams (export one-way do plano) e Google Calendar (export one-way de prazos). Credenciais ficam server-side.",
        badge: "Admin",
        steps: [
          "Slack (/settings/integrations/slack): informe Webhook URL e Rotulo do canal (opcional); Salvar e Testar conexao. Usado por automacoes send_slack.",
          "Google (/settings/integrations/google): Conectar Google (OAuth), informe Calendar ID (padrao primary), Salvar calendario e Exportar prazos (due_date).",
          "Teams (/settings/integrations/teams): Azure Tenant ID (opcional), Team ID, Channel ID, Planner Plan ID, Planner Bucket ID; Salvar integracao.",
          "Export do plano: botao Exportar p/ Teams em /plan (requer OAuth Microsoft + config Teams).",
        ],
        tips: ["Badge Webhook configurado — {canal} confirma Slack ativo."],
      },
      {
        id: "audit",
        title: "Auditoria",
        href: "/settings/audit",
        summary:
          "Historico de acoes da organizacao (400 dias). Filtre por pessoa, periodo e tipos de evento; exporte CSV ou PDF respeitando filtros ativos.",
        badge: "Admin",
        steps: [
          "Filtro Quem fez a acao: Todas as pessoas ou membro especifico.",
          "Defina A partir de e Ate (datetime-local) e clique Aplicar filtros.",
          "Tipos de evento: chips multi-selecao por grupo (Organizacao, Projetos e colunas, Cards e tarefas, Integracoes).",
          "Use Selecionar todos / Limpar selecao ou Todos/Limpar por grupo.",
          "Exportar CSV ou Exportar PDF no header exporta apenas eventos filtrados.",
        ],
      },
      {
        id: "permissions",
        title: "Permissoes por campo",
        href: "/settings/permissions",
        summary:
          "Overrides por membro que sobrescrevem o padrao do papel. Matriz Campo do card | Permissao personalizada | Efetiva para cada pessoa.",
        badge: "Admin",
        steps: [
          "Selecione o Membro no dropdown (mostra nome e papel na org).",
          "Para cada campo (Titulo, Descricao, Prazo final, Data de inicio, Meta de entrega, Prioridade, Responsavel, Coluna, Horas estimadas), escolha Padrao do papel, Leitura, Edicao ou Oculto.",
          "Coluna Efetiva mostra resultado final com badge Leitura/Edicao/Oculto e indicador (papel) se nao houver override.",
          "Alteracoes salvam imediatamente — toast Permissao atualizada.",
        ],
        tips: ["Valores em Padrao do papel seguem as regras do papel na org (Visualizador, Gerente, etc.)."],
      },
    ],
  },
  {
    id: "account",
    title: "Conta",
    sections: [
      {
        id: "organizations",
        title: "Minhas organizacoes",
        href: "/settings/organizations",
        summary:
          "Lista expansivel de organizacoes das quais voce participa, com projetos, membros e departamentos. Crie novas orgs ou alterne a ativa.",
        steps: [
          "Use busca para filtrar organizacoes.",
          "Expanda um card de org para ver projetos, membros e departamentos.",
          "Clique para alternar organizacao ativa.",
          "Use Criar organizacao para nova org (mesmo fluxo da Home quando sem org).",
        ],
      },
      {
        id: "profile",
        title: "Meu perfil",
        href: "/profile",
        summary:
          "Dados pessoais: avatar, nome completo, e-mail de backup, telefone e idioma preferido (Portugues ou English). E-mail da conta e somente leitura.",
        steps: [
          "Faca upload do avatar.",
          "Edite Nome completo, E-mail de backup e Telefone.",
          "Escolha Idioma preferido: Portugues (Brasil) ou English (US).",
          "Clique Salvar alteracoes — toast Perfil atualizado!.",
        ],
      },
      {
        id: "password",
        title: "Mudar senha",
        href: "/profile/password",
        summary:
          "Altere senha informando a atual. Contas Google-only veem aviso para gerenciar credenciais no Google.",
        steps: [
          "Se login Google: mensagem Sua conta usa login Google — gerencie no Google.",
          "Caso contrario: preencha Senha atual, Nova senha (min. 8 caracteres) e Confirmar nova senha.",
          "Clique Salvar nova senha — voce permanece logado.",
          "Use Voltar ao perfil para retornar.",
        ],
      },
    ],
  },
];
