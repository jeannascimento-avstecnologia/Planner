# ShareProjectPanel / ShareBoardModal

> ADR: [ADR-0015](../20-architecture/ADR-0015-hierarquia-acl-papeis-fixos.md) · [ADR-0016](../20-architecture/ADR-0016-access-presets.md)

## Objetivo
Compartilhamento **dentro do projeto** (modal acionado por botao no header do board): copiar link, convidar por email, listar membros.

## Componentes
- `share-project-panel.tsx` — conteudo reutilizavel (copiar link, membros, convite).
- `share-board-modal.tsx` / `board-access-modal.tsx` — wrappers modal, montados em `board-view.tsx`.
- `board-members-list.tsx` — lista preset-first (label + select do catálogo).

## Props (panel)
- `boardId` — projeto fixo (sem select; contexto do board).
- `boardName`
- `members` — membros do board (`preset_id`, `presetName?`, `role`).
- `accessPresets?` — catálogo org+sistema (mesmo do invite).

## Acoes
- `inviteToBoard` (existente)
- `assignBoardMemberPresetAction` — troca de nivel por preset (dual-write `role` via trigger DB)
- Copiar link: `{origin}/boards/{id}` via clipboard

## Permissoes UI
- Convite / troca de nivel / remocao: `canManageBoardMembers` — org admin|owner **OU** board Administrador (`manager` / `members.*`).
- Editor (`admin`) e Visualizador (`viewer`): lista read-only (sem form de convite).
- Display read-only: `presetName ?? boardRoleLabel(role)` — custom preset **visível pelo nome**.

## Criterios de aceite
- Botao "Compartilhar" / engrenagem acesso visivel para Administrador do projeto e org admin|owner.
- Editor/Viewer nao ve form de convite nem troca de niveis.
- Membro com preset custom mostra o **nome do preset** na lista (nao so "Editor").
- Select de nivel usa catálogo de presets (sistema + org), nao hard-code viewer/admin/manager.
- Nao aparece na sidebar.

## Codigo
- `apps/web/components/board/share-board-modal.tsx`
- `apps/web/components/board/share-project-panel.tsx`
- `apps/web/components/board/board-members-list.tsx`
- `apps/web/components/board/board-access-modal.tsx`
