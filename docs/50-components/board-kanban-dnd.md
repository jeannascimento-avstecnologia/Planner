# Board Kanban DnD — spec MVP

## Objetivo

Arrastar cards entre colunas no modo Kanban padrao (colunas horizontais). Nao cobre swimlanes "Agrupar por responsavel".

Estado: TanStack Query (`board:{id}:cards`) + Realtime invalidate — ver [board-cards-query-realtime.md](./board-cards-query-realtime.md). Move via Shared Kernel (`card-actions.moveCard`).

## Stack

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Posicao: `fractional-indexing` (`generateKeyBetween`) — 1 write O(1) por movimento
- Server action `moveCard` em `boards/[boardId]/card-actions.ts` (kernel: `lib/card-kernel`)

## Comportamento

- **Editor** (`canEditBoard`): drag habilitado; `PointerSensor` com `activationConstraint.distance: 8` para nao conflitar com click-to-open drawer.
- **Viewer**: cards nao arrastaveis.
- **Intra-coluna**: reordenar dentro da mesma coluna.
- **Inter-coluna**: soltar em coluna vazia ou sobre outro card → atualiza `column_id` + `position`.
- Apos drop: `moveCard` server action + `router.refresh()`.
- Grava `card_events` tipo `moved` com `from_column_id` / `to_column_id`.

## Criterios de aceite

- Card movido de coluna A para B persiste apos reload.
- Reordenacao dentro da coluna persiste apos reload.
- Viewer nao consegue arrastar.
- Modo "Agrupar por responsavel" nao oferece DnD (fast-follow).

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Drag inter-coluna | `board-kanban-view.tsx`, `kanban-column.tsx` | `e2e/board-kanban-dnd.spec.ts` |
| moveCard action | `card-actions.ts` → `lib/card-kernel`, `schemas.ts` | typecheck |
| Evento moved | trigger DB / RLS cards_write | pgTAP (existente) |

## Codigo

- `apps/web/components/board/board-kanban-view.tsx`
- `apps/web/components/board/kanban-column.tsx`
- `apps/web/components/board/sortable-card-tile.tsx`
- `apps/web/lib/fractional.ts`
- `apps/web/app/(app)/boards/[boardId]/card-actions.ts`
- `apps/web/lib/card-kernel/`
- Spec: [shared-kernel-card.md](./shared-kernel-card.md)
