# Board cards — TanStack Query + Realtime invalidate (P2 Hardening)

> **Status:** IMPLEMENTADO (ciclo `HARDENING_PRODUCAO_ESCALA` P2 — PR-Q1+Q2+Q3)  
> **Plano:** `docs/local/HARDENING_PRODUCAO_ESCALA.md` §P2  
> **Gate SDD:** esta spec + correção de `realtime-multiplayer.md` antes/durante o código.

## Contexto

O GUIA manda estado em 3 camadas (TanStack Query + Realtime Kanban + Zustand UI). Até P1 o board usava só SSR/`revalidatePath` + estado local no Kanban (`movingRef`), sem Query nem `postgres_changes` em `cards` — multi-aba ficava stale e o sync via props RSC scrambleava DnD.

## Objetivos

- Introduzir `@tanstack/react-query` com QueryProvider no app.
- QueryKeys canônicas `board:{boardId}:cards` — **uma** store de entidades card.
- Mutations (move via Shared Kernel / `card-actions`) invalidam a key (optimistic move O(1) permitido).
- Canal Realtime **estreito** `cards` + `filter: board_id=eq.{boardId}` → **só** `invalidateQueries` (ou patch mínimo); **não** espelhar row completa como SoT paralela.
- Remover/afrouxar `movingRef`; durante drag, ignorar reset de layout por refetch remoto.
- Corrigir spec mentirosa em `realtime-multiplayer.md` L9.

## Não-objetivos

- P3/P4; reabrir P0.
- Yjs / whiteboard multiplayer completo (épico B).
- Big-bang rewrite de `plan-client.tsx`.
- Analytics / automations no hot path Realtime.
- Reindexação em massa (fractional indexing permanece).
- Payload wide / fan-out de row completa no canal (requer ADR).

## Requisitos

1. **Provider** client-side (`QueryClientProvider`) disponível sob `app/(app)`.
2. **queryKey:** `["board", boardId, "cards"]` (factory em `lib/query/board-cards-keys.ts`).
3. **SSR seed:** `initialData` do snapshot RSC; `queryFn` refetch client (Supabase anon + RLS).
4. **Realtime:** channel `board:{boardId}:cards` — `postgres_changes` em `public.cards`, eventos `*`, filter `board_id=eq.{boardId}` → debounce → `invalidateQueries`.
5. **Write:** Server Actions / Shared Kernel permanecem a write API; não viram cache.
6. **Publication:** migration adiciona `cards` a `supabase_realtime` + `REPLICA IDENTITY FULL` (filter DELETE por `board_id`).
7. Kanban move continua via `card-actions.moveCard` (kernel P1).

## Critérios de aceite

- [x] Dois clientes / simulação: move → outro invalida/refetch sem scramble de colunas.
- [x] Spec `realtime-multiplayer.md` alinhada (Kanban = Query+invalidate; Presence/Yjs = B).
- [x] Vitest unitário de merge/optimistic move + shouldIgnoreBusy.
- [x] `.estado_atual.md` atualizado.
- [~] Playwright multi-tab — mesmo bloqueio ENV de browsers do P1; revalidar com `npx playwright install`.

## Questões abertas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | Patch mínimo vs só invalidate | P2 = invalidate (+ optimistic local no mutator); patch mínimo opcional depois |
| 2 | `card_tags` fora do canal cards | Aceito; tag join no `queryFn` no refetch |

## Specs vinculadas

- [shared-kernel-card.md](./shared-kernel-card.md) (write path)
- [board-kanban-dnd.md](./board-kanban-dnd.md)
- [realtime-multiplayer.md](./realtime-multiplayer.md) (Presence/Yjs — não confundir com cards)
- [realtime-board-cards.md](../40-api/realtime-board-cards.md)
- Plano: `docs/local/HARDENING_PRODUCAO_ESCALA.md` §P2

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Query keys + merge | `lib/query/board-cards-*.ts` | `board-cards-cache.test.ts` |
| Provider | `components/providers/query-provider.tsx` | typecheck |
| Hook Query + Realtime | `hooks/use-board-cards*.ts` | typecheck / manual 2 clients |
| Kanban wiring | `board-view.tsx`, `board-kanban-view.tsx` | E2E kanban (ENV) |
| Publication | `*_cards_realtime_publication.sql` | migrate apply |
| Spec fix L9 | `realtime-multiplayer.md` | review |
