# ADR-0012: Export Microsoft Teams via Graph API

## Status

Aceito — E.2 MVP

## Contexto

Planner Microsoft aposenta iCal (2026). Clientes enterprise usam Teams/Planner. Export one-way complementa nosso iCal nativo.

## Decisão

- OAuth 2.0 delegated flow; callback via Edge Function.
- Tokens em `user_microsoft_tokens` (pgcrypto, RLS deny).
- Config org em `org_teams_integrations` (sem segredos de usuário).
- Export via Edge Function `export-plan-to-teams` com service_role para tokens.
- Modo MVP: 1 Planner task por card (start/due do plano).

## Consequências

- Requer Azure AD app registration + admin consent.
- Premium Planner não acessível via Graph — documentar limitação.
- Feature flag implícita: org sem config → botão export desabilitado.
