#!/usr/bin/env bash
# Deploy completo Agify — um comando no servidor Linux.
# Uso: bash /opt/agify/scripts/deploy-server.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agify}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-agify}"
PORT="${PORT:-3001}"

cd "$APP_DIR"

echo "========================================"
echo " Agify deploy — $(date -Iseconds)"
echo "========================================"

echo "==> [1/6] Git pull (hard reset)..."
git fetch origin
BEFORE="$(git rev-parse --short HEAD)"
git reset --hard "origin/$BRANCH"
AFTER="$(git rev-parse --short HEAD)"
echo "    $BEFORE -> $AFTER  $(git log -1 --format='%s')"

if [ ! -f apps/web/.env.local ]; then
  echo "ERRO: apps/web/.env.local ausente. Copie infra/env/lan-production.env.example" >&2
  exit 1
fi

echo "==> [2/6] npm install..."
npm install

echo "==> [3/6] PM2 stop + liberar porta ${PORT} + build limpo..."
pm2 stop "$PM2_NAME" 2>/dev/null || true
pm2 delete "$PM2_NAME" 2>/dev/null || true
if command -v runuser >/dev/null 2>&1; then
  runuser -u agify -- pm2 kill 2>/dev/null || true
fi
for pid in $(ss -tlnp "sport = :${PORT}" 2>/dev/null | grep -oP 'pid=\K\d+' || true); do
  kill -9 "$pid" 2>/dev/null || true
done
pkill -9 -f 'next-server' 2>/dev/null || true
pkill -9 -f 'next start' 2>/dev/null || true
sleep 2
if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
  echo "ERRO: porta ${PORT} ainda em uso apos limpeza" >&2
  ss -tlnp | grep ":${PORT} " >&2 || true
  exit 1
fi
rm -rf apps/web/.next
cd apps/web
npm run build
cd "$APP_DIR"

BUILD_ID="$(cat apps/web/.next/BUILD_ID 2>/dev/null || echo 'MISSING')"
CHUNK_COUNT="$(find apps/web/.next/static/chunks -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
echo "    BUILD_ID=$BUILD_ID  chunks=$CHUNK_COUNT  commit=$AFTER"
if [ "$CHUNK_COUNT" = "0" ] || [ "$BUILD_ID" = "MISSING" ]; then
  echo "ERRO: build incompleto" >&2
  exit 1
fi

echo "==> [4/6] PM2 start (fork)..."
pm2 start infra/pm2/ecosystem.config.cjs --update-env
pm2 save
PM2_PID="$(pm2 pid "$PM2_NAME" 2>/dev/null || echo '')"
PORT_PID="$(ss -tlnp "sport = :${PORT}" 2>/dev/null | grep -oP 'pid=\K\d+' | head -1 || echo '')"
if [ -n "$PM2_PID" ] && [ -n "$PORT_PID" ] && [ "$PM2_PID" != "$PORT_PID" ]; then
  echo "ERRO: PM2 pid=${PM2_PID} difere do listener na porta ${PORT} pid=${PORT_PID}" >&2
  exit 1
fi
echo "    PM2 pid=${PM2_PID:-?} porta pid=${PORT_PID:-?}"

echo "==> [5/6] Aguardando app..."
READY=0
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/api/version" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "ERRO: app nao respondeu em 30s. pm2 logs agify --lines 40" >&2
  pm2 logs "$PM2_NAME" --lines 20 --nostream || true
  exit 1
fi

echo "==> [6/6] Validacao..."
bash scripts/diagnose-server.sh

echo ""
echo "OK deploy concluido."
echo "  Commit:  $AFTER"
echo "  BUILD:   $BUILD_ID"
echo "  Browser: Ctrl+Shift+R em https://agify.avstecnologia.local/login"
echo "  DB:      no PC rode npm run supabase:push se funcoes falharem apos login"
