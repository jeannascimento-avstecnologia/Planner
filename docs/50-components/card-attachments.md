# Card Attachments — spec MVP

> **Status:** APROVADO  
> **Consumido por:** [card-drawer.md](./card-drawer.md)

## Contexto

Anexos por card: MVP = links URL; upload Cloudinary = fast-follow (Edge Function assinada).

## Objetivos

- Tabela `card_attachments` com `org_id` + RLS.
- Lista no drawer com label + link externo.
- CRUD URL: create / delete por quem tem `can_write_board`.

## Não-objetivos

- Upload de arquivo (S4 Cloudinary webhook).
- Preview de imagem/PDF inline.

## Requisitos

### R1 — Schema

`card_attachments(id, org_id, board_id, card_id, kind, url, label, created_by, created_at, updated_at)`  
`kind` enum check: `'url'` (único no MVP). URL max 2048.

### R2 — RLS

- SELECT: `app.can_access_board(board_id)`
- INSERT/DELETE: `app.can_write_board(board_id)` + align org/board/card

### R3 — Kernel

Zod: `createCardAttachmentInput`, `deleteCardAttachmentInput`  
Audit `card_attachment_added` no INSERT.

### R4 — Load

Batch por board; agrupar em `BoardCard.attachments`.

### R5 — UI

`CardAttachments`: lista + form URL + label opcional; link abre nova aba.

## Critérios de aceite

- [ ] Editor adiciona/remove link; viewer só lê.
- [ ] URL inválida rejeitada no Zod.
- [ ] Cross-org bloqueado; cascade no delete card.
- [ ] pgTAP verde.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Migration | `20260826*_card_comments_attachments.sql` | pgTAP |
| Kernel + actions | `mutations.ts`, `card-actions` | typecheck |
| UI | `card-attachments.tsx` | manual |
