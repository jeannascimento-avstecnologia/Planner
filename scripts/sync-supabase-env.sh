#!/usr/bin/env bash
# Sincroniza apps/web/.env.local a partir do Supabase Cloud.
# Runbook: docs/70-ops/supabase-cloud-dev.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_PATH="$ROOT/apps/web/.env.local"
OVERRIDE_PATH="$ROOT/apps/web/.env.local.override"
CLOUD_ENV="$ROOT/.env.supabase"

# shellcheck source=dotenv-utils.sh
. "$ROOT/scripts/dotenv-utils.sh"

cd "$ROOT"

get_linked_project_ref() {
  local ref_path="$ROOT/supabase/.temp/project-ref"
  if [ -f "$ref_path" ]; then
    tr -d '[:space:]' < "$ref_path"
  fi
}

get_keys_from_cli() {
  local project_ref="$1"
  [ -n "$project_ref" ] || return 1
  command -v supabase >/dev/null 2>&1 || return 1
  local json
  json=$(supabase projects api-keys --project-ref "$project_ref" -o json 2>/dev/null) || return 1
  [ -n "$json" ] || return 1

  # Extrai anon via node (sem depender de jq)
  node -e '
    const raw = process.argv[1];
    let parsed;
    try { parsed = JSON.parse(raw); } catch { process.exit(1); }
    const items = Array.isArray(parsed) ? parsed : [];
    let anon = null;
    for (const item of items) {
      const name = String(item.name || "");
      if (name === "anon" || name === "anon key") anon = item.api_key;
    }
    if (!anon) process.exit(1);
    process.stdout.write(anon);
  ' "$json"
}

API_URL=$(dotenv_get SUPABASE_URL "$CLOUD_ENV" || true)
[ -z "$API_URL" ] && API_URL=$(dotenv_get API_URL "$CLOUD_ENV" || true)
ANON=$(dotenv_get SUPABASE_ANON_KEY "$CLOUD_ENV" || true)
[ -z "$ANON" ] && ANON=$(dotenv_get ANON_KEY "$CLOUD_ENV" || true)

if [ -z "$ANON" ] || [ -z "$API_URL" ]; then
  REF=$(dotenv_get SUPABASE_PROJECT_REF "$CLOUD_ENV" || true)
  [ -z "$REF" ] && REF=$(get_linked_project_ref || true)
  if [ -n "$REF" ]; then
    CLI_ANON=$(get_keys_from_cli "$REF" || true)
    if [ -n "$CLI_ANON" ]; then
      [ -z "$API_URL" ] && API_URL="https://${REF}.supabase.co"
      [ -z "$ANON" ] && ANON="$CLI_ANON"
    fi
  fi
fi

if [ -z "$ANON" ] || [ -z "$API_URL" ]; then
  echo "ERRO: nao foi possivel obter chaves do Supabase Cloud."
  echo ""
  echo "Opcao A: copie .env.supabase.example para .env.supabase e preencha as chaves"
  echo "         (Dashboard -> Settings -> API), depois rode: npm run supabase:env"
  echo ""
  echo "Opcao B: supabase login && supabase link --project-ref <ref>"
  echo "         depois rode: npm run supabase:env"
  echo ""
  echo "Runbook: docs/70-ops/supabase-cloud-dev.md"
  exit 1
fi

APP_URL=$(dotenv_get NEXT_PUBLIC_APP_URL "$CLOUD_ENV" || true)
[ -z "$APP_URL" ] && APP_URL="http://localhost:3001"

EXTRAS=$(dotenv_merge_extras "$ENV_PATH" "$OVERRIDE_PATH" || true)

{
  echo "# Gerado por scripts/sync-supabase-env.sh (Supabase Cloud) - nao commitar"
  echo "# SERVICE_ROLE nao e necessaria no host Next.js (fica no Supabase Edge Functions)."
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON"
  echo "NEXT_PUBLIC_APP_URL=$APP_URL"
  if [ -n "$EXTRAS" ]; then
    echo ""
    printf '%s\n' "$EXTRAS"
  fi
} > "$ENV_PATH"

echo "OK: $ENV_PATH atualizado (Supabase Cloud: $API_URL)."
echo "Reinicie npm run dev se estiver rodando."
