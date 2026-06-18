# Supabase Cloud — desenvolvimento local

Runbook para rodar o **frontend** (`npm run dev`) apontando para um projeto **Supabase Cloud** remoto. Sem `supabase start` / Docker na sua máquina.

Ver também: [ADR-0002](../20-architecture/ADR-0002-deployment-topology.md).

## Pre-requisitos

- Node >= 20
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` ou winget/scoop)
- Conta no [Supabase Dashboard](https://supabase.com/dashboard)

## 1. Criar projeto dev no Cloud

1. Dashboard → **New project** (região próxima, senha de DB forte).
2. Anote o **Project ref** (ex: `abcdefghijklmnop` na URL `https://supabase.com/dashboard/project/abcdefghijklmnop`).

## 2. Linkar o repo

Na raiz do monorepo:

```bash
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
```

## 3. Aplicar schema (migrations)

```bash
supabase db push
```

Isso aplica todos os arquivos em `supabase/migrations/`.

## 4. Seed (dados de demo)

No **SQL Editor** do Dashboard, cole e execute o conteúdo de [`supabase/seed.sql`](../../supabase/seed.sql).

Usuário de teste após seed:

| Campo | Valor |
|-------|-------|
| Email | `admin@nextgen.dev` |
| Senha | `password123` |

## 5. Configurar Auth (URLs)

Dashboard → **Authentication** → **URL Configuration**:

| Campo | Valor (dev local) |
|-------|-------------------|
| Site URL | `http://localhost:3001` |
| Redirect URLs | `http://localhost:3001/auth/callback` |

Recomendado: `npm run dev:local` (porta 3001 fixa). Ver [local-dev-start.md](local-dev-start.md).

## 5b. Google OAuth (opcional)

1. Google Cloud → OAuth client (Web) com redirect `https://<PROJECT_REF>.supabase.co/auth/v1/callback` e origin `http://localhost:3001`.
2. Supabase → **Authentication → Providers → Google** → Enable + Client ID/Secret.
3. Spec completa: [google-oauth.md](../20-architecture/google-oauth.md).

Não é necessário variável `GOOGLE_*` no `.env` do app.

## 6. Variáveis de ambiente do app

**Opção A — arquivo `.env.supabase` (recomendado)**

```bash
cp .env.supabase.example .env.supabase
# Edite com URL e chaves do Dashboard → Settings → API
npm run supabase:env
```

**Opção B — CLI linkada**

Com `supabase link` ativo e CLI logada:

```bash
npm run supabase:env
```

O script tenta obter chaves via `supabase projects api-keys`.

## 7. Rodar o frontend

```bash
npm install
npm run dev:local
```

Abra http://localhost:3001/login e entre com o usuário seed.

## Smoke test

1. `npm run dev:local` — app em `localhost:3001`
2. Login `admin@nextgen.dev` / `password123`
3. Redireciona para `/boards` com projeto **Roadmap**
4. Abrir um board — kanban carrega cards do seed
5. (Opcional) **Continuar com Google** após configurar OAuth (seção 5b)

## Tipos TypeScript (opcional)

Após mudar schema no Cloud:

```bash
supabase gen types typescript --linked > packages/contracts/src/database.types.ts
```

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| `Invalid API key` | Rode `npm run supabase:env`; confira URL/anon no Dashboard |
| Login 500 / auth error | Rode seed; confira token columns no `auth.users` (ver `supabase/seed.sql`) |
| Redirect loop | Confira Site URL e Redirect URLs no painel Auth |
| `npm run supabase:env` falha | Crie `.env.supabase` manualmente (ver `.env.supabase.example`) |

## O que NÃO fazer

- Não commitar `.env.supabase` nem `apps/web/.env.local`
- Não colocar `SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`
- Não rodar `supabase start` para dev frontend (use Cloud)
