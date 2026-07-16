# Shared Kernel Card — mutações canônicas (P1 Hardening)

> **Status:** IMPLEMENTADO (ciclo `HARDENING_PRODUCAO_ESCALA` P1 — PR-K1+K2)  
> **Plano:** `docs/local/HARDENING_PRODUCAO_ESCALA.md` §P1 (PR-K1 / PR-K2)  
> **Gate SDD:** esta spec antes do código do kernel.

## Contexto

Kanban, Tabela (e futuramente Timeline/Calendário) mutavam o agregado Card por paths distintos (`actions.ts` vs `field-actions.ts`), com lógica de patch/datas duplicada. Views devem ser **projeções**, não donas do estado.

## Objetivos

- Um módulo kernel com tipos + API de mutação única: `create`, `move`, `updateFields`, `update` (Form/drawer → patch), `delete`.
- Server Actions finas apenas validam input (Zod/FormData) e delegam ao kernel.
- Kanban + Tabela consomem a mesma write path (via `card-actions`).
- Vitest unitário da lógica pura do kernel (patch/datas).

## Não-objetivos

- ~~TanStack Query / Realtime cards (P2).~~ → **feito em P2** — ver [board-cards-query-realtime.md](./board-cards-query-realtime.md)
- Refator cosmética total de `actions.ts` / `plan-client.tsx`.
- Mudança de contrato optimistic/`updated_at` (sem ADR).
- Mutations de alocação Plan (`upsert_card_allocation` etc.) — domínio distinto.
- Reindexação em massa / alteração de fractional indexing.

## Requisitos

1. **Kernel server-side** em `apps/web/lib/card-kernel/` (sem `"use server"`).
2. **API canônica** exportada por `apps/web/app/(app)/boards/[boardId]/card-actions.ts` (`"use server"`).
3. `move` = 1 write O(1): `column_id` + `position` (fractional).
4. `update` e `updateFields` compartilham o mesmo caminho RPC `update_card_fields` + mesma revalidação (`revalidateBoard` / `revalidatePlanViews` condicional).
5. Views Kanban e Tabela importam mutações de `card-actions` (não de paths paralelos com lógica própria).
6. Isolamento multi-tenant permanece via RLS + checagens existentes no kernel (board/column ownership).

## Critérios de aceite

- [x] Kanban `move` e Tabela `updateFields` passam pelo mesmo módulo kernel.
- [x] Zero lógica duplicada de montagem de patch entre drawer `update` e tabela `updateFields`.
- [x] `tsc --noEmit` verde no pacote web.
- [x] Vitest do kernel (patch/datas) verde.
- [~] Sem regressão: E2E kanban/plan — tentativa bloqueada por browsers Playwright ausentes no ambiente; revalidar com `npx playwright install` + `e2e/board-kanban-dnd.spec.ts`.

## Questões abertas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | Actions legadas em `actions.ts` / `field-actions.ts` | Re-export fino ou thin wrapper → kernel; sem breaking de imports internos restantes |

## Specs vinculadas

- [board-kanban-dnd.md](./board-kanban-dnd.md)
- [board-view-modes.md](./board-view-modes.md)
- [views-interactive.md](./views-interactive.md)
- [field-level-permissions.md](./field-level-permissions.md)
- Plano: `docs/local/HARDENING_PRODUCAO_ESCALA.md` §P1

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tipos + patch puro | `lib/card-kernel/*` | `build-update-patch.test.ts` |
| Mutations create/move/update/delete | `lib/card-kernel/mutations.ts` | typecheck + Vitest puro |
| Actions finas | `card-actions.ts` | typecheck |
| Kanban move | `board-kanban-view.tsx` → `card-actions` | `e2e/board-kanban-dnd.spec.ts` |
| Tabela fields | `board-table-view.tsx` → `card-actions` | typecheck / E2E table se houver |
| Drawer update/delete | `card-drawer.tsx` → `card-actions` | `e2e/board-card-delete.spec.ts` |
