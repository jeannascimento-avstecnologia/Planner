#!/usr/bin/env bash
# Corrige nginx Agify — rodar como ROOT.
# Uso: bash /opt/agify/scripts/fix-nginx-agify.sh
set -euo pipefail

HOST="${AGIFY_HOST:-agify.avstecnologia.local}"
SITE="/etc/nginx/sites-available/agify"
MAP="/etc/nginx/conf.d/agify-connection-map.conf"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERRO: execute como root (usuario agify nao tem sudo)." >&2
  exit 1
fi

if [ ! -f "$SITE" ]; then
  cp /opt/agify/infra/nginx/agify-lan.conf.example "$SITE"
fi

cat > "$MAP" <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

sed -i "s/agify\\.suaempresa\\.local/${HOST}/g" "$SITE"
sed -i 's/proxy_set_header Connection "upgrade";/proxy_set_header Connection $connection_upgrade;/g' "$SITE"

grep -q 'X-Forwarded-Host' "$SITE" || \
  sed -i '/proxy_set_header X-Forwarded-Proto/a\        proxy_set_header X-Forwarded-Host $host;' "$SITE"

grep -q 'proxy_buffering off' "$SITE" || \
  sed -i '/proxy_set_header X-Forwarded-Host/a\        proxy_buffering off;' "$SITE"

grep -q 'proxy_request_buffering off' "$SITE" || \
  sed -i '/proxy_buffering off/a\        proxy_request_buffering off;' "$SITE"

ln -sf "$SITE" /etc/nginx/sites-enabled/agify
nginx -t
systemctl reload nginx

echo "OK nginx server_name=${HOST}"
grep server_name "$SITE" | head -2
