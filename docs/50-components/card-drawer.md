# Card Drawer — spec MVP

## Objetivo
Painel lateral para editar card: titulo, descricao, prioridade, prazo, responsavel, marcadores.

## Marcadores (TagPickerPopover)
- Exibe **apenas** tags anexadas ao card como chips com `x`.
- Botao `+` abre popover com lista da org (toggle attach/detach).
- Criar marcador no rodape do popover **nao** anexa automaticamente.

## Prazo
- `DatePickerPopover` substitui `<input type="date">`.

## Responsavel
- Select lista **membros da org + integrantes do board** (`board_members`), ordenados por nome.
- Convidados que aceitaram convite (sem `memberships` na org) aparecem como opcao de responsavel.
- Loader: `lib/board-assignees.ts` + `boards/[boardId]/page.tsx`.

## Modo visualizador (`viewer`)
- Prop `readOnly` quando `!canEditBoardUI` (ver `lib/board-member-roles.ts`).
- Titulo **Ver card**; campos somente leitura (texto + badges); sem Salvar/Excluir.
- Componente: `card-drawer-readonly.tsx` (invocado por `CardDrawer`).

## Excluir card

- Footer **fixo** (fora do scroll): botoes Salvar e Excluir sempre visiveis.
- Botao Excluir abre `ConfirmDialog` com contagens de impacto:
  - Subtarefas (`cards.parent_id = cardId`)
  - Dependencias (`card_dependencies` blocker ou blocked)
- DB faz `ON DELETE CASCADE` em subtarefas e dependencias.
- Server action `getCardDeleteImpact` retorna contagens antes da confirmacao.
- `deleteCard` remove o card e revalida board + calendario.

## Criterios de aceite
- Abre ao clicar no card no Kanban.
- Salvar persiste via server action `updateCard` + `card_events`.
- Tags orfaos nao aparecem no card ate selecao explicita no `+`.
- Excluir exige confirmacao explicita citando subtarefas/dependencias afetadas.
- Viewer (`readOnly`) nao ve botao Excluir.

## Codigo
- `apps/web/components/board/card-drawer.tsx`
- `apps/web/components/board/tag-picker-popover.tsx`
- `apps/web/app/(app)/boards/[boardId]/actions.ts`
