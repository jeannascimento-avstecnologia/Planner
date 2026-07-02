# ADR-0006: Papel `owner` na organizacao

- Status: Aceito
- Data: 2026-07-02
- Relacionado: `docs/40-api/organization-management.md`, ADR-0001

## Contexto

O MVP criava org via `create_organization` com o criador como `admin`. Nao havia UI para gerenciar membros org, convites org-level, nem transferencia de propriedade. Admins podiam ser multiplos sem distincao de quem e o dono legal da org.

## Decisao

1. Adicionar `owner` ao enum `membership_role`.
2. Constraint: **exatamente 1 owner por org** (partial unique index em `memberships(org_id) WHERE role = 'owner'`).
3. Backfill: primeiro `admin` (por `created_at`) vira `owner`; demais admins permanecem `admin`.
4. `owner` e `manager` gerenciam membros/convites; `admin`/`viewer` somente leitura de membros. Apenas `owner` altera identidade da org (logo, nome, excluir, transferir).
5. `owner` nao pode sair da org sem transferir antes (`leave_organization` bloqueia).
6. JWT claim `org_owners` (uuid[]) via `custom_access_token_hook` para UI/middleware.

> Atualizado 2026-07-02: migration `20260702160000_org_rbac_tighten.sql` restringe write de memberships/invitations a owner|manager.

## Consequencias

- RLS `has_org_role(..., ['admin'])` passa a incluir `owner`.
- `create_organization` passa a inserir criador como `owner`.
- Fast-follow: seletor multi-org no header (app ainda assume `.limit(1)`).
