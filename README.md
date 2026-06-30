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

Pre-requisitos: **Node >= 20**, [Supabase CLI](https://supabase.com/docs/guides/cli), projeto no [Supabase Cloud](https://supabase.com/dashboard).

**Nao e necessario Docker** para desenvolver o frontend. O banco/auth roda no Cloud.

```bash
# 1. Dependencias
npm install

# 2. Supabase Cloud (runbook completo: docs/70-ops/supabase-cloud-dev.md)
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
# Seed: executar supabase/seed.sql no SQL Editor do Dashboard

# 3. Env do app (gera apps/web/.env.local)
cp .env.supabase.example .env.supabase   # preencher chaves do Dashboard
npm run supabase:env

# 4. App (porta 3001 fixa — ver docs/70-ops/local-dev-start.md)
npm run dev:local
```

Login de teste (apos `npm run dev:local`): `admin@nextgen.dev` / `password123` → http://localhost:3001/login

### Auth no Dashboard

Authentication → URL Configuration:

- Site URL: `http://localhost:3001`
- Redirect: `http://localhost:3001/auth/callback`

## Scripts

- `npm run dev:local` — sobe o app local (porta 3001, mitiga erros comuns).
- `npm run dev` / `build` / `lint` / `typecheck` / `test` (via Turborepo).
- `npm run format` (Prettier).
- `npm run supabase:env` — gera `apps/web/.env.local` a partir do Supabase **Cloud** (`.env.supabase` ou projeto linkado).

## CI vs dev local

| Ambiente | Supabase |
|----------|----------|
| Sua maquina (dev) | Cloud remoto |
| GitHub Actions (pgTAP) | Docker efemero (`supabase start`) no runner |

## Documentacao

- [Identidade Agify](docs/10-ux/agify-identity.md)
- [Subir local (guia confiavel)](docs/70-ops/local-dev-start.md)
- [Supabase Cloud dev](docs/70-ops/supabase-cloud-dev.md)
- [ADR-0002 — topologia web/backend](docs/20-architecture/ADR-0002-deployment-topology.md)
