# Google OAuth (login social)

## Contexto

Login e signup via conta Google, delegado ao **Supabase Auth** (PKCE). Segredos OAuth ficam no Supabase Dashboard — nenhuma variável `GOOGLE_*` no app.

Specs vinculadas: [multitenancy-security.md](multitenancy-security.md), [local-dev-start.md](../70-ops/local-dev-start.md).

## Objetivos

- Botão "Continuar com Google" em `/login` e `/signup`
- Sessão estabelecida via `/auth/callback` (já existente)
- Perfil `profiles` preenchido com nome e avatar do Google
- Usuário novo sem org usa fluxo existente em `/boards` ("Crie sua organização")

## Não-objetivos (MVP)

- Login com outros providers (GitHub)
- Onboarding de org em página dedicada
- E2E automatizado do fluxo Google completo

Login Microsoft: [microsoft-oauth.md](microsoft-oauth.md).

## Fluxo

1. Usuário clica "Continuar com Google" → server action `signInWithGoogle`
2. `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: APP_URL/auth/callback?next=/boards })`
3. Google → `https://<ref>.supabase.co/auth/v1/callback`
4. Supabase → `http://localhost:3001/auth/callback?code=...`
5. Route handler `exchangeCodeForSession` → redirect `/boards`
6. Trigger `handle_new_user` cria `profiles` com metadata Google

## Requisitos

| ID | Requisito |
|----|-----------|
| R1 | Client ID/Secret Google apenas no Supabase Dashboard |
| R2 | `redirectTo` usa `NEXT_PUBLIC_APP_URL` (dev: porta 3001) |
| R3 | `handle_new_user` mapeia `name`/`picture` do Google |
| R4 | Sem org → card inline em `/boards` (sem migration de memberships) |

## Critérios de aceite

- [ ] Botão visível em login e signup; inicia redirect para Google
- [ ] Callback cria sessão e redireciona para `/boards`
- [ ] Novo usuário Google tem `profiles.full_name` e `profiles.avatar_url`
- [ ] Nenhum secret Google no repositório
- [ ] E2E smoke: botão presente em ambas as páginas

## Matriz Spec → Código → Teste

| Spec | Código | Teste |
|------|--------|-------|
| R1 | Supabase Dashboard (manual) | — |
| R2 | `auth-actions.ts` `signInWithGoogle` | Manual + E2E smoke |
| R3 | `0012_oauth_profile_metadata.sql` | Manual pós-login |
| R4 | `boards/page.tsx` (existente) | Manual |
| UI | `google-sign-in-button.tsx`, login/signup pages | `e2e/auth.spec.ts` |

## Configuração manual (dev)

Ver seções "Google OAuth" em [local-dev-start.md](../70-ops/local-dev-start.md) e [supabase-cloud-dev.md](../70-ops/supabase-cloud-dev.md).
