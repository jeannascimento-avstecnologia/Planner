# AppShell / AppSidebar

## Objetivo
Layout global `(app)` com sidebar compacta, recolhivel, **fechada por padrao**.

## Componentes
- `app-shell.tsx` — flex sidebar + main
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
7. Rodape: email + Sair (so aberto)

## Dados (layout server)
- Boards da org (recentes/links) + notificacoes do usuario (contador/lista).
- **Removido**: `dueDays` (mini-cal) e `membersByBoard` (share saiu da sidebar).

## Criterios de aceite
- Sidebar inicia recolhida; expande via seta.
- Calendario e icone (sem grade na sidebar).
- Compartilhar NAO esta na sidebar (vive no projeto).
- Sidebar em todas as rotas `(app)`.
