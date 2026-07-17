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

## Layout / viewport (scroll das colunas)

Cadeia flex obrigatoria para colunas altas rolarem **cards**, nao a pagina inteira:

1. **Shell** (`app-shell.tsx` / `app-shell-streaming.tsx`): root `h-dvh min-h-0`; `main` = `flex min-h-0 flex-1 flex-col overflow-y-auto`.
2. **Board** (`board-view.tsx`): em `view=kanban`, container `flex min-h-0 flex-1 flex-col overflow-hidden` (header/filtros/switcher `shrink-0`; faixa Kanban `flex-1 min-h-0`).
3. **Row de colunas** (`board-kanban-view.tsx`): `items-start` + `h-full min-h-0` + `overflow-x-auto overflow-y-hidden` — colunas alinhadas ao topo, altura pelo conteudo ate `max-h-full`.
4. **Coluna** (`kanban-column.tsx`): `h-auto max-h-full min-h-0`; lista de cards `flex-1 min-h-0 overflow-y-auto`; **`CreateCardForm` fixo sob os cards** (`shrink-0`, fora do scroll da lista).

## Criterios de aceite

- Card movido de coluna A para B persiste apos reload.
- Reordenacao dentro da coluna persiste apos reload.
- Viewer nao consegue arrastar.
- Modo "Agrupar por responsavel" nao oferece DnD (fast-follow).
- Coluna alta: scroll vertical so na lista de cards; form "adicionar card" permanece visivel sob a lista.
- Viewport Kanban: pagina nao cresce indefinidamente; shell `h-dvh` preenche a janela.

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Drag inter-coluna | `board-kanban-view.tsx`, `kanban-column.tsx` | `e2e/board-kanban-dnd.spec.ts` |
| moveCard action | `card-actions.ts` → `lib/card-kernel`, `schemas.ts` | typecheck |
| Evento moved | trigger DB / RLS cards_write | pgTAP (existente) |
| Layout content-sized + form sob cards | `kanban-column.tsx`, `board-kanban-view.tsx`, shell `h-dvh` | E2E / visual (scroll coluna) |

## Codigo

- `apps/web/components/board/board-kanban-view.tsx`
- `apps/web/components/board/kanban-column.tsx`
- `apps/web/components/board/sortable-card-tile.tsx`
- `apps/web/lib/fractional.ts`
- `apps/web/app/(app)/boards/[boardId]/card-actions.ts`
- `apps/web/lib/card-kernel/`
- Spec: [shared-kernel-card.md](./shared-kernel-card.md)
