#!/usr/bin/env bash
# Garante usuario seed no Supabase Cloud (admin@nextgen.dev / password123).
# Falhas sao aviso — nao bloqueiam o start.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_PATH="$ROOT/apps/web/.env.local"
SEED_EMAIL="admin@nextgen.dev"
SEED_PASSWORD="password123"
SEED_USER_ID="11111111-1111-1111-1111-111111111111"
ORG_ID="22222222-2222-2222-2222-222222222222"

# shellcheck source=dotenv-utils.sh
. "$ROOT/scripts/dotenv-utils.sh"

URL=$(dotenv_get NEXT_PUBLIC_SUPABASE_URL "$ENV_PATH" || true)
KEY=$(dotenv_get SUPABASE_SERVICE_ROLE_KEY "$ENV_PATH" || true)
ANON=$(dotenv_get NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENV_PATH" || true)

case "$URL" in
  https://*) ;;
  *)
    echo "AVISO: seed cloud ignorado (sem SERVICE_ROLE_KEY ou URL Cloud)."
    exit 0
    ;;
esac

if [ -z "$KEY" ]; then
  # tenta .env.supabase
  KEY=$(dotenv_get SUPABASE_SERVICE_ROLE_KEY "$ROOT/.env.supabase" || true)
fi

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "AVISO: seed cloud ignorado (sem SERVICE_ROLE_KEY ou URL Cloud)."
  exit 0
fi

probe_login() {
  curl -sS -o /tmp/agify-seed-probe.json -w "%{http_code}" \
    -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" 2>/dev/null || echo "000"
}

CODE=$(probe_login)
if [ "$CODE" = "200" ] && grep -q access_token /tmp/agify-seed-probe.json 2>/dev/null; then
  echo "==> Seed Cloud OK ($SEED_EMAIL)."
  exit 0
fi

echo "==> Sincronizando senha seed no Cloud..."

curl -sS -o /dev/null -w "%{http_code}" \
  -X PUT "$URL/auth/v1/admin/users/$SEED_USER_ID" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$SEED_PASSWORD\",\"email_confirm\":true}" >/tmp/agify-seed-put.code 2>/dev/null || true

PUT_CODE=$(cat /tmp/agify-seed-put.code 2>/dev/null || echo "000")
if [ "$PUT_CODE" != "200" ] && [ "$PUT_CODE" != "201" ]; then
  curl -sS -o /tmp/agify-seed-create.json -w "%{http_code}" \
    -X POST "$URL/auth/v1/admin/users" \
    -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$SEED_USER_ID\",\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"Admin Demo\"}}" \
    >/tmp/agify-seed-create.code 2>/dev/null || true
fi

curl -sS -o /dev/null \
  -X POST "$URL/rest/v1/organizations" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates" \
  -d "{\"id\":\"$ORG_ID\",\"name\":\"Acme Inc\",\"slug\":\"acme\"}" 2>/dev/null || true

curl -sS -o /dev/null \
  -X POST "$URL/rest/v1/memberships" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates" \
  -d "{\"org_id\":\"$ORG_ID\",\"user_id\":\"$SEED_USER_ID\",\"role\":\"admin\"}" 2>/dev/null || true

CODE=$(probe_login)
if [ "$CODE" = "200" ]; then
  echo "==> Seed Cloud OK ($SEED_EMAIL)."
else
  echo "AVISO: seed cloud falhou (HTTP $CODE). Rode supabase/seed.sql no SQL Editor."
fi
exit 0
