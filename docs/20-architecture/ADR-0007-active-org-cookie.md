# ADR-0007: Org ativa via cookie httpOnly

- Status: Aceito
- Data: 2026-07-02
- Relacionado: ADR-0006, `docs/50-components/organizations-menu.md`

## Contexto

Usuarios podem pertencer a multiplas orgs (`memberships`). O app usava `.limit(1)` em memberships — org arbitraria. Menu "Organizacoes" exige listar todas e escolher contexto para Home/Calendario/criar projeto.

## Decisao

1. Cookie `ngp:active-org` (httpOnly, sameSite=lax, secure em prod, maxAge 1 ano).
2. Server valida cookie contra `memberships` do usuario autenticado a cada request.
3. Fallback: primeira membership por `created_at`.
4. RLS **nao** depende do cookie — apenas filtro de UI.
5. Trocar org **nao** exige re-login; opcional `refreshSession()` apos criar org nova.

## Consequencias

- JWT `org_ids` permanece lista completa (hook existente).
- Fast-follow: persistir org ativa no profile/preferences.
