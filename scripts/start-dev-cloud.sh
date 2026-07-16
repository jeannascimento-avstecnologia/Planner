#!/usr/bin/env bash
# Sobe Next.js (porta 3001) apontando para Supabase CLOUD — OAuth Google/Microsoft.
# Runbook: docs/70-ops/local-dev-start.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
PORT=3001
ENV_LOCAL="$WEB/.env.local"

cd "$ROOT"

stop_port() {
  local listen_port="$1"
  local pids
  pids=$(lsof -tiTCP:"$listen_port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

echo "==> Modo CLOUD: Supabase remoto (OAuth Microsoft/Google)"
echo "==> Limpando portas dev 3000-3002..."
stop_port 3000
stop_port 3001
stop_port 3002
sleep 1

bash "$ROOT/scripts/sync-supabase-env.sh"

if [ ! -f "$ENV_LOCAL" ]; then
  echo "ERRO: .env.local nao foi gerado."
  exit 1
fi

if ! grep -qE 'NEXT_PUBLIC_SUPABASE_URL=https://' "$ENV_LOCAL"; then
  echo "ERRO: .env.local nao aponta para Supabase Cloud."
  exit 1
fi

if ! grep -qE "NEXT_PUBLIC_APP_URL=http://localhost:${PORT}" "$ENV_LOCAL"; then
  echo "==> Ajustando NEXT_PUBLIC_APP_URL para porta $PORT..."
  if grep -q '^NEXT_PUBLIC_APP_URL=' "$ENV_LOCAL"; then
    sed -i.bak "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=http://localhost:${PORT}|" "$ENV_LOCAL"
  else
    echo "NEXT_PUBLIC_APP_URL=http://localhost:${PORT}" >> "$ENV_LOCAL"
  fi
  rm -f "${ENV_LOCAL}.bak"
fi

echo "OK: .env.local -> Supabase Cloud"
echo "==> Subindo Next.js em http://localhost:$PORT ..."
echo "    Login: http://localhost:$PORT/login"
echo "    Microsoft/Google OAuth: habilitados (provider no Dashboard)"
echo "    Auth URLs no Dashboard: Site + Redirect = http://localhost:$PORT/auth/callback"
echo "    Pare com Ctrl+C"
echo ""

cd "$WEB"
exec npx next dev -p "$PORT"
