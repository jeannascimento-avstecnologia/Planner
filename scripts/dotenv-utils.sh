#!/usr/bin/env bash
# Helpers .env (sourceado por outros scripts). Compativel com bash 3.2 (macOS).

dotenv_read_file() {
  local path="$1"
  [ -f "$path" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in
      ""|\#*) continue ;;
    esac
    case "$line" in
      *=*)
        local key="${line%%=*}"
        local val="${line#*=}"
        # trim
        key=$(printf '%s' "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        val=$(printf '%s' "$val" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        case "$val" in
          \"*\") val="${val#\"}"; val="${val%\"}" ;;
        esac
        printf '%s=%s\n' "$key" "$val"
        ;;
    esac
  done < "$path"
}

dotenv_get() {
  local want="$1"
  shift
  local f line key val
  for f in "$@"; do
    [ -f "$f" ] || continue
    while IFS= read -r line || [ -n "$line" ]; do
      [ -z "$line" ] && continue
      key="${line%%=*}"
      val="${line#*=}"
      if [ "$key" = "$want" ]; then
        printf '%s' "$val"
        return 0
      fi
    done <<EOF
$(dotenv_read_file "$f")
EOF
  done
  return 1
}

dotenv_format_value() {
  local val="$1"
  if printf '%s' "$val" | grep -qE '[[:space:]<>]'; then
    val=$(printf '%s' "$val" | sed 's/"/\\"/g')
    printf '"%s"' "$val"
  else
    printf '%s' "$val"
  fi
}

dotenv_merge_extras() {
  # Imprime KEY=formatted (exceto NEXT_PUBLIC_SUPABASE_* e NEXT_PUBLIC_APP_URL)
  # Args: env_path override_path
  local env_path="$1"
  local override_path="$2"
  local tmp
  tmp=$(mktemp)
  {
    dotenv_read_file "$env_path"
    dotenv_read_file "$override_path"
  } > "$tmp"

  # Ultima ocorrencia de cada key vence; ordena keys
  local keys
  keys=$(sed 's/=.*//' "$tmp" | LC_ALL=C sort -u)
  local key line val
  printf '%s\n' "$keys" | while IFS= read -r key; do
    [ -z "$key" ] && continue
    case "$key" in
      NEXT_PUBLIC_SUPABASE_*|NEXT_PUBLIC_APP_URL) continue ;;
    esac
    val=$(grep -E "^${key}=" "$tmp" | tail -n 1 | sed "s/^${key}=//")
    printf '%s=%s\n' "$key" "$(dotenv_format_value "$val")"
  done
  rm -f "$tmp"
}
