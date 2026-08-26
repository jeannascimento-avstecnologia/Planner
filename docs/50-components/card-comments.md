# Card Comments — spec MVP

> **Status:** APROVADO  
> **Consumido por:** [card-drawer.md](./card-drawer.md)

## Contexto

Comentários são entidade 1ª classe no card (separados da descrição). Guia mestre: comentários SEMPRE no card, nunca substituir por chat.

## Objetivos

- Tabela `card_comments` com `org_id` + RLS.
- Timeline no drawer: autor, conteúdo, data.
- CRUD: create / update (autor) / delete (autor).
- Qualquer membro com `board.view` pode comentar; viewer lê e comenta.

## Não-objetivos

- Mentions, rich text, realtime colaborativo no corpo.
- Upload inline no comentário.

## Requisitos

### R1 — Schema

`card_comments(id, org_id, board_id, card_id, author_id, content, created_at, updated_at)`  
Constraint: `content` trimmed 1..5000 chars.

### R2 — RLS

- SELECT: `app.can_access_board(board_id)`
- INSERT: `author_id = auth.uid()` + `can_access_board` + align org/board/card
- UPDATE/DELETE: autor + `can_access_board`

### R3 — Kernel

Zod: `createCardCommentInput`, `updateCardCommentInput`, `deleteCardCommentInput`  
Mutations resolvem org/board do card; audit `card_comment_added` no INSERT.

### R4 — Load

Batch por board em `fetch-board-cards` / `board-cache`; join nome via `members` no UI.

### R5 — UI

`CardComments` no drawer: timeline cronológica + textarea; edit/delete só do próprio comentário.

## Critérios de aceite

- [ ] Membro com view comenta; timeline mostra autor e data.
- [ ] Autor edita/deleta próprio comentário; outro usuário não.
- [ ] Viewer comenta; cross-org IDOR bloqueado.
- [ ] Delete card cascade remove comentários.
- [ ] pgTAP + typecheck verdes.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Migration + RLS | `20260826*_card_comments_attachments.sql` | `48_card_comments_attachments_test.sql` |
| Zod + kernel | `schemas.ts`, `mutations.ts`, `card-actions` | Vitest |
| Batch load | `fetch-board-cards.ts`, `board-cache.ts` | typecheck |
| UI | `card-comments.tsx`, `card-drawer.tsx` | manual |
