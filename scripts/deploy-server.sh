#!/usr/bin/env bash
# Deploy Agify no servidor Linux (PM2 + Next.js production).
# Uso: bash scripts/deploy-server.sh
# Runbook: docs/70-ops/linux-lan-secure-deploy.md

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agify}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-agify}"
PORT="${PORT:-3001}"

cd "$APP_DIR"

echo "==> Repo: $APP_DIR (branch $BRANCH)"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

echo "==> Atualizando codigo..."
git fetch origin
BEFORE="$(git rev-parse HEAD)"
git reset --hard "origin/$BRANCH"
AFTER="$(git rev-parse HEAD)"
echo "    $BEFORE -> $AFTER ($(git log -1 --oneline))"

echo "==> Dependencias..."
npm install

echo "==> Parando PM2 antes do build (evita ChunkLoadError)..."
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 stop "$PM2_NAME"
fi

echo "==> Build limpo..."
rm -rf apps/web/.next
cd apps/web
npm run build
cd "$APP_DIR"

BUILD_ID="$(cat apps/web/.next/BUILD_ID 2>/dev/null || echo 'missing')"
CHUNK_COUNT="$(find apps/web/.next/static/chunks -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
echo "    BUILD_ID=$BUILD_ID chunks=$CHUNK_COUNT"
if [ "$CHUNK_COUNT" = "0" ]; then
  echo "ERRO: build sem chunks em .next/static/chunks" >&2
  exit 1
fi

echo "==> PM2 start..."
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 start "$PM2_NAME"
else
  pm2 start infra/pm2/ecosystem.config.cjs
fi
pm2 save

echo "==> Health checks (localhost:$PORT)..."
for path in /login /help /plan /workload; do
  code="$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${path}" || echo '000')"
  echo "    ${path} -> HTTP ${code}"
done

# Verifica se chunk estatico responde (nao 404)
SAMPLE_CHUNK="$(find apps/web/.next/static/chunks -name '*.js' | head -1)"
if [ -n "$SAMPLE_CHUNK" ]; then
  REL="${SAMPLE_CHUNK#apps/web/.next/}"
  chunk_code="$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/_next/${REL}" || echo '000')"
  echo "    /_next/${REL} -> HTTP ${chunk_code}"
fi

echo ""
echo "OK: deploy concluido. Commit: $(git log -1 --oneline)"
echo "No browser: Ctrl+Shift+R em https://agify.avstecnologia.local/login"
