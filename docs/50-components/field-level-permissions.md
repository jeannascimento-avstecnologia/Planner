# F.2 — Permissões field-level

> Depende de: [audit-log.md](./audit-log.md) (eventos `field_denied`, `field_updated`).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Roles org (`owner`, `admin`, `manager`, `viewer`) e board (`can_write_board`) controlam acesso coarse-grained. B2B exige restringir campos sensíveis (ex.: `due_date`, assignee, Tiflux) por role ou por board policy.

## Objetivos

- Matriz role × campo definindo `read` | `write` | `hidden`.
- Enforcement server-side (RLS/RPC) — cliente não é fonte de verdade.
- Eventos audit quando write negado ou campo alterado sob restrição parcial.

## Não-objetivos

- Permissões por usuário individual (só por role org + override board admin).
- Campos customizados dinâmicos (MVP F.2: campos fixos do schema `cards`).
- UI drag-and-drop de matriz de permissões (form tabela simples).

## Requisitos

### Campos controlados (v1)

| Campo | Entidade |
|-------|----------|
| `title`, `description`, `due_date`, `start_date`, `priority`, `assignee_id`, `column_id`, `parent_id` | `cards` |
| `tiflux_*`, integrações | `cards` + board settings |
| `estimated_hours`, `story_points` | `cards` (prep E) |

### Modelo

Tabela `public.field_permission_rules`:

```sql
(org_id, role, resource, field_name, access) -- access: read|write|hidden
```

- Default seed por org na criação (viewer: read-only dates; manager: write all exceto delete board).
- Override por board opcional em `board_field_overrides` (fast-follow v1.1 se escopo estourar).

### Enforcement

1. **RPC `app.update_card_fields(card_id, patch jsonb)`** — único caminho de update parcial em views D/E.
2. Função valida cada chave do patch contra regras + `can_write_board`.
3. UPDATE direto em `cards` permanece para Kanban drag (column/order) — trigger `BEFORE UPDATE` valida colunas sensíveis se patch incluir campos restritos.
4. SELECT: views filtram colunas `hidden` no cliente; RLS não oculta coluna (complexidade) — **server components strip** campos hidden antes de serializar.

### Audit

- `field_updated` com `payload.fields[]` e valores old/new (redact description se hidden para viewer).
- `field_write_denied` quando RPC rejeita.

### UI

- `/settings/permissions` — matriz editável admin/owner.
- Board settings: badge "Restrições ativas" se override.

## Critérios de aceite

- [ ] Viewer não altera `due_date` via RPC nem inline table (403 + toast).
- [ ] Manager altera `due_date` com sucesso.
- [ ] Campo `hidden` não aparece no drawer para viewer.
- [ ] Alteração negada gera `field_write_denied` em `card_events`.
- [ ] pgTAP: RPC rejeita patch com campo não permitido.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Kanban move altera `column_id` — role viewer? | viewer read-only board: bloquear DnD no cliente + RPC |

## Specs vinculadas

- [views-interactive.md](./views-interactive.md)
- [audit-log.md](./audit-log.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tabela rules | `*_field_permission_rules.sql` | pgTAP RLS |
| RPC update_card_fields | `app.update_card_fields` | pgTAP + Vitest |
| Trigger cards | `*_card_field_guard.sql` | pgTAP |
| Strip hidden SSR | `lib/field-permissions.ts`, server loaders | Vitest |
| UI matriz | `settings/permissions/page.tsx` | Playwright |
| Audit events | triggers + emit | pgTAP |
