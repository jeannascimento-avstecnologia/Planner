#!/usr/bin/env bash
# Sobe Supabase local + Next.js (porta 3001). Um comando: npm run dev:local
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

echo "==> Limpando portas dev 3000-3002..."
stop_port 3000
stop_port 3001
stop_port 3002
sleep 1

if [ -d "$WEB/.next" ]; then
  echo "==> Limpando .next (evita chunks stale)..."
  rm -rf "$WEB/.next"
fi

bash "$ROOT/scripts/ensure-supabase-local.sh"

if [ ! -f "$ENV_LOCAL" ]; then
  echo "ERRO: .env.local nao foi gerado."
  exit 1
fi

if grep -qE 'NEXT_PUBLIC_SUPABASE_URL=http://127\.0\.0\.1:54321' "$ENV_LOCAL"; then
  IS_LOCAL=1
elif grep -qE 'NEXT_PUBLIC_SUPABASE_URL=https://' "$ENV_LOCAL"; then
  IS_LOCAL=0
else
  echo "ERRO: .env.local sem NEXT_PUBLIC_SUPABASE_URL valido."
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

echo "==> Subindo Next.js em http://localhost:$PORT ..."
echo "    Login: http://localhost:$PORT/login"
if [ "$IS_LOCAL" -eq 1 ]; then
  echo "    Supabase Studio: http://127.0.0.1:54323"
  echo "    Credenciais: admin@nextgen.dev / password123"
else
  echo "    Modo Cloud - confira seed em supabase/seed.sql se login falhar"
fi
echo "    Pare com Ctrl+C"
echo ""

cd "$WEB"
exec npx next dev -p "$PORT"
