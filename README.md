# Agify

SaaS B2B de produtividade e gestao de projetos (**Agify**, Prosperfy): grade ou lista na home; boards com Kanban, Timeline, Calendario e Tabela; marcadores com exclusao (admin).

SaaS B2B de produtividade e gestao de projetos: multiplos Kanbans, subtarefas e dependencias, comentarios, anexos (Cloudinary), calendario + iCal, whiteboards nativos, notificacoes inteligentes e dashboard analitico de fluxo. Multi-tenant nativo, mobile-first, offline-first.

> Antes de qualquer alteracao/implementacao, leia `docs/GUIA_MESTRE.md` e o plano ativo em `.cursor/plans/`. Metodologia: Spec-Driven Development (specs em `docs/`).

## Stack

- Frontend: Next.js 15 / React 19, TypeScript strict, Tailwind v4, TanStack Query, Zod (PWA mobile-first).
- Backend: Supabase Cloud (Postgres + Auth + RLS + Edge Functions) — **isolado** do runtime web (ADR-0002).
- Monorepo: Turborepo + npm workspaces.

## Estrutura

```
apps/web         # Next.js 15 (PWA) — so frontend
packages/config  # tsconfig/eslint/prettier compartilhados
packages/contracts # schemas Zod + tipos compartilhados
supabase/        # migrations (schema + RLS), seed, tests pgTAP
docs/            # specs (SDD) + GUIA_MESTRE
```

## Quickstart (dev local)

Pre-requisitos: **Node >= 20**, [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Supabase CLI](https://supabase.com/docs/guides/cli).

`npm run dev:local` funciona em **macOS, Linux e Windows** (scripts `.sh` / `.ps1` via `scripts/run-script.mjs`).

```bash
# 1. Dependencias
npm install

# 2. App + Supabase local (Docker) na porta 3001
#    Runbook: docs/70-ops/local-dev-start.md
npm run dev:local
```

Login de teste: `admin@nextgen.dev` / `password123` → http://localhost:3001/login

Studio: http://127.0.0.1:54323

### Alternativa: frontend + Supabase Cloud (sem Docker)

```bash
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
# Seed: supabase/seed.sql no SQL Editor
cp .env.supabase.example .env.supabase   # preencher chaves do Dashboard
npm run supabase:env
npm run dev:cloud
```

### Auth (Cloud / OAuth)

Authentication → URL Configuration:

- Site URL: `http://localhost:3001`
- Redirect: `http://localhost:3001/auth/callback`

## Scripts

- `npm run dev:local` — Supabase local (Docker) + Next na porta 3001; fallback Cloud se Docker falhar.
- `npm run dev:cloud` — Next apontando ao Supabase Cloud (OAuth Google/Microsoft).
- `npm run supabase:env` / `supabase:env:local` — gera `apps/web/.env.local`.
- `npm run dev` / `build` / `lint` / `typecheck` / `test` (via Turborepo).
- `npm run format` (Prettier).

## CI vs dev local

| Ambiente | Supabase |
|----------|----------|
| `dev:local` | Docker local (`supabase start`) |
| `dev:cloud` | Cloud remoto |
| GitHub Actions (pgTAP) | Docker efêmero no runner |

## Documentacao

- [Identidade Agify](docs/10-ux/agify-identity.md)
- [Subir local (guia confiavel)](docs/70-ops/local-dev-start.md)
- [Supabase Cloud dev](docs/70-ops/supabase-cloud-dev.md)
- [**Hospedar na LAN (Linux seguro)**](docs/70-ops/linux-lan-secure-deploy.md)
- [ADR-0002 — topologia web/backend](docs/20-architecture/ADR-0002-deployment-topology.md)
