# Subir o Planner local (guia que sempre funciona)

Runbook curto para desenvolvimento diário. **Um comando** sobe Supabase local (Docker) + Next.js na porta **3001**.

**macOS / Linux / Windows:** `npm run dev:local` detecta o OS e roda `scripts/start-dev.sh` ou `scripts/start-dev.ps1`.

---

## Comando recomendado (1 linha)

Na raiz do repo:

```bash
npm run dev:local
```

**Pré-requisitos:**

| Item | Notas |
|------|--------|
| Node >= 20 | `brew install node@20` (macOS) |
| Docker Desktop | Engine running (icone verde) |
| Supabase CLI | `brew install supabase/tap/supabase` |

O script (`scripts/start-dev.sh` / `.ps1`):

1. Sobe **Supabase local** (`supabase start`) — repara volume PG se necessário
2. Garante seed (`admin@nextgen.dev` / `password123`)
3. Gera `apps/web/.env.local` apontando para `http://127.0.0.1:54321`
4. Sobe Next.js em http://localhost:3001

Se Docker estiver indisponível, faz **fallback** para Supabase Cloud (requer `.env.supabase` ou projeto linkado).

Abra: **http://localhost:3001/login**

| Campo | Valor |
|-------|-------|
| Email | `admin@nextgen.dev` |
| Senha | `password123` |

Studio local: http://127.0.0.1:54323

---

## Passo a passo manual (se preferir)

```bash
cd ~/Documents/Projetos/Planner   # ou path do repo
npm run supabase:env              # Cloud; ou supabase:env:local com stack Docker
cd apps/web
npx next dev -p 3001
```

**Use sempre a porta 3001** — alinha com `NEXT_PUBLIC_APP_URL` e com as Auth URLs do Supabase.

---

## Docker com UI aberta mas Engine parado

Se `docker ps` falhar com `dockerDesktopLinuxEngine` (Windows) ou connection refused (macOS):

1. Docker Desktop -> aguarde **Engine running** (verde)
2. **Troubleshoot -> Restart** (ou reinicie o app no Mac)
3. `docker ps` deve listar containers sem erro

O script tenta iniciar o Docker Desktop automaticamente e, se falhar, usa **Supabase Cloud** com seed.

## Auth URLs no Supabase (obrigatório 1x)

Dashboard → **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|-------|
| Site URL | `http://localhost:3001` |
| Redirect URLs | `http://localhost:3001/auth/callback` |

Se mudar a porta, atualize **os três**: Dashboard, `.env.local` e comando `next dev -p`.

---

## Google OAuth (dev — configurar 1x)

Segredos Google ficam no **Supabase Dashboard**, não no `.env`. Spec: [google-oauth.md](../20-architecture/google-oauth.md).

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → projeto → **OAuth consent screen** (External, scopes `email`/`profile`/`openid`; adicione seu Gmail em **Test users** se app em Testing).
2. **Credentials → Create OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3001`
   - Authorized redirect URIs: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Copie **Client ID** e **Client Secret**.

### Supabase Dashboard

1. **Authentication → Providers → Google** → Enable → cole Client ID/Secret.
2. Confirme **URL Configuration** (tabela acima).
3. (Opcional) **Skip nonce check** se erro de nonce em dev; **automatic linking** para vincular email existente.

Após `npm run dev:local`, teste em `http://localhost:3001/login` → **Continuar com Google**.

---

## Microsoft OAuth (login — configurar 1x)

Segredos ficam no **Supabase Dashboard**, não no `.env` do app (login). Spec: [microsoft-oauth.md](../20-architecture/microsoft-oauth.md).

**Requer Supabase Cloud** (`NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`). Não funciona com Supabase Docker local (`127.0.0.1:54321`) sem config extra.

**Comando dev com OAuth Microsoft/Google:**

```bash
npm run dev:cloud
```

Gera `.env.local` apontando para Cloud e sobe Next em `http://localhost:3001`. Para email/senha local sem OAuth, use `npm run dev:local`.

### Microsoft Entra ID

No App Registration existente (mesmo app do Teams, se reutilizar):

1. **Authentication → Web → Redirect URIs** — adicionar:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. Manter redirect do Teams: `{APP_URL}/api/auth/microsoft/callback`
3. **API permissions** (delegated): `User.Read` (login); Teams adiciona `Tasks.ReadWrite`, `Group.Read.All`
4. **Grant admin consent** para o tenant

### Supabase Dashboard

1. **Authentication → Providers → Azure** → Enable
2. Client ID + Client Secret do Entra
3. **Azure Tenant URL**: `https://login.microsoftonline.com/<TENANT_ID>` (single-tenant)
4. **URL Configuration**: Site URL e Redirect URLs iguais ao Google (`{APP_URL}/auth/callback`)

Teste: `http://localhost:3001/login` → **Continuar com Microsoft** (com `.env.local` apontando para Cloud).

---

## Erros comuns e como mitigar

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `ENOENT prerender-manifest.json` | Cache `.next` quebrado | `npm run dev:local` (limpa auto) ou apague `apps/web/.next` |
| `Your project's URL and Key are required` | `.env.local` sem `NEXT_PUBLIC_SUPABASE_URL` | `npm run supabase:env` e reinicie o dev |
| App em 3000/3002, login falha | Porta diferente do Auth / `APP_URL` | Use **só** `npm run dev:local` (porta 3001 fixa) |
| Vários terminais com `npm run dev` | Processos zumbis nas portas | Feche terminais ou rode `dev:local` (mata 3000–3002) |
| `missing required error components, refreshing...` | Middleware crashando (env Supabase) | Corrija `.env.local`; limpe `.next`; reinicie |
| Página não abre em `192.168.x.x` | IP de rede ≠ localhost | Use `http://localhost:3001` no browser |
| Login não entra | Seed não aplicado ou Auth URLs erradas | Rode `supabase/seed.sql` no SQL Editor; confira URLs acima |
| Google login falha / redirect_uri_mismatch | Redirect URI errada no Google Cloud | URI = `https://<ref>.supabase.co/auth/v1/callback` (não `/auth/callback` do Next) |
| Google "Access blocked" (Testing) | Email não está em Test users | Adicione seu Gmail no OAuth consent screen |
| Microsoft login falha | Supabase local ou provider Azure off | Use Supabase Cloud; habilite Azure no Dashboard |
| Microsoft redirect_uri_mismatch | URI errada no Entra | URI = `https://<ref>.supabase.co/auth/v1/callback` |

### Reset completo (último recurso)

```bash
cd ~/Documents/Projetos/Planner
rm -rf apps/web/.next
npm run supabase:env
npm run dev:local
```

---

## O que NÃO fazer

- Não abrir vários `npm run dev` / `dev:local` ao mesmo tempo
- Não commitar `apps/web/.env.local` nem `.env.supabase`
- Não acessar porta diferente da configurada no Auth (`3001`)
- Não misturar `.env.local` Cloud e Local sem regenerar (`supabase:env` vs `supabase:env:local`)

---

## Setup inicial (máquina nova)

### macOS (recomendado: Docker + Supabase local)

```bash
brew install node@20
brew install supabase/tap/supabase
# Docker Desktop: https://www.docker.com/products/docker-desktop/

cd ~/Documents/Projetos/Planner
npm install
npm run dev:local
```

### Alternativa Cloud (sem Docker)

Detalhes em [supabase-cloud-dev.md](supabase-cloud-dev.md):

```bash
npm install
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
# Seed: SQL Editor com supabase/seed.sql
cp .env.supabase.example .env.supabase   # preencher chaves
npm run supabase:env
npm run dev:cloud
```