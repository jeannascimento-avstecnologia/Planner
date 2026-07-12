# CI/CD

## Pipeline (GitHub Actions)
1. Setup Node 20 + cache npm.
2. `npm ci`.
3. `npm run lint` + `npm run typecheck`.
4. `npm run test` (Vitest).
5. **DB gate (runner efemero):** `supabase start` no GitHub Actions, `supabase db reset`, pgTAP. **Nao** e o ambiente de dev do desenvolvedor — dev local usa Supabase Cloud (ADR-0002).
6. Checar `supabase gen types` (sem diff).
7. Build (`npm run build`).
8. (PR) Playwright E2E contra preview.

## Deploy

### Producao (VPS + Traefik)

- **Web:** container Docker na VPS — workflow manual [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml) (`workflow_dispatch`).
- **Proxy TLS:** Traefik + Let's Encrypt — setup 1x: [`deploy/traefik/docker-compose.yml`](../../deploy/traefik/docker-compose.yml).
- **Runbook:** [vps-deploy.md](vps-deploy.md) (secrets GitHub, SSH, Supabase prep, smoke test).
- **Registry:** Docker Hub repo `agify-planner-web`.

### Backend e dados

- **Supabase Cloud:** Postgres, Auth, RLS, Realtime, Edge Functions — **nao** sobe na VPS.
- **Migrations:** `supabase db push` (manual ou workflow futuro); **nao** Prisma/container.
- **Edge Functions:** `supabase functions deploy` + secrets no Dashboard.

### Alternativa (preview / legado)

- Vercel continua valida para preview por PR se configurada; producao principal documentada acima e VPS.

## Regras
- Migracao que nao aplica em banco zerado = build vermelho.
- pgTAP vermelho = bloqueia merge.
- Segredos de producao apenas em secrets do CI/hosting, nunca no repo.

## Dev local vs CI

| | Dev (sua maquina) | CI (GitHub runner) |
|--|-------------------|---------------------|
| Next.js | `npm run dev` | `npm run build` |
| Supabase | Cloud remoto | Docker efemero (`supabase start`) |
| Docker Desktop | Nao obrigatorio | Fornecido pelo runner |
