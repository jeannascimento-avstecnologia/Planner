# Restaura ambiente local a partir do pacote exportado pelo mentor.
# Uso (na raiz do Planner extraido): powershell -ExecutionPolicy Bypass -File scripts\restore-for-mentor.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

. (Join-Path $PSScriptRoot "dev-path.ps1")
Initialize-DevPath

$fullDump = Join-Path $root "mentor-bundle\db\full-dump.sql"
$dataDump = Join-Path $root "mentor-bundle\db\data-only.sql"
$container = "supabase_db_nextgen-planner"

function Write-Step([string]$msg) {
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-DockerEngine {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & docker ps -q 2>&1 | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  return ($code -eq 0) -and ($out -notmatch "failed to connect")
}

function Wait-Postgres {
  param([int]$MaxSeconds = 120)
  for ($i = 0; $i -lt $MaxSeconds; $i += 3) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $ok = & docker exec $container psql -U postgres -d postgres -tAc "SELECT 1" 2>$null
    $ErrorActionPreference = $prevEap
    if ($ok -match "1") { return $true }
    Start-Sleep -Seconds 3
  }
  return $false
}

Write-Step "Verificando pre-requisitos..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERRO: Node.js nao encontrado (>= 20)." -ForegroundColor Red
  exit 1
}
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "ERRO: Supabase CLI nao encontrado." -ForegroundColor Red
  exit 1
}
if (-not (Test-DockerEngine)) {
  Write-Host "ERRO: Docker Engine nao responde. Abra Docker Desktop e aguarde ficar verde." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Step "node_modules ausente — npm install..."
  & npm install
  if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
  Write-Step "node_modules presente — pulando npm install."
}

Write-Step "Subindo Supabase local (Docker)..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& supabase start 2>&1 | ForEach-Object { Write-Host $_ }
$ErrorActionPreference = $prevEap
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: supabase start falhou." -ForegroundColor Red
  exit 1
}

if (-not (Wait-Postgres)) {
  Write-Host "ERRO: Postgres nao ficou pronto a tempo." -ForegroundColor Red
  exit 1
}

if (Test-Path $fullDump) {
  Write-Step "Restaurando banco a partir de full-dump.sql..."
  Get-Content $fullDump -Raw | & docker exec -i $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: full-dump com erros (pode ser normal se objetos ja existem). Tentando data-only..." -ForegroundColor Yellow
    if (Test-Path $dataDump) {
      Get-Content $dataDump -Raw | & docker exec -i $container psql -U postgres -d postgres 2>&1 | ForEach-Object { Write-Host $_ }
    }
  }
} elseif (Test-Path $dataDump) {
  Write-Step "Restaurando somente dados (data-only.sql)..."
  Get-Content $dataDump -Raw | & docker exec -i $container psql -U postgres -d postgres 2>&1 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "AVISO: nenhum dump encontrado — usando seed padrao do supabase start." -ForegroundColor Yellow
}

Write-Step "Sincronizando .env.local com Supabase local..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "sync-supabase-env-local.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "OK — ambiente restaurado." -ForegroundColor Green
Write-Host "  Rode: npm run dev:local" -ForegroundColor Green
Write-Host "  App:  http://localhost:3001/login" -ForegroundColor Green
Write-Host "  User: admin@nextgen.dev / password123" -ForegroundColor Green
