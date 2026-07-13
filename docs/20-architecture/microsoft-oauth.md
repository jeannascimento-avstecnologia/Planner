# Microsoft OAuth (login social — Entra ID)

## Contexto

Login e signup via conta Microsoft (Entra ID), delegado ao **Supabase Auth** (PKCE). Segredos OAuth ficam no **Supabase Dashboard** — nenhuma variável `AZURE_*` no app para login.

**Distinto** do OAuth Microsoft em `/plan` (Teams/Graph), que usa [`/api/auth/microsoft/callback`](../../apps/web/app/api/auth/microsoft/callback/route.ts) e `AZURE_CLIENT_ID` no servidor.

Specs vinculadas: [google-oauth.md](google-oauth.md), [ADR-0012](ADR-0012-microsoft-graph-teams-export.md), [local-dev-start.md](../70-ops/local-dev-start.md).

## Objetivos

- Botão "Continuar com Microsoft" em `/login` e `/signup`
- Sessão estabelecida via `/auth/callback` (existente)
- Perfil `profiles` preenchido com nome/avatar via `handle_new_user`
- Usuário novo sem org usa fluxo em `/boards` ("Crie sua organização")
- Reutilizar o mesmo App Registration Entra do Teams (redirect URI adicional no Supabase)

## Não-objetivos (MVP)

- E2E automatizado do fluxo Microsoft completo
- SAML SSO empresarial (ver [sso-saml.md](../70-ops/sso-saml.md))
- App Registration separado só para login

## Fluxo

1. Usuário clica "Continuar com Microsoft" → server action `signInWithMicrosoft`
2. `supabase.auth.signInWithOAuth({ provider: 'azure', redirectTo: APP_URL/auth/callback?next=... })`
3. Entra ID → `https://<ref>.supabase.co/auth/v1/callback`
4. Supabase → `{APP_URL}/auth/callback?code=...`
5. Route handler `exchangeCodeForSession` → redirect `/boards`
6. Trigger `handle_new_user` cria `profiles` com metadata Microsoft (`name`, `picture`)

## Requisitos

| ID | Requisito |
|----|-----------|
| R1 | Client ID/Secret Azure apenas no Supabase Dashboard (login) |
| R2 | `redirectTo` usa `NEXT_PUBLIC_APP_URL` |
| R3 | Entra redirect URI inclui `https://<ref>.supabase.co/auth/v1/callback` |
| R4 | Azure Tenant URL single-tenant no Supabase provider |
| R5 | `handle_new_user` mapeia `name`/`picture` (migration 0012) |
| R6 | Teams OAuth (`/api/auth/microsoft/callback`) inalterado |

## Critérios de aceite

- [ ] Botão visível em login e signup; inicia redirect para Microsoft
- [ ] Callback cria sessão e redireciona para `/boards`
- [ ] Novo usuário Microsoft tem `profiles.full_name` preenchido
- [ ] Nenhum secret Azure no repositório para login
- [ ] E2E smoke: botão presente em `/login` e `/signup`
- [ ] `/plan` → Conectar Microsoft (Teams) continua funcionando

## Matriz Spec → Código → Teste

| Spec | Código | Teste |
|------|--------|-------|
| R1–R4 | Supabase Dashboard + Entra (manual) | Manual |
| R2 | `auth-actions.ts` `signInWithMicrosoft` | Manual + E2E smoke |
| R5 | `0012_oauth_profile_metadata.sql` | Manual pós-login |
| R6 | `microsoft/callback/route.ts` (sem alteração) | Manual Teams |
| UI | `microsoft-sign-in-button.tsx`, login/signup | `e2e/auth.spec.ts` |
| Senha | `profile/password/*` provider azure | Manual |

## Configuração manual

Ver seção "Microsoft OAuth" em [local-dev-start.md](../70-ops/local-dev-start.md).
