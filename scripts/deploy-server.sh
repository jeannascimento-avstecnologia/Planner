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

echo "==> Build limpo..."
rm -rf apps/web/.next
cd apps/web
npm run build
cd "$APP_DIR"

echo "==> PM2..."
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
else
  pm2 start infra/pm2/ecosystem.config.cjs
fi
pm2 save

echo "==> Health checks (localhost:$PORT)..."
for path in /login /help /plan /workload; do
  code="$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${path}" || echo '000')"
  echo "    ${path} -> HTTP ${code}"
done

echo ""
echo "OK: deploy concluido. Commit: $(git log -1 --oneline)"
echo "Se paginas novas falharem no app, rode db push no PC: npm run supabase:push"
