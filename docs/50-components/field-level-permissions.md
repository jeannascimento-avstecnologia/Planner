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

- ~~Permissões por usuário individual~~ → **v1.1:** overrides por usuário sobre defaults de role.
- Campos customizados dinâmicos (MVP F.2: campos fixos do schema `cards`).
- UI drag-and-drop de matriz de permissões (form tabela simples).

## Requisitos

### Campos controlados (v1)

| Campo | Entidade |
|-------|----------|
| `title`, `description`, `due_date`, `start_date`, `target_date`, `priority`, `assignee_id`, `column_id`, `parent_id` | `cards` |
| `tiflux_*`, integrações | `cards` + board settings |
| `estimated_hours`, `story_points` | `cards` (prep E) |

### Modelo

**Defaults por role** — `public.field_permission_rules`:

```sql
(org_id, role, resource, field_name, access) -- access: read|write|hidden
```

**Overrides por usuário** — `public.user_field_permission_overrides`:

```sql
(org_id, user_id, resource, field_name, access)
```

Resolução efetiva (server-side): override do usuário → regra da role → `write`.

### Enforcement

1. **RPC `app.update_card_fields(card_id, patch jsonb)`** — único caminho de update parcial em views D/E.
2. Função valida cada chave do patch contra regras efetivas (`user override` + role) + `can_write_board`.
3. UPDATE direto em `cards` permanece para Kanban drag (column/order) — trigger `BEFORE UPDATE` valida colunas sensíveis se patch incluir campos restritos.
4. SELECT: views filtram colunas `hidden` no cliente; RLS não oculta coluna (complexidade) — **server components strip** campos hidden antes de serializar.

### Audit

- `field_updated` com `payload.fields[]` e valores old/new (redact description se hidden para viewer).
- `field_write_denied` quando RPC rejeita.

### UI

- `/settings/permissions` — **permisões personalizadas por usuário** (admin/owner).
- Seletor de membro + matriz editável campo × acesso (`Padrão do papel` | `Leitura` | `Edição` | `Oculto`).
- Exibir hint do default da role quando valor = padrão.

## Critérios de aceite

- [ ] Admin define override por usuário (ex.: bloquear `due_date` para membro X).
- [ ] Override persiste e prevalece sobre role no RPC.
- [ ] "Padrão do papel" remove override e restaura default da role.

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
| Tabela overrides | `*_user_field_permission_overrides.sql` | pgTAP RLS |
| UI por usuário | `settings/permissions/*`, `user-permissions-editor.tsx` | Playwright |
| Audit events | triggers + emit | pgTAP |
