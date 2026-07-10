#!/usr/bin/env bash
# Auditoria deterministica do host Agify. Nao imprime segredos.
# Uso: bash /opt/agify/scripts/diagnose-server.sh
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/agify}"
PORT="${PORT:-3001}"
HOST="${AGIFY_HOST:-agify.avstecnologia.local}"
ENV_FILE="${APP_DIR}/apps/web/.env.local"
BASE="http://127.0.0.1:${PORT}"
HTTPS="https://${HOST}"
FAILURES=0
WARNINGS=0

ok() { printf 'OK   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; FAILURES=$((FAILURES + 1)); }
warn() { printf 'WARN %s\n' "$1" >&2; WARNINGS=$((WARNINGS + 1)); }

check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then ok "$label"; else fail "$label"; fi
}

env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

printf 'Agify server diagnostic — %s\n' "$(date -Iseconds)"
printf 'Host=%s App=%s\n\n' "$HOST" "$APP_DIR"

cd "$APP_DIR" || { fail "diretorio ${APP_DIR} inacessivel"; exit 1; }

check "Git origin/main acessivel" git fetch --quiet origin main
HEAD_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
ORIGIN_COMMIT="$(git rev-parse --short origin/main 2>/dev/null || echo unknown)"
if [ "$HEAD_COMMIT" = "$ORIGIN_COMMIT" ] && [ "$HEAD_COMMIT" != "unknown" ]; then
  ok "codigo atualizado em ${HEAD_COMMIT}"
else
  fail "codigo local ${HEAD_COMMIT} difere de origin/main ${ORIGIN_COMMIT}"
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -ge 20 ]; then ok "Node $(node -v)"; else fail "Node 20+ obrigatorio"; fi

if [ ! -f "$ENV_FILE" ]; then
  fail "${ENV_FILE} ausente"
  exit 1
fi
PERMS="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo unknown)"
if [ "$PERMS" = "600" ]; then ok ".env.local com permissao 600"; else fail ".env.local permissao ${PERMS}; esperado 600"; fi

SUPABASE_URL="$(env_value NEXT_PUBLIC_SUPABASE_URL)"
ANON="$(env_value NEXT_PUBLIC_SUPABASE_ANON_KEY)"
APP_URL="$(env_value NEXT_PUBLIC_APP_URL)"

if [[ "$SUPABASE_URL" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]]; then
  ok "Supabase URL valida"
else
  fail "NEXT_PUBLIC_SUPABASE_URL invalida"
fi
if [[ "$ANON" =~ ^eyJ ]] || [[ "$ANON" =~ ^sb_publishable_ ]]; then
  ok "Supabase anon/publishable key com formato valido"
else
  fail "anon key ausente ou secret key usada no cliente"
fi
if [ "$APP_URL" = "$HTTPS" ]; then
  ok "NEXT_PUBLIC_APP_URL=${HTTPS}"
else
  fail "NEXT_PUBLIC_APP_URL deve ser ${HTTPS}"
fi
if grep -q '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE"; then
  fail "SUPABASE_SERVICE_ROLE_KEY nao pode existir no host web"
else
  ok "service-role ausente do host web"
fi

