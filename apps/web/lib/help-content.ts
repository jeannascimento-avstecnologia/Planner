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
          "Filtre por departamento com os botoes (Todos + nomes dos departamentos) quando houver mais de um.",
          "Clique no cartao do projeto para abrir o quadro.",
          "Na secao Proximos 7 dias, clique em um prazo para ir ao projeto; use Ver calendario para abrir o calendario.",
          "Na secao Prazos, cards com faixa vermelha estao atrasados; faixa colorida indica prazo dentro do prazo.",
          "Clique na engrenagem Configuracoes no cartao do projeto para editar nome, cor, departamento, arquivar ou gerenciar membros (nao disponivel para Visualizador).",
          "Use Novo projeto para criar um projeto informando Organizacao, Departamento, Nome e Descricao (opcional).",
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
          "Hub de comparacao e gestao: filtre projetos sem entrar no quadro, selecione um cartao para ver detalhes no painel lateral e gerencie participantes.",
        steps: [
          "No painel Filtros, escolha Organizacao (troca a org ativa e recarrega a pagina), Departamento (Todos / Geral / nome do dept), Ordenar por (Nome A-Z ou Mais recentes) e Buscar por nome do projeto.",
          "Marque Incluir arquivados para ver projetos arquivados; use Limpar filtros (N) para resetar.",
          "Clique em um cartao para seleciona-lo — o painel lateral abre sem entrar no quadro.",
          "No painel: Abrir Projeto vai ao quadro; Trocar projeto limpa a selecao.",
          "Veja estatisticas (cards abertos), badge Tiflux se integrado, lista Participantes e Proximas tarefas com datas formatadas.",
          "Use a engrenagem no painel para abrir Configuracoes do projeto (mesmo modal da Home).",
        ],
        tips: [
          "Convites e papeis do projeto ficam em Participantes — Administrador do projeto ou admin/owner da org podem convidar.",
          "O subtitulo do header mostra org e departamento ativos (ex.: Minha Org · Marketing).",
        ],
      },
      {
        id: "kanban",
        title: "Kanban do projeto",
        href: "/boards",
        summary:
          "Quadro do projeto com colunas arrastaveis, multiplas visoes, filtros avancados e painel completo de edicao do card.",
        steps: [
          "Alterne a visao pelo seletor: Kanban (padrao), Linha do tempo, Calendario, Tabela ou Arvore.",
          "Whiteboard e Dashboard sao links separados no topo (nao aparecem no seletor de visoes).",
          "Na Arvore: organograma do projeto — conecte cards pelos pontos de conexao, use Adicionar card Filho para criar e ligar, role a roda para zoom, botao do meio/direito para arrastar a tela, Organize para alinhar o layout.",
          "Cards criados na Arvore (com Adicionar card Filho) tambem aparecem no Kanban, Tabela e Calendario.",
          "No Kanban, marque Agrupar por responsavel para ver faixas por pessoa (Sem responsavel + nomes dos membros).",
          "Arraste cards entre colunas para mudar status — exige papel Editor no projeto ou admin da org (Visualizador nao arrasta).",
          "Clique no card para abrir o painel: Titulo, Descricao, Inicio, Entrega estimada, Prazo final, Horas estimadas, Prioridade, Responsavel, Marcadores.",
          "Se voce e responsavel, o bloco Plano de trabalho mostra link Abrir em Meu plano.",
          "Use a barra de filtros: Buscar por titulo, Estagios, prazos (3d/5d/10d/30d ou Dia exato), Responsavel, Marcador e Estagio.",
          "Automacoes (topo): org admin ou Editor/Administrador do projeto. Gerenciar acesso e Convidar integrante: Administrador do projeto ou admin/owner da org.",
        ],
        tips: [
          "Papeis do projeto: Visualizador (so leitura), Editor (edita cards sem ACL), Administrador (edita + membros/convites/settings).",
          "Prazo final vencido aparece destacado no painel do card; Entrega estimada e campo de planejamento opcional.",
        ],
      },
      {
        id: "dashboard",
        title: "Dashboard do projeto",
        summary:
          "Metricas de fluxo do projeto: cards por coluna, ritmo de entrega semanal, tempo medio ate concluir e tabela de gargalos.",
        steps: [
          "Acesse pelo link Dashboard no topo do projeto.",
          "Cards por coluna: grafico de area com a quantidade atual em cada coluna.",
          "Ritmo de entrega: barras verdes com cards concluidos por semana.",
          "Tempo medio ate concluir: horas medias e quantos cards entraram no calculo.",
          "Gargalos: tabela Coluna | Horas medias | Amostras — identifique onde cards ficam parados mais tempo.",
          "Use Voltar ao projeto para retornar ao quadro.",
        ],
        tips: [
          "Qualquer membro com acesso ao projeto pode ver o dashboard; nao exige papel especial.",
          "Gargalos vazio (Sem dados ainda) indica poucos movimentos registrados no historico.",
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
          "Grade mensal com todos os prazos finais da organizacao. Arraste prazos entre dias com confirmacao, clique no dia para vincular ou criar prazo, e exporte para calendarios externos.",
        steps: [
          "Navegue com Mes anterior / Proximo mes (setas no topo).",
          "Prazos coloridos = cor do projeto; vermelhos = vencidos. No maximo 3 por dia (e +N quando ha mais).",
          "Arraste um prazo para outro dia — aparece barra Mover {titulo} para {data}? com Cancelar e Confirmar.",
          "Clique curto no prazo (sem arrastar) abre o card no projeto.",
          "Clique em dia vazio ou no + abre modal Agenda — {data} com abas Vincular existente (Buscar card...) e Criar prazo (Titulo, projeto, coluna).",
          "Use Gerar link iCal no topo para sincronizar com Google Calendar, Outlook e outros apps.",
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
          "Grade de 11 dias (5 anteriores + hoje + 5 futuros) para alocar horas nos seus cards. Listas laterais Atrasados, Nao agendados e Sem estimativa; arraste para agendar e reordenar.",
        steps: [
          "Filtre por Organizacao (Todas ou uma especifica) e Projeto (Todos ou um projeto).",
          "Marque Exibir sabados e domingos para incluir fins de semana na grade.",
          "Arraste cards das listas laterais (Atrasados / Nao agendados / Sem estimativa) para uma coluna de dia — isso agenda o card naquele dia.",
          "Clique em celula de horas para digitar alocacao (0–24, passo 0.5); coluna Σ mostra total da linha.",
          "Arraste o icone de arrastar na linha para reordenar cards dentro do mesmo projeto.",
          "Arraste o bloco de horas ja alocado para outro dia para mover a alocacao (bloqueado se o destino ja tiver horas).",
          "Botao X na linha remove o card do plano de 11 dias (confirma e apaga horas do periodo).",
          "Linha Utilizacao mostra % diario com barra verde (<80%), ambar (80–100%) ou vermelha (>100%).",
          "Navegue periodos com setas; botao Hoje volta a janela atual. Link Ver carga 15d abre a carga em 15 dias.",
        ],
        tips: [
          "Coluna ambar = dia da Entrega estimada; vermelho = Prazo final; vermelho claro = dias apos vencimento.",
          "Legenda abaixo do titulo explica todas as cores (Hoje, Entrega estimada, Prazo final, Prazo vencido, utilizacao).",
          "Exportar p/ Teams (topo) exige integracao Microsoft configurada em Configuracoes > Integracoes.",
        ],
      },
      {
        id: "workload",
        title: "Carga de trabalho",
        href: "/workload",
        summary:
          "Visao gerencial da capacidade da equipe: utilizacao por membro na semana ou mapa de cores de 15 dias. Apenas proprietario, administrador ou gerente da org.",
        badge: "Gestor",
        steps: [
          "Alterne Semana ou 15 dias no topo.",
          "Visao Semana: tabela Membro | Utilizacao (barra) | Horas | Capacidade | Cards.",
          "Verde <80%, ambar 80–100%, vermelho >100% de utilizacao.",
          "Proprietario e gerente podem editar Capacidade (1–168h) clicando no valor e confirmando.",
          "Clique no nome do membro para ver detalhes: cards alocados, horas, datas e link ao plano.",
          "Secao Sem data planejada lista cards sem alocacao no periodo.",
          "Visao 15 dias: mapa de cores diario por membro; edite alocacoes no Meu plano (nao diretamente aqui).",
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
          "Tabela de membros com papeis editaveis: Visualizador, Gerente, Administrador e Proprietario. Owner e Administrador podem alterar papeis e remover membros.",
        steps: [
          "Localize o membro na tabela e altere o papel no select.",
          "Proprietario: controle total; so pode haver regras especiais com multi-owner habilitado.",
          "Administrador: convites, membros, integracoes, auditoria e permissoes de campo.",
          "Gerente: operacao; write via ACL de projeto/departamento (sem convites org).",
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
        tips: ["Apenas proprietario ou administrador pode enviar convites."],
        badge: "Admin",
      },
      {
        id: "access-presets",
        title: "Presets de acesso",
        href: "/settings/access-presets",
        summary:
          "Pacotes de permissao do projeto: sistema (Administrador, Editor, Visualizador) e custom criados por Owner/Admin.",
        steps: [
          "Abra Presets de acesso nas configuracoes.",
          "Clique Novo preset, nomeie e marque permissoes do projeto (teto = Administrador).",
          "No convite do projeto, escolha o preset pelo nome — sem expor papeis tecnicos.",
        ],
        tips: ["Editar um preset custom propaga para todos os membros que o usam."],
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
          "Conecte Slack (avisos de automacoes), Microsoft Teams (exportar o plano) e Google Calendar (exportar prazos). Credenciais ficam so no servidor.",
        badge: "Admin",
        steps: [
          "Slack (/settings/integrations/slack): informe a URL do webhook e Rotulo do canal (opcional); Salvar e Testar conexao.",
          "Google (/settings/integrations/google): Conectar Google, informe o ID do calendario (padrao primary), Salvar calendario e Exportar prazos.",
          "Teams (/settings/integrations/teams): Azure Tenant ID (opcional), Team ID, Channel ID, Planner Plan ID, Planner Bucket ID; Salvar integracao.",
          "Export do plano: botao Exportar p/ Teams em Meu plano (requer login Microsoft + Teams configurado).",
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
          "Tipos de evento: botoes de multi-selecao por grupo (Organizacao, Projetos e colunas, Cards e tarefas, Integracoes).",
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
