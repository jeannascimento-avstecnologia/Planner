# Card Drawer — spec MVP

## Objetivo
Painel lateral para editar card: titulo, descricao, prioridade, prazo, responsavel, marcadores.

## Marcadores (TagPickerPopover)
- Exibe **apenas** tags anexadas ao card como chips com `x`.
- Botao `+` abre popover com lista da org (toggle attach/detach).
- Criar marcador no rodape do popover **nao** anexa automaticamente.

## Prazo
- `DatePickerPopover` substitui `<input type="date">`.

## Criterios de aceite
- Abre ao clicar no card no Kanban.
- Salvar persiste via server action `updateCard` + `card_events`.
- Tags orfaos nao aparecem no card ate selecao explicita no `+`.

## Codigo
- `apps/web/components/board/card-drawer.tsx`
- `apps/web/components/board/tag-picker-popover.tsx`
- `apps/web/app/(app)/boards/[boardId]/actions.ts`