if SUPABASE_TEST_URL="$SUPABASE_URL" SUPABASE_TEST_KEY="$ANON" node <<'NODE'
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_KEY;
const timeout = AbortSignal.timeout(10_000);
fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  signal: timeout,
}).then((response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(() => process.exit(0)).catch(() => process.exit(1));
NODE
then
  ok "Node consegue autenticar a anon key no Supabase"
else
  fail "Node nao alcanca Supabase ou anon key foi rejeitada"
fi

BUILD_ID_FILE="apps/web/.next/BUILD_ID"
MANIFEST="apps/web/.next/server/server-reference-manifest.json"
if [ -s "$BUILD_ID_FILE" ]; then ok "BUILD_ID=$(tr -d '\r\n' < "$BUILD_ID_FILE")"; else fail "build Next.js ausente"; fi

if [ -f "$MANIFEST" ] && node - "$MANIFEST" <<'NODE'
const manifest = require(process.argv[2]);
const registrations = Object.values(manifest.node || {});
const legacy = registrations.some((entry) =>
  entry.exportedName === "signIn" &&
  entry.workers &&
  entry.workers["app/(auth)/login/page"]
);
process.exit(legacy ? 1 : 0);
NODE
then
  ok "login atual nao usa Server Action"
else
  fail "build antigo: login ainda registrado como Server Action"
fi

if pm2 describe agify 2>/dev/null | grep -q 'status.*online'; then
  ok "PM2 agify online"
else
  fail "PM2 agify nao esta online"
fi

VERSION_JSON="$(curl -fsS "${BASE}/api/version" 2>/dev/null || true)"
if printf '%s' "$VERSION_JSON" | grep -q "\"commit\":\"${HEAD_COMMIT}\""; then
  ok "runtime serve o commit ${HEAD_COMMIT}"
else
  fail "runtime nao corresponde ao HEAD: ${VERSION_JSON:-sem resposta}"
fi

LOGIN_HTML="$(mktemp)"
if curl -fsS "${BASE}/login" -o "$LOGIN_HTML"; then
  ok "GET localhost /login"
else
  fail "GET localhost /login"
fi

ASSET_FAILURES=0
while IFS= read -r asset; do
  if ! curl -fsS "${BASE}${asset}" -o /dev/null; then
    ASSET_FAILURES=$((ASSET_FAILURES + 1))
  fi
done < <(grep -oE 'src="/_next/[^"]+\.js[^"]*"' "$LOGIN_HTML" | cut -d'"' -f2 | sort -u)
if [ "$ASSET_FAILURES" -eq 0 ]; then ok "todos os chunks JS do login respondem 200"; else fail "${ASSET_FAILURES} chunks JS falharam"; fi

if curl -fskS "${HTTPS}/login" -o /dev/null; then ok "GET nginx HTTPS /login"; else fail "GET nginx HTTPS /login"; fi
if curl -fskS "${HTTPS}/api/version" | grep -q "\"commit\":\"${HEAD_COMMIT}\""; then
  ok "nginx aponta para o runtime atual"
else
  fail "nginx nao aponta para o runtime atual"
fi

PERSIST_HEADERS="$(curl -sS -D - -o /dev/null -X POST "${BASE}/api/auth/persistence" \
  -H "Host: ${HOST}" \
  -H "Origin: ${HTTPS}" \
  -H "Content-Type: application/json" \
  --data '{"rememberMe":false}' 2>/dev/null || true)"
if printf '%s' "$PERSIST_HEADERS" | grep -qE '^HTTP/[^ ]+ 200'; then
  ok "POST /api/auth/persistence"
else
  fail "POST /api/auth/persistence nao retornou 200"
fi
if printf '%s' "$PERSIST_HEADERS" | grep -qi '^set-cookie: ngp-auth-persist=0'; then
  ok "cookie de persistencia aceito pelo browser"
else
  fail "cookie ngp-auth-persist ausente ou invalido"
fi

HEADERS="$(curl -skSI "${HTTPS}/login" 2>/dev/null || true)"
if printf '%s' "$HEADERS" | grep -qi '^content-security-policy:'; then ok "CSP presente"; else fail "CSP ausente"; fi
if printf '%s' "$HEADERS" | grep -qi '^strict-transport-security:'; then ok "HSTS presente"; else warn "HSTS ausente"; fi
if printf '%s' "$HEADERS" | grep -qi '^cache-control:.*no-store'; then ok "HTML sem cache"; else fail "HTML pode estar em cache"; fi

rm -f "$LOGIN_HTML"

if [ "$(id -u)" -eq 0 ]; then
  check "nginx -t" nginx -t
  if nginx -T 2>/dev/null | grep -q 'proxy_set_header X-Forwarded-Host \$host'; then
    ok "nginx encaminha X-Forwarded-Host"
  else
    fail "nginx sem X-Forwarded-Host correto"
  fi
else
  warn "checks internos do nginx exigem root; rode somente se os checks HTTPS falharem"
fi

printf '\nResumo: %d falha(s), %d aviso(s)\n' "$FAILURES" "$WARNINGS"
if [ "$FAILURES" -ne 0 ]; then
  printf 'Diagnostico detalhado: docs/70-ops/linux-lan-secure-deploy.md#troubleshooting\n' >&2
  exit 1
fi
exit 0
