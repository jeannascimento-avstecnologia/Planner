#!/usr/bin/env bash
# Diagnostico POST login (Server Action real) — rode no servidor como agify.
# Uso: bash /opt/agify/scripts/probe-login-post.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agify}"
PORT="${PORT:-3001}"
HOST="${HOST:-agify.avstecnologia.local}"
BASE="http://127.0.0.1:${PORT}"
HTTPS="https://${HOST}"
MANIFEST="${APP_DIR}/apps/web/.next/server/server-reference-manifest.json"

cd "$APP_DIR"

if [ ! -f "$MANIFEST" ]; then
  echo "ERRO: build ausente ($MANIFEST). Rode bash scripts/deploy-server.sh" >&2
  exit 1
fi

ACTION="$(node -e "
const m = require(process.argv[1]);
for (const [id, v] of Object.entries(m.node || {})) {
  if (v.exportedName === 'signIn' && v.workers && v.workers['app/(auth)/login/page']) {
    process.stdout.write(id);
    process.exit(0);
  }
}
process.exit(1);
" "$MANIFEST")"

echo "==> signIn Next-Action id: ${ACTION}"

FORM_BODY=$'------AgifyTest\r\nContent-Disposition: form-data; name="email"\r\n\r\ntest@test.com\r\n------AgifyTest\r\nContent-Disposition: form-data; name="password"\r\n\r\nwrongpass\r\n------AgifyTest\r\nContent-Disposition: form-data; name="rememberMe"\r\n\r\ntrue\r\n------AgifyTest--\r\n'

post_probe() {
  local label="$1"
  local url="$2"
  local extra=("${@:3}")
  local code body
  body="$(mktemp)"
  code="$(curl -s -o "$body" -w '%{http_code}' -X POST "$url" \
    -H "Origin: https://${HOST}" \
    -H "Accept: text/x-component" \
    -H "Next-Router-State-Tree: %5B%22%22%2C%7B%7D%5D" \
    -H "Next-Action: ${ACTION}" \
    -H "Content-Type: multipart/form-data; boundary=----AgifyTest" \
    "${extra[@]}" \
    --data-binary "$FORM_BODY")"
  echo "==> ${label}: HTTP ${code}"
  head -c 400 "$body" || true
  echo ""
  if grep -q 'redirectTo' "$body" 2>/dev/null; then
    echo "    OK: resposta contem redirectTo (login sucesso)"
  elif grep -q 'Email ou senha' "$body" 2>/dev/null; then
    echo "    OK: erro de credencial retornado (action executou)"
  fi
  rm -f "$body"
  # 200/303/404/500 = Next.js respondeu; 502/000 = proxy/upstream quebrado
  if [ "$code" = "502" ] || [ "$code" = "000" ]; then
    return 1
  fi
  return 0
}

echo "==> POST /login sem Next-Action (esperado 405)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "${BASE}/login" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -H "Accept: text/x-component" \
  -H "Next-Router-State-Tree: %5B%22%22%2C%7B%7D%5D" \
  -d '[]'

if [ -f "${APP_DIR}/apps/web/app/api/debug/auth-probe/route.ts" ] || curl -sf "${BASE}/api/debug/auth-probe" >/dev/null 2>&1; then
  echo "==> GET /api/debug/auth-probe"
  curl -sf "${BASE}/api/debug/auth-probe" | head -c 500 || echo "(rota ausente — faca git pull)"
  echo ""
fi

FAIL=0
post_probe "POST /login + Next-Action (localhost)" "${BASE}/login" || FAIL=1
post_probe "POST /login + Next-Action (nginx HTTPS)" "${HTTPS}/login" -k || FAIL=1

echo "==> pm2 (ultimas 20 linhas error)"
pm2 logs agify --lines 20 --nostream 2>/dev/null | tail -25 || true

if [ "$FAIL" != "0" ]; then
  echo ""
  echo "502 detectado no POST com Next-Action. Como ROOT, durante o teste:" >&2
  echo "  tail -30 /var/log/nginx/error.log" >&2
  exit 1
fi

echo ""
echo "OK: POST com Next-Action nao retornou 502. Se o browser ainda falha, compare Next-Action do DevTools com: ${ACTION}"
