# Exporta pacote completo para revisao do mentor (codigo + node_modules + dump DB).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/export-for-mentor.ps1
# Saida: Desktop\Planner-mentor-review.rar (ou .7z se WinRAR ausente)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

. (Join-Path $PSScriptRoot "dev-path.ps1")
Initialize-DevPath

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$desktop = [Environment]::GetFolderPath("Desktop")
$exportDir = Join-Path $root "exports"
if (-not (Test-Path $exportDir)) { New-Item -ItemType Directory -Path $exportDir -Force | Out-Null }
$staging = Join-Path $env:TEMP "Planner-mentor-export-$stamp"
$bundleRoot = Join-Path $staging "Planner"
$dbDir = Join-Path $bundleRoot "mentor-bundle\db"
$archiveBase = Join-Path $exportDir "Planner-mentor-review-$stamp"

function Write-Step([string]$msg) {
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Get-ArchiveTool {
  $winrar = "C:\Program Files\WinRAR\WinRAR.exe"
  if (Test-Path $winrar) { return @{ Type = "rar"; Path = $winrar } }
  $seven = "C:\Program Files\7-Zip\7z.exe"
  if (Test-Path $seven) { return @{ Type = "7z"; Path = $seven } }
  return $null
}

function New-SanitizedEnvLocal([string]$destPath) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $statusRaw = & supabase status -o env 2>&1
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -ne 0) {
    throw "supabase status falhou. Rode 'supabase start' antes do export."
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
    throw "Nao foi possivel ler chaves do Supabase local."
  }

  $lines = @(
    '# Gerado por scripts/export-for-mentor.ps1 - chaves LOCAIS (demo), sem segredos de producao'
    "NEXT_PUBLIC_SUPABASE_URL=$apiUrl"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon"
    'NEXT_PUBLIC_APP_URL=http://localhost:3001'
    "SUPABASE_SERVICE_ROLE_KEY=$service"
    ''
    '# Integracoes opcionais (preencher se quiser testar email/Tiflux):'
    '# RESEND_API_KEY='
    '# RESEND_FROM=Agify onboarding@resend.dev'
    '# TIFLUX_API_URL=https://api.tiflux.com/api/v2'
    '# TIFLUX_API_TOKEN='
  )
  $dir = Split-Path -Parent $destPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -Path $destPath -Value ($lines -join "`n") -Encoding UTF8
}

Write-Step "Preparando staging: $staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $bundleRoot -Force | Out-Null
New-Item -ItemType Directory -Path $dbDir -Force | Out-Null

Write-Step "Verificando Supabase local..."
$apiOk = $false
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:54321/rest/v1/" -UseBasicParsing -TimeoutSec 5
  $apiOk = $r.StatusCode -ge 200
} catch { $apiOk = $false }
if (-not $apiOk) {
  Write-Host "ERRO: Supabase local nao responde em :54321. Rode: supabase start" -ForegroundColor Red
  exit 1
}

Write-Step "Exportando dump do banco (schema + dados)..."
$fullDump = Join-Path $dbDir "full-dump.sql"
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& supabase db dump -f $fullDump 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: supabase db dump falhou." -ForegroundColor Red
  exit 1
}

Write-Step "Exportando dump somente dados (restore rapido)..."
$dataDump = Join-Path $dbDir "data-only.sql"
& supabase db dump --data-only -f $dataDump 2>&1 | ForEach-Object { Write-Host $_ }
$ErrorActionPreference = $prevEap
if ($LASTEXITCODE -ne 0) {
  Write-Host "AVISO: data-only dump falhou; mentor usara full-dump.sql" -ForegroundColor Yellow
}

Write-Step "Copiando projeto (inclui node_modules, exclui segredos e caches)..."
$robolog = Join-Path $staging "robocopy.log"
$robocode = 0
& robocopy $root $bundleRoot /E /XD .git .next .turbo dist build out coverage playwright-report test-results supabase\.branches supabase\.temp .cursor /XF .env.local .env.supabase Thumbs.db *.log /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$robocode = $LASTEXITCODE
if ($robocode -ge 8) {
  Write-Host "ERRO: robocopy falhou (codigo $robocode). Ver $robolog" -ForegroundColor Red
  exit 1
}

Write-Step "Gerando .env.local sanitizado (sem API keys de producao)..."
New-SanitizedEnvLocal (Join-Path $bundleRoot "apps\web\.env.local")

Write-Step "Copiando scripts de restore..."
Copy-Item (Join-Path $PSScriptRoot "restore-for-mentor.ps1") (Join-Path $bundleRoot "scripts\restore-for-mentor.ps1") -Force

$gitHash = "unknown"
$gitBranch = "unknown"
if (Test-Path (Join-Path $root ".git")) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $gitHash = (& git -C $root rev-parse --short HEAD 2>$null)
  $gitBranch = (& git -C $root branch --show-current 2>$null)
  $ErrorActionPreference = $prevEap
  if (-not $gitHash) { $gitHash = "unknown" }
  if (-not $gitBranch) { $gitBranch = "unknown" }
}

