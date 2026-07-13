# Deploy VPS (Traefik + Docker + GitHub Actions)

Runbook para hospedar o **Next.js** em VPS publica com HTTPS automatico. Backend **Supabase Cloud** permanece na nuvem.

Relacionado: [ci-cd.md](ci-cd.md) | [environments.md](environments.md) | [linux-lan-secure-deploy.md](linux-lan-secure-deploy.md)

---

## Arquitetura

```
[Browser] --HTTPS--> [Traefik :443] --> [Container Next.js :3000]
                                              |
                                              +--> Supabase Cloud
                                              +--> Resend / Upstash / Cloudinary
```

| Componente | Onde |
|------------|------|
| Next.js | VPS (Docker) |
| Traefik + TLS | VPS |
| Postgres / Auth / Edge Functions | Supabase Cloud |

---

## Parte 1 — VPS (1x)

### 1.1 Docker

```bash
curl -fsSL https://get.docker.com | sh
docker compose version   # v2.x
```

### 1.2 Rede compartilhada

```bash
docker network create network_public
```

### 1.3 Traefik

Copie [`deploy/traefik/docker-compose.yml`](../../deploy/traefik/docker-compose.yml) para `~/traefik/docker-compose.yml` na VPS. Ajuste o e-mail ACME.

```bash
mkdir -p ~/traefik
# cole o arquivo, edite SEU_EMAIL@dominio.com
cd ~/traefik && docker compose up -d
docker logs traefik --tail 20
```

### 1.4 Firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 1.5 DNS

Registro **A** apontando `apify.prosperfy.com.br` para o IP da VPS.

```powershell
nslookup apify.prosperfy.com.br
```

### 1.6 Chave SSH para CI

Na sua maquina (PowerShell):

```powershell
ssh-keygen -t ed25519 -C "agify-planner-cicd" -f $env:USERPROFILE\.ssh\agify-planner -N '""'
Get-Content $env:USERPROFILE\.ssh\agify-planner.pub
```

Na VPS:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... agify-planner-cicd" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Teste:

```powershell
ssh -i $env:USERPROFILE\.ssh\agify-planner root@SEU-IP-VPS
```

---

## Parte 2 — Docker Hub

1. Crie repositorio **privado**: `agify-planner-web`
2. Account Settings → Security → **New Access Token** (Read, Write, Delete)

---

## Parte 3 — GitHub Secrets

### 3.1 Repository Secrets (Settings → Secrets and variables → Actions)

| Secret | Valor |
|--------|-------|
| `REGISTRY_USER` | Username Docker Hub |
| `REGISTRY_PASS` | Access Token Docker Hub |
| `SSH_PRIVATE_KEY` | Conteudo completo de `%USERPROFILE%\.ssh\agify-planner` (privada, com BEGIN/END) |
| `VPS_HOST` | IP ou hostname da VPS |
| `VPS_PORT` | `22` |
| `VPS_USER` | Usuario SSH (`root` ou dedicado) |

### 3.2 Environment `production`

Settings → Environments → **New environment** → `production`

**Variable:**

| Nome | Valor (Prosperfy) |
|------|-------------------|
| `APP_HOST_FRONTEND` | `apify.prosperfy.com.br` |

**Secret:**

| Nome | Conteudo |
|------|----------|
| `ENV_FILE_WEB` | Arquivo `.env` completo — template: [`infra/env/prosperfy-production.env.example`](../../infra/env/prosperfy-production.env.example) |

`NEXT_PUBLIC_APP_URL` no secret deve ser `https://apify.prosperfy.com.br` (mesmo host de `APP_HOST_FRONTEND`).

> **Nao use `ENV_FILE_BACKEND`.** Esse nome e do exemplo ProsperPay (API NestJS). O Planner nao tem backend em container — so Next.js. O secret correto e **`ENV_FILE_WEB`**.

### Por que existe `ENV_FILE_WEB`?

O Next.js precisa de variaveis em **dois momentos**:

| Momento | Variaveis | O que acontece sem elas |
|---------|-----------|-------------------------|
| **Build** (GitHub Actions / Docker) | `NEXT_PUBLIC_*` | URLs Supabase/Cloudinary erradas no browser; login quebra |
| **Runtime** (container na VPS) | `RESEND_*`, `UPSTASH_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET` | Convites sem email, rate-limit off, server actions falham |

Um unico secret `ENV_FILE_WEB` alimenta os dois: o workflow monta a imagem com BuildKit secret e envia o mesmo arquivo para a VPS via `env_file` no compose.

**O que falta criar no GitHub (alem dos 6 repository secrets que voce ja fez):**

1. Environment `production` → Variable `APP_HOST_FRONTEND` = `apify.prosperfy.com.br`
2. Environment `production` → Secret `ENV_FILE_WEB` = conteudo do `.env` de producao (preencher template acima)

---

## Parte 4 — Supabase (antes do 1º deploy)

### 4.1 Migrations

No PC de dev:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

### 4.2 Auth URLs

Dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `https://apify.prosperfy.com.br`
- **Redirect URLs:** incluir `https://apify.prosperfy.com.br/**`

### 4.3 Edge Functions

Dashboard → **Edge Functions** → secrets (`CLOUDINARY_*`, etc.).

Deploy das functions (quando alteradas):

```bash
npx supabase functions deploy cloudinary-sign
npx supabase functions deploy tiflux-create-ticket
npx supabase functions deploy automation-runner
```

---

## Parte 5 — Deploy

1. Confirme checklist:
   - [ ] `docker network ls | grep network_public`
   - [ ] Traefik Up (`docker ps | grep traefik`)
   - [ ] DNS resolve para VPS
   - [ ] 6 repository secrets + environment `production` configurados
   - [ ] Repo Docker Hub `agify-planner-web` existe

2. GitHub → **Actions** → **Deploy Web** → **Run workflow**

3. Acompanhe etapas: build → push → SCP → `docker compose up`

4. Validar:

```bash
ssh root@VPS
docker ps | grep agify-planner-web
docker logs agify-planner-web --tail 30
```

```powershell
curl -I https://apify.prosperfy.com.br
```

Smoke: login, abrir board, convite por email.

---

## Troubleshooting

| Sintoma | Causa provavel | Fix |
|---------|----------------|-----|
| `network_public not found` | Rede nao criada | `docker network create network_public` |
| `invalid format` no SSH | Chave privada incompleta | Incluir linhas BEGIN/END no secret |
| 502 Bad Gateway | Container nao subiu | `docker logs agify-planner-web` |
| Login OAuth falha | Redirect URL | Ajustar Supabase Auth URLs |
| NEXT_PUBLIC_* errado no browser | Build sem env | Verificar `ENV_FILE_WEB` no secret |

Ver tambem: [`examples/deploy-automatico-v2/03-troubleshooting.md`](../../examples/deploy-automatico-v2/03-troubleshooting.md)
