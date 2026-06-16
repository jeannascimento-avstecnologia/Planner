# ShareProjectPanel / ShareBoardModal

## Objetivo
Compartilhamento **dentro do projeto** (modal acionado por botao no header do board): copiar link, convidar por email, listar membros.

## Componentes
- `share-project-panel.tsx` — conteudo reutilizavel (copiar link, membros, convite).
- `share-board-modal.tsx` — wrapper modal, montado em `board-view.tsx`.

## Props (panel)
- `boardId` — projeto fixo (sem select; contexto do board).
- `boardName`
- `members` — membros do board.

## Acoes
- `inviteToBoard` (existente)
- Copiar link: `{origin}/boards/{id}` via clipboard

## Permissoes UI
- **Visualizar** (`viewer`) / **Editar** (`admin`)

## Criterios de aceite
- Botao "Compartilhar" visivel no projeto.
- Nao aparece na sidebar.

## Codigo
- `apps/web/components/board/share-board-modal.tsx`
- `apps/web/components/board/share-project-panel.tsx`
