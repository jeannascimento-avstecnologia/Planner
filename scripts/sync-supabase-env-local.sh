#!/usr/bin/env bash
# Gera apps/web/.env.local apontando para Supabase LOCAL (supabase start).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_PATH="$ROOT/apps/web/.env.local"
OVERRIDE_PATH="$ROOT/apps/web/.env.local.override"
PORT=3001

# shellcheck source=dotenv-utils.sh
. "$ROOT/scripts/dotenv-utils.sh"

cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERRO: supabase CLI nao encontrado no PATH."
  exit 1
fi

STATUS_RAW=$(supabase status -o env 2>&1) || {
  echo "ERRO: supabase status falhou. Rode supabase start primeiro."
  echo "$STATUS_RAW"
  exit 1
}

API_URL=$(printf '%s\n' "$STATUS_RAW" | sed -n 's/^API_URL="\(.*\)"$/\1/p' | head -n 1)
ANON=$(printf '%s\n' "$STATUS_RAW" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' | head -n 1)

if [ -z "$API_URL" ] || [ -z "$ANON" ]; then
  echo "ERRO: nao foi possivel ler API_URL/ANON_KEY do supabase status."
  exit 1
fi

EXTRAS=$(dotenv_merge_extras "$ENV_PATH" "$OVERRIDE_PATH" || true)

{
  echo "# Gerado por scripts/sync-supabase-env-local.sh (Supabase LOCAL) - nao commitar"
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON"
  echo "NEXT_PUBLIC_APP_URL=http://localhost:$PORT"
  if [ -n "$EXTRAS" ]; then
    echo ""
    printf '%s\n' "$EXTRAS"
  fi
} > "$ENV_PATH"

echo "OK: $ENV_PATH -> Supabase local ($API_URL)"
