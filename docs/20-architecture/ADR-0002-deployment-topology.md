# ADR-0002: Topologia de deploy — Web isolado do Supabase

- Status: Aceito
- Data: 2026-06-15
- Relacionado: ADR-0001, `docs/70-ops/supabase-cloud-dev.md`

## Contexto

O NextGen Planner usa Supabase como back-end (Postgres + Auth + RLS + Edge Functions). O fluxo anterior documentava `supabase start` (Docker local) na mesma máquina do `npm run dev`, o que:

- Mistura runtime web e stack de banco/auth no ambiente do desenvolvedor.
- Exige Docker Desktop para qualquer dev frontend.
- Aumenta superfície de exposição se portas locais (54321, 54322) ficarem acessíveis na rede.

O objetivo de segurança é **separar topologicamente** o frontend (Next.js) do backend (Supabase), sem substituir Supabase por API própria (ADR-0001 mantido).

## Decisão

1. **Dev local do frontend:** projeto **Supabase Cloud** dedicado (remoto). O desenvolvedor **não** roda `supabase start` / Docker local para trabalhar no app.
2. **Runtime web:** Next.js sobe apenas via `npm run dev` (ou deploy Vercel/host). Nunca no mesmo container/host que Postgres/Auth em produção.
3. **Migrations:** continuam versionadas em `supabase/migrations/`; aplicadas no Cloud via `supabase db push` após `supabase link`.
4. **CI:** GitHub Actions pode usar `supabase start` **efêmero** somente no runner para pgTAP — não é o ambiente de dev do desenvolvedor.
5. **Segredos:**
   - `SUPABASE_SERVICE_ROLE_KEY` e `CLOUDINARY_API_SECRET` **somente** server-side (nunca `NEXT_PUBLIC_*`).
   - Auth: `site_url` e redirect URLs restritos ao domínio do app no painel Supabase.
   - RLS permanece o gate principal de dados (anon key no cliente é aceitável com RLS).

## Alternativas consideradas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| `supabase start` local | Docker na máquina do dev; stack exposto localmente |
| API própria (Nest/Express) | Contraria ADR-0001; reescrita grande no MVP |
| BFF total (browser sem Supabase) | Melhoria futura; fora deste ADR |

## Consequências

- `npm run supabase:env` lê chaves do Cloud (`.env.supabase` ou CLI linkada), não `supabase status`.
- README e runbooks atualizados; Docker local opcional apenas para CI/contribuidores de schema.
- Paridade: dev Cloud → staging Cloud → prod Cloud (mesmas migrations).

## Checklist de segurança (produção)

- [ ] Next.js e Supabase em projetos/hosting separados
- [ ] `SERVICE_ROLE_KEY` ausente do bundle cliente
- [ ] URLs de Auth apontam só para domínios do app
- [ ] RLS + pgTAP verdes no CI
- [ ] (Opcional) Network Restrictions no Supabase (plano pago)
