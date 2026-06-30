# Gera apps/web/.env.local apontando para Supabase LOCAL (supabase start).
# Preserva TIFLUX_* e outras vars extras do .env.local existente.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root "apps\web\.env.local"
$port = 3001

Set-Location $root

. (Join-Path $PSScriptRoot "dotenv-utils.ps1")
$overridePath = Join-Path $root "apps\web\.env.local.override"

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$statusRaw = & supabase status -o env 2>&1
$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($exitCode -ne 0) {
  Write-Host "ERRO: supabase status falhou. Rode supabase start primeiro." -ForegroundColor Red
  exit 1
}

$status = @{}
foreach ($line in $statusRaw) {
  if ($line -match '^([A-Z_]+)="(.*)"$') {
    $status[$Matches[1]] = $Matches[2]
  }
}

$apiUrl = $status["API_URL"]
$anon = $status["ANON_KEY"]
$service = $status["SERVICE_ROLE_KEY"]

if (-not $apiUrl -or -not $anon) {
  Write-Host "ERRO: nao foi possivel ler API_URL/ANON_KEY do supabase status." -ForegroundColor Red
  exit 1
}

$existing = Merge-DotEnvOverride (Read-DotEnvFile $envPath) $overridePath
$extras = @()
foreach ($key in ($existing.Keys | Sort-Object)) {
  if ($key -match "^(NEXT_PUBLIC_SUPABASE_|SUPABASE_SERVICE_ROLE|NEXT_PUBLIC_APP_URL)") { continue }
  $extras += "$key=$(Format-DotEnvValue $existing[$key])"
}

$lines = @(
  "# Gerado por scripts/sync-supabase-env-local.ps1 (Supabase LOCAL) - nao commitar"
  "NEXT_PUBLIC_SUPABASE_URL=$apiUrl"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon"
  "SUPABASE_SERVICE_ROLE_KEY=$service"
  "NEXT_PUBLIC_APP_URL=http://localhost:$port"
)
if ($extras.Count -gt 0) {
  $lines += ""
  $lines += $extras
}

Set-Content -Path $envPath -Value ($lines -join "`n") -Encoding UTF8
Write-Host "OK: $envPath -> Supabase local ($apiUrl)" -ForegroundColor Green
