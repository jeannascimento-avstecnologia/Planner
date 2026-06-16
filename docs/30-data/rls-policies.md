# Politicas RLS

## Helpers (SECURITY DEFINER, search_path travado)
- `app.current_org_ids()` -> uuid[] das orgs do usuario (via memberships).
- `app.is_org_member(org uuid)` -> boolean.
- `app.has_org_role(org uuid, roles text[])` -> boolean (RBAC).
- `app.can_access_board(board uuid)` -> boolean (org member OU board_members).

## Padrao por tabela de tenant
- SELECT: `app.is_org_member(org_id)` (ou `app.can_access_board(board_id)` em tabelas de board).
- INSERT/UPDATE/DELETE: `app.has_org_role(org_id, array['admin'])` (viewer = read-only).
- `card_events`: INSERT permitido a membros; UPDATE/DELETE negados a todos (append-only).

## Exemplo
```sql
alter table public.cards enable row level security;

create policy cards_select on public.cards
for select using (app.can_access_board(board_id));

create policy cards_write on public.cards
for all using (app.has_org_role(org_id, array['admin']))
with check (app.has_org_role(org_id, array['admin']));
```

## Performance
- Indices em `org_id`, `board_id`, FKs.
- `(select auth.uid())` em subselect para initplan cache.
- Claims (`org_ids`/`roles`) no JWT evitam JOIN por linha (fase 2 do hook).

## Testes (pgTAP) - criterios
- Membro de A nao le/escreve dados de B.
- Viewer recebe erro em INSERT/UPDATE/DELETE.
- UPDATE/DELETE em `card_events` sempre falham.
