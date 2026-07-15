# Hospedar o Agify no Linux (LAN segura + internet)

Runbook passo a passo para **Cenário A**: servidor privado na rede interna, backend no **Supabase Cloud**, emails via **Resend**, **sem** expor o app diretamente na internet.

Relacionado: [ADR-0002](../20-architecture/ADR-0002-deployment-topology.md) | [production-email-invites.md](production-email-invites.md) | [supabase-cloud-dev.md](supabase-cloud-dev.md)

---

## O que você vai montar

```
[PCs da empresa] ──HTTPS──► [nginx :443 TLS] ──► [Next.js 127.0.0.1:3001]
                                      │
                                      ├──HTTPS──► Supabase Cloud
                                      └──HTTPS──► Resend
```

| Componente | Onde roda | Precisa instalar no Linux? |
|------------|-----------|----------------------------|
| Next.js | Servidor LAN | Sim (Node 20+) |
| nginx + TLS | Servidor LAN | Sim (recomendado) |
| Supabase | Nuvem | Não |
| Resend | Nuvem | Não (conta + API key) |
| Docker | — | Não (Cenário A) |

---

## Parte 0 — Decisões de segurança (leia antes)

1. **Nunca** publique a porta `3001` na internet (sem port-forward no roteador).
2. Use **HTTPS** na LAN (certificado interno com [mkcert](https://github.com/FiloSottile/mkcert) ou CA da empresa).
3. Next.js escuta só **`127.0.0.1:3001`**; usuários acessam o **nginx na 443**.
4. **Não** coloque `SUPABASE_SERVICE_ROLE_KEY` no servidor web — o app Next.js não usa; RLS + anon key bastam.
5. Arquivo `apps/web/.env.local` com **`chmod 600`**.
6. Configure **Upstash** para limitar convites por hora (recomendado).

Arquivos de apoio no repositório:

- `infra/nginx/agify-lan.conf.example`
- `infra/pm2/ecosystem.config.cjs`
- `infra/env/lan-production.env.example`

---

## Parte 1 — Supabase Cloud (uma vez)

### 1.1 Projeto e schema

No seu PC de desenvolvimento (Windows ou Linux):

```bash
cd /caminho/do/Planner
npm install
npx supabase login
npx supabase link --project-ref mkpjtvpstdjfmidvruor
npx supabase db push
```

### 1.2 Seed (usuário demo)

1. Abra https://supabase.com/dashboard/project/mkpjtvpstdjfmidvruor  
2. **SQL Editor** → cole o conteúdo de `supabase/seed.sql` → **Run**  
3. Login demo: `admin@nextgen.dev` / `password123`

### 1.3 Chaves API

Dashboard → **Project Settings** → **API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Guarde a anon key; **não** copie a `service_role` para o servidor web.

---

## Parte 2 — Resend (convites por email)

1. Crie conta em https://resend.com  
2. **API Keys** → crie key com *Sending access*  
3. Produção: **Domains** → verifique seu domínio (SPF/DKIM)  
4. Staging rápido: `RESEND_FROM=Agify <onboarding@resend.dev>` (emails só para a conta Resend)

---

## Parte 3 — Preparar o servidor Linux

### 3.1 Pacotes base (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y curl git nginx ufw

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # deve ser v20+
```

### 3.2 Usuário dedicado (recomendado)

```bash
sudo useradd -r -m -s /bin/bash agify
sudo mkdir -p /opt/agify
sudo chown agify:agify /opt/agify
```

### 3.3 Clonar o projeto

```bash
sudo -u agify -i
cd /opt/agify
git clone https://github.com/jeannascimento-avstecnologia/Planner.git .
npm install
```

---

## Parte 4 — TLS na LAN (mkcert)

No **servidor** (ou em máquina admin com acesso ao servidor):

```bash
# Instalar mkcert (veja https://github.com/FiloSottile/mkcert#installation)
mkcert -install

# Escolha um hostname interno (exemplo)
sudo mkdir -p /etc/ssl/agify
cd /etc/ssl/agify
sudo mkcert agify.suaempresa.local
# Gera agify.suaempresa.local.pem e agify.suaempresa.local-key.pem

sudo mv agify.suaempresa.local.pem fullchain.pem
sudo mv agify.suaempresa.local-key.pem privkey.pem
sudo chmod 600 privkey.pem
```

**DNS interno:** aponte `agify.suaempresa.local` para o IP do servidor (DNS da empresa ou arquivo `hosts` nos PCs).

---

## Parte 5 — Variáveis de ambiente

```bash
cd /opt/agify
cp infra/env/lan-production.env.example apps/web/.env.local
nano apps/web/.env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mkpjtvpstdjfmidvruor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua_anon_key>
NEXT_PUBLIC_APP_URL=https://agify.suaempresa.local
RESEND_API_KEY=re_...
RESEND_FROM=Agify <noreply@suaempresa.com>
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Proteja o arquivo:

```bash
chmod 600 apps/web/.env.local
```

---

## Parte 6 — Build do Next.js

```bash
cd /opt/agify/apps/web
npm run build
```

Sempre que mudar `NEXT_PUBLIC_*`, rode `npm run build` de novo.

---

## Parte 7 — PM2 (app só em localhost)

```bash
sudo npm install -g pm2
cd /opt/agify
pm2 start infra/pm2/ecosystem.config.cjs
pm2 save
pm2 startup   # execute o comando sudo que o PM2 imprimir
```

Teste local no servidor:

```bash
curl -I http://127.0.0.1:3001/login
```

Deve retornar `200` ou `307` — **não** deve ser acessível de outro PC em `:3001` após o firewall (próximo passo).

---

## Parte 8 — nginx (HTTPS para a LAN)

```bash
sudo cp /opt/agify/infra/nginx/agify-lan.conf.example /etc/nginx/sites-available/agify
sudo nano /etc/nginx/sites-available/agify
# Ajuste server_name, ssl_certificate* e alias /_next/static/ (APP_DIR)

sudo ln -sf /etc/nginx/sites-available/agify /etc/nginx/sites-enabled/agify
sudo nginx -t
sudo systemctl reload nginx
```

`/_next/static/` deve usar **`alias` no disco** (`.next/static/`), nao `proxy_pass` para o Next.
Proxy de static costuma devolver HTML 404 com MIME `text/html` → `ChunkLoadError` no soft-nav (`/calendar`, etc.).

---

## Parte 9 — Firewall (não expor riscos)

```bash
# Padrao: negar entrada
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (ajuste se usar outra porta)
sudo ufw allow OpenSSH

# HTTPS apenas na LAN (exemplo: rede 192.168.0.0/16)
sudo ufw allow from 192.168.0.0/16 to any port 443 proto tcp

# NAO libere 3001 para a rede — Next fica em 127.0.0.1
sudo ufw enable
sudo ufw status
```

**Roteador:** confirme que **não** há port-forward da 3001 nem da 443 para a internet pública, a menos que seja requisito explícito com WAF e política de segurança.

---

## Parte 10 — Supabase Auth (obrigatório)

Dashboard → **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|-------|
| Site URL | `https://agify.suaempresa.local` |
| Redirect URLs | `https://agify.suaempresa.local/auth/callback` |

Deve ser **idêntico** ao `NEXT_PUBLIC_APP_URL`.

---

## Parte 11 — Validar

De um **outro PC na LAN**:

1. Abra `https://agify.suaempresa.local/login`  
2. Aceite o certificado interno (mkcert nos PCs ou CA corporativa)  
3. Login: `admin@nextgen.dev` / `password123`  
4. Board → **Convidar integrante** → envie email de teste  
5. Confirme link no email: `https://agify.suaempresa.local/invite?token=...`  
6. Tente abrir `http://IP-DO-SERVIDOR:3001` de outro PC — deve **falhar** (firewall / bind localhost)

---

## Parte 12 — Atualizar versão (deploy)

```bash
sudo -u agify -i
cd /opt/agify
git pull origin main
npm install
cd apps/web
npm run build
pm2 restart agify
```

---

## Troubleshooting

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Login loop | Auth URLs ≠ `NEXT_PUBLIC_APP_URL` | Alinhar Dashboard + rebuild |
| CSS/JS não carrega | CSP / HTTPS misto | `NEXT_PUBLIC_APP_URL` com `https://` |
| Convite com `localhost` | Env antigo no build | Corrigir env + `npm run build` |
| Email não envia | Resend / domínio | Ver [production-email-invites.md](production-email-invites.md) |
| `:3001` aberto na rede | PM2 sem `-H 127.0.0.1` ou UFW | Usar `infra/pm2/ecosystem.config.cjs` |
| Avatar URL externa não aparece | CSP | Produção permite `https:` em imagens (ver `content-security-policy.ts`) |
| `Application error` após Entrar | Chunk antigo, CSP ou exceção JS | Rodar `bash scripts/diagnose-server.sh`; conferir Console sem extensões |
| `Connection closed` em `Next-Action` | Cliente/build antigo ainda usando login por Server Action | Confirmar commit/build atual; o login por senha vigente chama Supabase no browser |
| Supabase `Invalid login credentials` | Credencial incorreta | Validar usuário no Dashboard; nunca colocar senha em comando ou log |

### Spec operacional — login em produção

#### Contexto

O login por senha não deve depender do transporte RSC/Server Actions. Reverse proxies,
headers encaminhados e respostas RSC truncadas não podem impedir autenticação quando o
browser consegue alcançar o Supabase Cloud.

#### Requisitos e critérios de aceite

- O browser autentica com `createBrowserClient` e navega por carregamento completo.
- A anon key continua pública; nenhuma secret/service-role vai para o cliente.
- Cookies Supabase continuam disponíveis ao SSR; “Lembre-me” controla persistência.
- Credencial inválida retorna mensagem na página, sem HTTP 500 ou exceção no console.
- O deploy falha se env, build, PM2, chunk estático, nginx ou Supabase estiverem inválidos.
- O diagnóstico separa logs da execução atual de logs PM2 antigos.
- Playwright cobre erro de credencial e sucesso sem Server Action.

#### Não-objetivos

- Alterar Supabase Auth, RLS, usuários ou políticas multi-tenant.
- Aceitar origins extras ou relaxar CSRF.

#### Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Login sem RSC | `app/(auth)/login/page.tsx` | `e2e/login-browser-auth.spec.ts` |
| Persistência SSR | `api/auth/persistence/route.ts`, `browser-auth-cookies.ts` | `browser-auth-cookies.test.ts` |
| Diagnóstico determinístico | `scripts/diagnose-server.sh` | executado pelo deploy |

### Guia de diagnóstico completo

O deploy executa esta auditoria automaticamente. Para repetir sem rebuild:

```bash
cd /opt/agify
bash scripts/diagnose-server.sh
```

O script não recebe senha e não imprime chaves. Interprete cada falha:

1. **`codigo local difere de origin/main`**
   - Causa: deploy antigo, branch errada ou `git fetch` bloqueado.
   - Confira `git remote -v` e acesso ao GitHub. Rode novamente o deploy como `agify`.
2. **`Node 20+ obrigatorio`**
   - Causa: runtime incompatível.
   - Instale Node LTS 20+ e recrie o processo PM2.
3. **falha em `.env.local`**
   - URL deve ser `https://<project-ref>.supabase.co`.
   - anon key deve iniciar com `eyJ` ou `sb_publishable_`; nunca `sb_secret_`.
   - `NEXT_PUBLIC_APP_URL` deve ser exatamente `https://agify.avstecnologia.local`.
   - Permissão deve ser `600`; service-role deve estar ausente.
4. **`Node nao alcanca Supabase`**
   - Causa provável: DNS, proxy corporativo, firewall de saída, relógio/TLS ou chave inválida.
   - Verifique DNS e HTTPS de saída para `*.supabase.co`; não cole a chave em logs.
5. **`build antigo: login ainda registrado como Server Action`**
   - Causa: `.next` antigo ou commit antigo.
   - O deploy deve apagar `apps/web/.next`, rebuildar e falhar até o manifest novo existir.
6. **PM2/runtime divergente**
   - `PM2 offline`: processo não iniciou; veja somente logs posteriores ao horário do deploy.
   - `runtime nao corresponde ao HEAD`: PM2 serve outro diretório/build.
   - Confirme `cwd=/opt/agify/apps/web` e porta `127.0.0.1:3001`.
7. **chunk JS falhou** / **nginx calendar chunk** / **ctype=text/html**
   - Causa: build incompleto, HTML stale pos-deploy, ou nginx `proxy_pass` em `/_next/static/` (deve ser `alias` no disco).
   - Soft-nav home→`/calendar` quebra quando o chunk `app/(app)/calendar/page-*.js` 404 com HTML.
   - Não tente corrigir no browser antes de o diagnóstico ficar verde.
   - No servidor: confira `alias /opt/agify/apps/web/.next/static/;` em `/etc/nginx/sites-available/agify` e `nginx -t && systemctl reload nginx`.
8. **nginx HTTPS falhou**
   - Causa: DNS, certificado, upstream, site habilitado ou firewall.
   - Como root: `nginx -t`, `nginx -T`, `systemctl status nginx`.
9. **`POST /api/auth/persistence` ou cookie falhou**
   - Causa: build antigo, Origin/Host incorretos ou cookie inválido.
   - O esperado é HTTP 200 e `Set-Cookie: ngp-auth-persist=...`.
10. **CSP/HSTS/cache**
    - CSP precisa permitir o origin Supabase em `connect-src`.
    - HTML deve ter `Cache-Control: no-store`.
    - HSTS ausente é aviso; corrija antes de exposição fora da LAN.

#### Se todos os checks do servidor estiverem verdes e o browser falhar

Use janela anônima com extensões desativadas e DevTools → Network:

1. `/login`: HTTP 200; chunks `/_next/static/...js`: HTTP 200.
2. `https://<project>.supabase.co/auth/v1/token?grant_type=password`:
   - 200: credencial aceita.
   - 400 `invalid_credentials`: email/senha.
   - bloqueado/CORS/TLS: firewall, proxy, antivírus ou CA no computador cliente.
3. `/api/auth/persistence`: HTTP 200.
4. Navegação `/boards`: HTTP 200/307, nunca POST `/login` com `Next-Action`.
5. Console:
   - `ChunkLoadError` / MIME `text/html` em `.js`: rode diagnose; se FAIL em `nginx calendar chunk`, corrija alias nginx + redeploy. Se diagnose verde: hard refresh (Ctrl+Shift+R) ou janela anônima — HTML/RSC stale no browser.
   - erro em script de extensão: teste sem extensões.
   - CSP `connect-src`: env/build aponta para Supabase diferente.
   - certificado: instale a CA interna no computador cliente e confira o relógio.

Envie apenas: commit exibido, linhas `FAIL/WARN`, status das quatro requests e primeira
exceção do Console. Nunca envie senha, anon key completa, access token ou refresh token.

---

## Checklist final de segurança

- [ ] HTTPS na LAN (mkcert ou CA interna)
- [ ] Next.js em `127.0.0.1:3001` apenas
- [ ] Porta 3001 **não** exposta na LAN/internet
- [ ] UFW: 443 só da subnet interna
- [ ] Sem `SUPABASE_SERVICE_ROLE_KEY` no host web
- [ ] `.env.local` chmod 600
- [ ] Upstash configurado (convites)
- [ ] Resend com domínio verificado (produção)
- [ ] Supabase Auth URLs corretas
- [ ] Sem port-forward desnecessário no roteador

---

## Referência rápida de arquivos

| Arquivo | Função |
|---------|--------|
| `infra/env/lan-production.env.example` | Modelo de `.env.local` |
| `infra/pm2/ecosystem.config.cjs` | Processo Node em localhost |
| `infra/nginx/agify-lan.conf.example` | TLS + reverse proxy |
| `apps/web/lib/content-security-policy.ts` | CSP + HSTS quando HTTPS |
