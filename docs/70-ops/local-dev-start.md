# Subir o Planner local (guia que sempre funciona)

Runbook curto para desenvolvimento diário. Backend = **Supabase Cloud** (sem Docker). Frontend = **Next.js na porta 3001**.

Ver também: [supabase-cloud-dev.md](supabase-cloud-dev.md) (setup inicial do Cloud).

---

## Comando recomendado (1 linha)

Na raiz do repo:

```powershell
npm run dev:local
```

Isso executa [`scripts/start-dev.ps1`](../../scripts/start-dev.ps1), que:

1. Libera as portas 3000–3002 (mata dev servers antigos)
2. Remove cache `.next` se estiver corrompido
3. Valida `apps/web/.env.local` (gera via `supabase:env` se faltar)
4. Sobe `next dev -p 3001`

Abra: **http://localhost:3001/login**

Login seed (após `seed.sql` no Cloud): `admin@nextgen.dev` / `password123`

---

## Passo a passo manual (se preferir)

```powershell
cd C:\Projetos\Planner
npm run supabase:env          # só se .env.local não existir ou chaves mudaram
cd apps\web
npx next dev -p 3001
```

**Use sempre a porta 3001** — alinha com `NEXT_PUBLIC_APP_URL` e com as Auth URLs do Supabase Dashboard.

---

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

### Reset completo (último recurso)

```powershell
cd C:\Projetos\Planner
Remove-Item -Path "apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue
npm run supabase:env
npm run dev:local
```

---

## O que NÃO fazer

- Não rodar `supabase start` / Docker para dev frontend
- Não abrir vários `npm run dev` ao mesmo tempo
- Não commitar `apps/web/.env.local` nem `.env.supabase`
- Não acessar porta diferente da configurada no Supabase Auth

---

## Setup inicial (máquina nova)

Só na primeira vez — detalhes em [supabase-cloud-dev.md](supabase-cloud-dev.md):

```powershell
npm install
supabase login
supabase link --project-ref mkpjtvpstdjfmidvruor
supabase db push
npm run supabase:env
npm run dev:local
```
