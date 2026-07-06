# F.3 — SAML / SSO (Supabase Auth)

> Épico paralelo — **sem código de app**; config + runbook ops.  
> **Gate SDD:** implementação = config Supabase Dashboard + validação login.

## Contexto

Clientes enterprise exigem SSO via IdP SAML 2.0. Supabase Auth suporta SAML nativamente (Pro plan+). NextGen Planner delega identidade ao Supabase — app só consome sessão JWT existente.

## Objetivos

- Documentar setup IdP ↔ Supabase para org enterprise.
- Fluxo: usuário escolhe "Entrar com SSO" → redirect IdP → callback Supabase → app `/boards`.
- Mapear grupos IdP → role org (manual v1 ou SCIM fast-follow).

## Não-objetivos

- SCIM provisioning automático.
- Multi-IdP por org na v1.
- Custom login UI por tenant (usa Supabase hosted SSO).
- LDAP direto (usar IdP intermediário).

## Requisitos

### Supabase Dashboard

1. Authentication → Providers → SAML 2.0.
2. Registrar `metadata_url` ou XML do IdP (Okta, Azure AD, Google Workspace).
3. Attribute mapping: `email`, `name` → `profiles`.
4. `SAML_ALLOWED_AUDIENCES` / redirect URLs: `{APP_URL}/auth/callback`.

### App (mínimo)

- Botão "SSO empresarial" em `/login` → `supabase.auth.signInWithSSO({ domain: 'empresa.com' })` ou link magic por org slug.
- Env: `NEXT_PUBLIC_SSO_ENABLED=true` feature flag.
- Pós-login: mesmo fluxo `Custom Access Token Hook` (org_id no JWT).

### Org binding

- Tabela `org_sso_domains (org_id, domain unique)` — admin registra domínios permitidos.
- Hook pós-auth: se email domain ∈ table → auto-join ou reject.

### Runbook

- Rotação certificado IdP.
- Troubleshoot `SAML assertion invalid`.
- Desprovisionamento manual (remover membership).

## Critérios de aceite

- [ ] Usuário `@empresa.com` login SSO cria sessão e acessa board.
- [ ] Domínio não registrado → erro claro.
- [ ] Documentação passo-a-passo revisada por ops.
- [ ] JWT contém `org_id` após hook (teste staging).

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Auto-provision vs invite-only | invite-only v1 (segurança) |

## Specs vinculadas

- [GUIA_MESTRE.md](../GUIA_MESTRE.md) § Auth
- [google-oauth.md](../20-architecture/google-oauth.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| org_sso_domains | `*_org_sso_domains.sql` | pgTAP |
| Login button | `login/page.tsx` flag | Playwright staging |
| Domain hook | Auth hook SQL | manual |
| Runbook | este doc + checklist | ops sign-off |
