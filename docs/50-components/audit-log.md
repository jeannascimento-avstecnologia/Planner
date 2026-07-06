# F.1 — Audit Log

> **Gate SDD:** implementação só inicia após aprovação explícita desta spec.  
> Fundação: [ADR-0011](../20-architecture/ADR-0011-event-sourcing-card-events.md), migration `20260706100000_card_events.sql`.

## Contexto

Organizações B2B exigem trilha de auditoria imutável para ações administrativas e operacionais. Reutiliza `card_events` (append-only) como fonte única — evita drift com automações (A) e analytics futuro.

## Objetivos

- Registrar eventos de card, board e org com ator, timestamp e payload tipado.
- UI `/settings/audit` para admin/owner: listagem filtrável com paginação keyset.
- Retenção 400 dias com purge diário via `pg_cron`.

## Não-objetivos

- Diff granular campo-a-campo (F.2).
- Export CSV/PDF (fast-follow).
- Full-text search no payload (v1: filtro por `event_type`, `actor_id`, período).
- Eventos de leitura (SELECT) — só mutações e ações admin.

## Requisitos

### Modelo de dados

Tabela existente `public.card_events`:

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | bigint identity PK | legado 0002 |
| `org_id` | uuid FK | tenant |
| `board_id` | uuid? | null para eventos org |
| `card_id` | uuid? | null para eventos board/org |
| `actor_id` | uuid? | `profiles.id`; null = sistema |
| `event_scope` | text | `card` \| `board` \| `org` |
| `event_type` | text | catálogo abaixo |
| `payload` | jsonb | shape por tipo (Zod) |
| `occurred_at` | timestamptz | default `now()` |

### Catálogo `event_type` (v1)

**Card** (scope `card`, emitidos por triggers em `cards` + RPCs existentes):

- `card_created`, `card_updated`, `card_deleted`, `card_moved`, `card_assigned`, `card_comment_added`, `card_attachment_added`, `card_tiflux_linked`

**Board** (scope `board`):

- `board_created`, `board_deleted`, `board_renamed`, `board_member_added`, `board_member_removed`, `column_created`, `column_renamed`, `column_deleted`, `tiflux_configured`, `tiflux_cleared`

**Org** (scope `org`):

- `member_invited`, `member_removed`, `role_changed`, `department_moved`, `org_renamed`, `org_logo_updated`

### Emissão

1. **Triggers Postgres** em `boards`, `memberships`, `board_members`, `cards`, `columns` — chamam `app.emit_event()` dentro da mesma transação.
2. **Edge Functions / Server Actions** — chamam `app.emit_event()` via `service_role` para eventos que não passam por trigger (ex.: Tiflux token set).
3. Proibido INSERT direto em `card_events` por `authenticated`.

### RLS

- `SELECT`: membership com `role IN ('admin', 'owner')` na `org_id` do evento.
- Sem INSERT/UPDATE/DELETE para `authenticated`.
- Purge exclusivo via `app.purge_card_events_before()` (security definer + flag `app.card_events_purge`).

### Retenção

- Job `pg_cron` diário: `SELECT app.purge_card_events_before(now() - interval '400 days')`.
- Documentar em runbook `docs/70-ops/runbooks/audit-retention.md` (fast-follow doc curto na impl.).

### UI `/settings/audit`

- Rota: `apps/web/app/(app)/settings/audit/page.tsx`.
- Acesso: redirect se role ∉ `{admin, owner}`.
- Filtros: ator (combobox profiles da org), `event_type` (multi-select), período (`occurred_at` from/to).
- Paginação keyset: cursor `(occurred_at, id)` DESC; page size 50.
- Colunas: timestamp (locale pt-BR), ator (nome + avatar), tipo (label i18n), escopo (board/card link quando aplicável), resumo payload (1 linha).
- Componentes: Tremor Table ou visx list; loading skeleton; empty state.

### Contratos TypeScript

- `packages/contracts/src/audit-events.ts`: Zod discriminated union por `event_type`.
- Helper `emitEvent()` server-side valida payload antes de RPC.

## Critérios de aceite

- [ ] Admin vê eventos da org em `/settings/audit`; viewer recebe 403/redirect.
- [ ] Filtro por `role_changed` retorna só eventos desse tipo.
- [ ] Paginação keyset não duplica/skips ao inserir evento durante scroll.
- [ ] UPDATE/DELETE em `card_events` falha (pgTAP + manual).
- [ ] Trigger em `memberships` emite `role_changed` com `payload.old_role` / `payload.new_role`.
- [ ] Purge remove eventos > 400 dias; eventos recentes intactos.
- [ ] Nenhum segredo (token Tiflux) aparece no payload.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Card update: um evento ou diff por campo? | v1: `card_updated` com `payload.changed_fields[]` |
| 2 | i18n labels de event_type | mapa estático pt-BR em `lib/audit-labels.ts` |

## Specs vinculadas

- [ADR-0011](../20-architecture/ADR-0011-event-sourcing-card-events.md)
- [automations-eca.md](./automations-eca.md) (consumidor de `card_events`)
- [field-level-permissions.md](./field-level-permissions.md) (eventos field-level na F.2)

## Matriz Spec → Código → Teste

| Requisito | Código (a implementar) | Teste |
|-----------|------------------------|-------|
| Tabela append-only | `20260706100000_card_events.sql` | `32_card_events_test.sql` |
| RPC emit | `app.emit_event` | pgTAP + Vitest `emitEvent` |
| Triggers org/board | migration `*_audit_triggers.sql` | pgTAP por trigger |
| Triggers card | migration `*_audit_card_triggers.sql` | pgTAP |
| Zod payloads | `packages/contracts/src/audit-events.ts` | Vitest |
| UI list + filtros | `settings/audit/page.tsx`, `audit-log-table.tsx` | Playwright `audit-log.spec.ts` |
| pg_cron retention | migration `*_audit_retention_cron.sql` | pgTAP purge |
| Labels i18n | `lib/audit-labels.ts` | Vitest snapshot |