$generatedAt = Get-Date -Format 'yyyy-MM-dd HH:mm'
$setupMd = @'
# Planner - pacote para revisao do mentor

Gerado em: GENERATED_AT
Commit: GIT_HASH (branch: GIT_BRANCH)

## Pre-requisitos (instalar 1x)

1. Node.js >= 20 - https://nodejs.org/
2. Docker Desktop - https://www.docker.com/products/docker-desktop/
3. Supabase CLI - https://supabase.com/docs/guides/cli

## Subir tudo (1 comando)

Na pasta extraida Planner:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-for-mentor.ps1
```

Depois:

```powershell
npm run dev:local
```

| Item | URL |
|------|-----|
| App | http://localhost:3001/login |
| Supabase Studio | http://127.0.0.1:54323 |
| Login teste | admin@nextgen.dev / password123 |

## Conteudo do pacote

- Codigo fonte + node_modules (offline)
- mentor-bundle/db/full-dump.sql - schema + dados do banco local
- mentor-bundle/db/data-only.sql - somente dados (restore apos migrations)
- .env.local sanitizado (chaves demo Supabase local, sem Resend/Tiflux de producao)

## Docs do projeto

- docs/GUIA_MESTRE.md
- docs/70-ops/local-dev-start.md

## Observacoes

- Docker Desktop nao vem no pacote; o CLI baixa imagens no primeiro supabase start.
- Segredos de producao (Resend, Tiflux, Cloudinary) foram removidos por seguranca.
'@ -replace 'GENERATED_AT', $generatedAt -replace 'GIT_HASH', $gitHash -replace 'GIT_BRANCH', $gitBranch

Set-Content -Path (Join-Path $bundleRoot "SETUP_MENTOR.md") -Value $setupMd -Encoding UTF8

$manifest = @{
  generatedAt = (Get-Date).ToString("o")
  gitCommit   = $gitHash
  gitBranch   = $gitBranch
  nodeVersion = (node -v 2>$null)
  supabaseCli = (supabase --version 2>$null)
  dumps       = @("mentor-bundle/db/full-dump.sql", "mentor-bundle/db/data-only.sql")
} | ConvertTo-Json -Depth 4

Set-Content -Path (Join-Path $bundleRoot "mentor-bundle\MANIFEST.json") -Value $manifest -Encoding UTF8

$tool = Get-ArchiveTool
if (-not $tool) {
  Write-Host "ERRO: WinRAR ou 7-Zip necessario para compactar." -ForegroundColor Red
  Write-Host "Staging disponivel em: $staging" -ForegroundColor Yellow
  exit 1
}

if ($tool.Type -eq "rar") {
  $archive = "$archiveBase.rar"
  Write-Step "Compactando RAR (pode demorar varios minutos)..."
  if (Test-Path $archive) { Remove-Item $archive -Force }
  $winrarArgs = @("a", "-r", "-m5", "-ep1", $archive, $bundleRoot)
  $proc = Start-Process -FilePath $tool.Path -ArgumentList $winrarArgs -Wait -PassThru -NoNewWindow
  if ($proc.ExitCode -ne 0) { throw "WinRAR falhou (exit $($proc.ExitCode))" }
  $waited = 0
  while (-not (Test-Path $archive) -and $waited -lt 30) {
    Start-Sleep -Seconds 1
    $waited++
  }
  if (-not (Test-Path $archive)) { throw "Arquivo RAR nao foi criado: $archive" }
} else {
  $archive = "$archiveBase.7z"
  Write-Step "WinRAR ausente - compactando .7z (7-Zip)..."
  if (Test-Path $archive) { Remove-Item $archive -Force }
  & $tool.Path a -t7z -mx=5 $archive "$bundleRoot"
  if ($LASTEXITCODE -ne 0) { throw "7-Zip falhou (exit $LASTEXITCODE)" }
}

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 1)
Write-Host ""
Write-Host "OK: $archive ($sizeMb MB)" -ForegroundColor Green
$desktopCopy = Join-Path $desktop "Planner-mentor-review-$stamp.rar"
if ($archive -like "*.rar" -and (Split-Path $archive -Parent) -ne $desktop) {
  Copy-Item $archive $desktopCopy -Force
  Write-Host "Copia no Desktop: $desktopCopy" -ForegroundColor Green
}
Write-Host "Staging: $staging (pode apagar apos validar o arquivo)" -ForegroundColor DarkGray

if ($sizeMb -gt 25) {
  Write-Host ''
  Write-Host 'AVISO: arquivo maior que 25 MB. E-mail comum pode bloquear. Use WeTransfer, Google Drive ou OneDrive.' -ForegroundColor Yellow
}
