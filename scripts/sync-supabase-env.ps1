# Sincroniza apps/web/.env.local a partir do Supabase Cloud.
# Nao requer Docker nem `supabase start`.
# Runbook: docs/70-ops/supabase-cloud-dev.md

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Read-DotEnvFile([string]$Path) {
  $vars = @{}
  if (-not (Test-Path $Path)) { return $vars }
  Get-Content $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -match "^([^#=]+)=(.*)$") {
      $vars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
    }
  }
  return $vars
}

function Get-LinkedProjectRef {
  $refPath = Join-Path $root "supabase\.temp\project-ref"
  if (Test-Path $refPath) {
    return (Get-Content $refPath -Raw).Trim()
  }
  return $null
}

function Get-KeysFromCli([string]$ProjectRef) {
  if (-not $ProjectRef) { return $null }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $json = & supabase projects api-keys --project-ref $ProjectRef -o json 2>$null
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($exitCode -ne 0 -or -not $json) { return $null }

  try {
    $parsed = $json | ConvertFrom-Json
    $anon = $null
    $service = $null
    foreach ($item in $parsed) {
      if ($item.name -eq "anon" -or $item.name -eq "anon key") { $anon = $item.api_key }
      if ($item.name -eq "service_role" -or $item.name -eq "service_role key") { $service = $item.api_key }
    }
    if (-not $anon) { return $null }
    return @{
      API_URL = "https://$ProjectRef.supabase.co"
      ANON_KEY = $anon
      SERVICE_ROLE_KEY = $service
    }
  } catch {
    return $null
  }
}

# --- 1) .env.supabase na raiz ---
$cloudEnv = Read-DotEnvFile (Join-Path $root ".env.supabase")
$apiUrl = $cloudEnv["SUPABASE_URL"]
if (-not $apiUrl) { $apiUrl = $cloudEnv["API_URL"] }
$anon = $cloudEnv["SUPABASE_ANON_KEY"]
if (-not $anon) { $anon = $cloudEnv["ANON_KEY"] }
$service = $cloudEnv["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $service) { $service = $cloudEnv["SERVICE_ROLE_KEY"] }

# --- 2) CLI linkada ---
if (-not $anon -or -not $apiUrl) {
  $ref = $cloudEnv["SUPABASE_PROJECT_REF"]
  if (-not $ref) { $ref = Get-LinkedProjectRef }
  $cliKeys = Get-KeysFromCli $ref
  if ($cliKeys) {
    if (-not $apiUrl) { $apiUrl = $cliKeys.API_URL }
    if (-not $anon) { $anon = $cliKeys.ANON_KEY }
    if (-not $service) { $service = $cliKeys.SERVICE_ROLE_KEY }
  }
}

if (-not $anon -or -not $apiUrl) {
  Write-Host "ERRO: nao foi possivel obter chaves do Supabase Cloud." -ForegroundColor Red
  Write-Host ""
  Write-Host "Opcao A: copie .env.supabase.example para .env.supabase e preencha as chaves"
  Write-Host "         (Dashboard -> Settings -> API), depois rode: npm run supabase:env"
  Write-Host ""
  Write-Host "Opcao B: supabase login && supabase link --project-ref <ref>"
  Write-Host "         depois rode: npm run supabase:env"
  Write-Host ""
  Write-Host "Runbook: docs/70-ops/supabase-cloud-dev.md"
  exit 1
}

$appUrl = $cloudEnv["NEXT_PUBLIC_APP_URL"]
if (-not $appUrl) { $appUrl = "http://localhost:3001" }

$envPath = Join-Path $root "apps\web\.env.local"
$content = @"
# Gerado por scripts/sync-supabase-env.ps1 (Supabase Cloud) - nao commitar
NEXT_PUBLIC_SUPABASE_URL=$apiUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service
NEXT_PUBLIC_APP_URL=$appUrl
"@

Set-Content -Path $envPath -Value $content -Encoding UTF8
Write-Host "OK: $envPath atualizado (Supabase Cloud: $apiUrl)." -ForegroundColor Green
Write-Host "Reinicie npm run dev se estiver rodando."
