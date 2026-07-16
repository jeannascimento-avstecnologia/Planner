#!/usr/bin/env bash
# Sobe Supabase local, repara volume PG, aplica seed. Fallback: Cloud.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="nextgen-planner"
SEED_EMAIL="admin@nextgen.dev"
LOCAL_API_URL="http://127.0.0.1:54321"

cd "$ROOT"

docker_ok() {
  command -v docker >/dev/null 2>&1 || return 1
  docker ps -q >/dev/null 2>&1
}

local_api_ok() {
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 3 "$LOCAL_API_URL/rest/v1/" 2>/dev/null || echo "000")
  case "$code" in
    000|000*) return 1 ;;
    *) return 0 ;;
  esac
}

try_start_docker_desktop() {
  case "$(uname -s)" in
    Darwin)
      if [ -d "/Applications/Docker.app" ]; then
        echo "==> Iniciando Docker Desktop..."
        open -a Docker >/dev/null 2>&1 || true
        return 0
      fi
      ;;
  esac
  return 1
}

wait_docker() {
  local i
  for i in $(seq 1 30); do
    if docker_ok; then
      [ "$i" -gt 1 ] && echo "==> Docker pronto."
      return 0
    fi
    [ "$i" -eq 1 ] && echo "==> Aguardando Docker Engine..."
    sleep 2
  done
  return 1
}

# Nao usar grep 'running' solto — casa com "not running".
supabase_healthy() {
  if local_api_ok; then
    return 0
  fi
  if docker_ok; then
    local db_running
    db_running=$(docker ps --filter "name=supabase_db_${PROJECT_ID}" --filter "status=running" -q 2>/dev/null || true)
    if [ -n "$db_running" ]; then
      return 0
    fi
  fi
  if command -v supabase >/dev/null 2>&1; then
    local status_text
    status_text=$(supabase status 2>&1 || true)
    if printf '%s' "$status_text" | grep -qE 'supabase local development setup is running|^API_URL=|"API_URL"'; then
      if ! printf '%s' "$status_text" | grep -qiE 'not running|exited'; then
        return 0
      fi
    fi
  fi
  return 1
}

remove_db_volume() {
  echo "==> Removendo volume DB antigo (incompatibilidade PG)..."
  supabase stop --no-backup >/dev/null 2>&1 || true
  sleep 2
  docker_ok || return 0
  local vol
  for vol in $(docker volume ls -q --filter "label=com.supabase.cli.project=${PROJECT_ID}" 2>/dev/null || true); do
    case "$vol" in
      *supabase_db*)
        docker volume rm "$vol" >/dev/null 2>&1 || true
        echo "    removido: $vol"
        ;;
    esac
  done
}

start_supabase() {
  echo "==> Subindo Supabase local..."
  local out code
  set +e
  out=$(supabase start 2>&1)
  code=$?
  set -e
  if [ "$code" -ne 0 ]; then
    if printf '%s' "$out" | grep -qiE 'incompatible with server|database files are incompatible'; then
      remove_db_volume
      set +e
      out=$(supabase start 2>&1)
      code=$?
      set -e
    fi
  fi
  if [ "$code" -ne 0 ]; then
    printf '%s\n' "$out"
    echo "ERRO: supabase start falhou."
    return 1
  fi
  return 0
}

seed_user_exists() {
  docker_ok || return 1
  local container="supabase_db_${PROJECT_ID}"
  local running
  running=$(docker ps --filter "name=$container" --filter "status=running" -q 2>/dev/null || true)
  [ -n "$running" ] || return 1
  local count
  count=$(docker exec "$container" psql -U postgres -tAc "SELECT count(*) FROM auth.users WHERE email = '${SEED_EMAIL}';" 2>/dev/null || echo "0")
  count=$(printf '%s' "$count" | tr -d '[:space:]')
  [ "$count" = "1" ]
}

ensure_migrations() {
  echo "==> Aplicando migrations pendentes (local)..."
  local out code
  set +e
  out=$(supabase migration up --local 2>&1)
  code=$?
  set -e
  if [ "$code" -ne 0 ]; then
    printf '%s\n' "$out"
    echo "ERRO: supabase migration up falhou."
    return 1
  fi
  if printf '%s' "$out" | grep -q "Applying migration"; then
    echo "==> Migrations novas aplicadas."
  else
    echo "==> Migrations locais em dia."
  fi
  return 0
}

ensure_seed() {
  if seed_user_exists; then
    echo "==> Seed OK ($SEED_EMAIL existe)."
    return 0
  fi
  if ! docker_ok; then
    echo "AVISO: nao foi possivel verificar seed (Docker CLI indisponivel)."
    return 0
  fi
  echo "==> Aplicando migrations + seed (supabase db reset)..."
  if ! supabase db reset; then
    echo "ERRO: supabase db reset falhou."
    return 1
  fi
  if ! seed_user_exists; then
    echo "ERRO: seed nao criou $SEED_EMAIL."
    return 1
  fi
  echo "==> Seed aplicado."
  return 0
}

use_cloud_fallback() {
  echo "==> Docker indisponivel - tentando Supabase Cloud..."
  bash "$ROOT/scripts/sync-supabase-env.sh" || return 1
  bash "$ROOT/scripts/seed-cloud-dev.sh" || true
  echo ""
  echo "Modo Cloud ativo. Para modo local: inicie Docker Desktop e rode npm run dev:local."
  return 0
}

# --- fluxo principal ---
if ! command -v supabase >/dev/null 2>&1; then
  echo "ERRO: supabase CLI nao encontrado."
  echo "  macOS: brew install supabase/tap/supabase"
  echo "  ou:    npm i -g supabase"
  exit 1
fi

if docker_ok; then
  :
elif local_api_ok; then
  echo "==> Supabase local respondendo em $LOCAL_API_URL (sem Docker CLI)."
elif wait_docker; then
  :
else
  try_start_docker_desktop || true
  if ! wait_docker; then
    if use_cloud_fallback; then
      exit 0
    fi
    echo ""
    echo "ERRO: Docker Engine nao responde."
    echo "  1. Abra Docker Desktop e aguarde Engine running"
    echo "  2. No terminal: docker ps"
    echo "  3. Ou configure .env.supabase e use Cloud (npm run supabase:env)"
    exit 1
  fi
fi

if ! supabase_healthy; then
  if ! start_supabase; then
    if use_cloud_fallback; then
      exit 0
    fi
    exit 1
  fi
else
  echo "==> Supabase local ja esta rodando."
fi

ensure_migrations
ensure_seed

bash "$ROOT/scripts/sync-supabase-env-local.sh"

echo "==> Login: admin@nextgen.dev / password123"
