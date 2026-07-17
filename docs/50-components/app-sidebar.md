# AppShell / AppSidebar

## Objetivo
Layout global `(app)` com sidebar compacta, recolhivel, **fechada por padrao**.

## Componentes
- `app-shell.tsx` / `app-shell-streaming.tsx` — flex sidebar + main; root **`h-dvh min-h-0`**; coluna main `flex min-h-0 flex-1 flex-col`; `main` = `flex min-h-0 flex-1 flex-col overflow-y-auto` (preenche viewport; filhos com `min-h-0` podem scrollar internamente — ex. Kanban).
- `topbar-title.tsx` — pill do contexto (Home / modo do board via `VIEW_LABELS`, incl. `tree: "Arvore"`).
- `app-sidebar.tsx` — `w-64` (aberta) / `w-16` (recolhida) desktop; overlay mobile. Estado inicial recolhido, persistido em `localStorage` `ngp:sidebar-collapsed`.
- `theme-toggle.tsx` — alterna claro/escuro (topo)
- `notification-bell.tsx` — sino com badge de nao-lidas
- `recent-projects.tsx` — `localStorage` `ngp:recent-boards` (max 5)
- `track-recent-board.tsx` — atualiza recentes ao abrir board

## Conteudo (topo -> base)
1. Logo + ThemeToggle
2. Botao recolher/expandir (seta)
3. Nav icones: Projetos, Calendario (icone -> `/calendar`, sem grade)
4. NotificationBell
5. Perfil (icone -> `/profile`)
6. Recentes (so aberto)
7. Rodape: email + **Ajuda** (`/help`, icone `CircleHelp`, acima de Configuracoes) + Configuracoes + Sair (so aberto quando expandido)

## Dados (layout server)
- Boards da org (recentes/links) + notificacoes do usuario (contador/lista).
- **Removido**: `dueDays` (mini-cal) e `membersByBoard` (share saiu da sidebar).

## Criterios de aceite
- Sidebar inicia recolhida; expande via seta.
- Calendario e icone (sem grade na sidebar).
- Compartilhar NAO esta na sidebar (vive no projeto).
- Sidebar em todas as rotas `(app)`.
- Link **Ajuda** no rodape acima de Configuracoes; navega para `/help` (Centro de Ajuda).
- Shell `h-dvh` + cadeia `min-h-0`: board Kanban nao estica a pagina; scroll interno nas colunas ([board-kanban-dnd.md](./board-kanban-dnd.md)).
- Topbar em board detail: label do `?view=` inclui **Arvore**.

## Manutencao / troubleshooting (layout)

| Sintoma | Causa tipica | Checagem |
|---------|--------------|----------|
| Pagina inteira rola no Kanban (coluna alta) | Quebra da cadeia `h-dvh` → `min-h-0` → `flex-1` | Shell root/main; `board-view` fillViewport; row `items-start` |
| Form "add card" some ao rolar | Form dentro do container `overflow-y-auto` dos cards | Deve ficar `shrink-0` **abaixo** da lista em `kanban-column.tsx` |
| Topbar sem "Arvore" | `VIEW_LABELS` incompleto | `topbar-title.tsx` |
| CLS / salto de altura ao trocar modo | Kanban usa fill viewport; outros modos `space-y-4` | Esperado; ver [performance-budgets.md](../60-quality/performance-budgets.md) § Viewport |
