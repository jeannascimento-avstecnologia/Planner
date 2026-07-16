# B — Multiplayer avançado (Presence + Yjs)

> Stack: [ADR-0010](../20-architecture/ADR-0010-stack-extensions-fase2.md).  
> API: [realtime-presence.md](../40-api/realtime-presence.md).  
        **Gate SDD:** implementação após aprovação desta spec.

## Contexto

**Kanban cards** já têm Realtime **invalidate-only** via TanStack Query (ciclo Hardening P2 — ver [board-cards-query-realtime.md](./board-cards-query-realtime.md) + [realtime-board-cards.md](../40-api/realtime-board-cards.md)). Esta spec (épico **B**) adiciona cursores ao vivo (Presence) e edição colaborativa CRDT em descrição/comentários (Yjs + TipTap) — **não** substitui o contrato Query+invalidate do Kanban.

## Objetivos

- Presence channel por board: cursor (x,y), user, cor, viewport.
- Descrição card + corpo comentário: Yjs doc sync via provider Supabase-compatible.
- Throttle 100ms, delta movimento > 5px.

## Não-objetivos

- Yjs no título do card (single-line LWW OK).
- Histórico Git / blame por caractere.
- Video/audio (fast-follow).
- Multiplayer CRDT no Kanban drag (mantém Query + Realtime postgres invalidate; payload wide / Yjs no drag = ADR).
- Substituir TanStack Query por Presence/Yjs como SoT de entidades card.

## Requisitos

### Presence

- Channel: `presence:board:{boardId}` (Supabase Realtime Presence).
- Payload: `{ userId, name, avatar, cursor: {x,y}, color, lastSeen }`.
- Broadcast throttle 100ms; ignorar deltas < 5px.
- UI: overlay SVG absoluto; max 20 cursores visíveis (resto lista sidebar).

### Yjs documentos

- Doc id: `card:{cardId}:description`, `comment:{commentId}:body`.
- Storage: `yjs_documents` table `(doc_id, org_id, state bytea, updated_at)` ou update `cards.description_state` column bytea.
- Provider: `@hocuspocus/provider` self-hosted **rejeitado** — usar `y-supabase` ou persist via Edge Function batch (decisão na impl.: Supabase Realtime broadcast + periodic persist 2s idle).
- Editor: TipTap + `@tiptap/extension-collaboration`.

### Conflitos

- Yjs CRDT vence; sem last-write-wins em description.
- Offline: IndexedDB provider cache (y-indexeddb) optional fast-follow.

### Segurança

- Join channel só se `can_read_board`.
- Yjs updates assinados server-side ou validated room token (Edge Function mint short-lived).

## Critérios de aceite

- [ ] Dois browsers no mesmo card: texto simultâneo sem perda.
- [ ] Cursor aparece < 200ms p95 após movimento.
- [ ] Flood: 60 evt/s reduzido a ~10/s via throttle.
- [ ] Usuário sem acesso board não subscribe channel (403).

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Provider Yjs | spike `y-supabase` vs broadcast + persist |

## Specs vinculadas

- [card-drawer.md](./card-drawer.md)
- [realtime-presence.md](../40-api/realtime-presence.md)
- [board-cards-query-realtime.md](./board-cards-query-realtime.md) (Kanban cards — fora do escopo B)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Presence hook | `use-board-presence.ts` | Vitest throttle |
| Cursor overlay | `board-presence-layer.tsx` | Playwright 2 contexts |
| Yjs + TipTap | `collaborative-description.tsx` | Playwright |
| Persist doc | migration + Edge/cron | pgTAP |
| Room auth | Edge `yjs-auth` | Vitest |
