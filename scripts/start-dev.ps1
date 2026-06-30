# Sobe Supabase local + Next.js (porta 3001). Um comando: npm run dev:local
# Runbook: docs/70-ops/local-dev-start.md

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root "apps\web"
$port = 3001
$envLocal = Join-Path $web ".env.local"

Set-Location $root

. (Join-Path $PSScriptRoot "dev-path.ps1")
Initialize-DevPath

function Stop-PortListeners([int]$ListenPort) {
  Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      if ($proc -and $proc.Name -match "^(node|next|nginx)$") {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
}

Write-Host "==> Limpando portas dev 3000-3002..." -ForegroundColor Cyan
3000, 3001, 3002 | ForEach-Object { Stop-PortListeners $_ }
Start-Sleep -Seconds 1

$dotNext = Join-Path $web ".next"
$manifest = Join-Path $dotNext "prerender-manifest.json"
if ((Test-Path $dotNext) -and -not (Test-Path $manifest)) {
  Write-Host "==> Cache .next incompleto - removendo..." -ForegroundColor Yellow
  Remove-Item -Path $dotNext -Recurse -Force
}

. (Join-Path $PSScriptRoot "ensure-supabase-local.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $envLocal)) {
  Write-Host "ERRO: .env.local nao foi gerado." -ForegroundColor Red
  exit 1
}

$content = Get-Content $envLocal -Raw
$isLocal = $content -match "NEXT_PUBLIC_SUPABASE_URL=http://127\.0\.0\.1:54321"
$isCloud = $content -match "NEXT_PUBLIC_SUPABASE_URL=https://"

if (-not $isLocal -and -not $isCloud) {
  Write-Host "ERRO: .env.local sem NEXT_PUBLIC_SUPABASE_URL valido." -ForegroundColor Red
  exit 1
}

if ($content -notmatch "NEXT_PUBLIC_APP_URL=http://localhost:$port") {
  Write-Host "==> Ajustando NEXT_PUBLIC_APP_URL para porta $port..." -ForegroundColor Yellow
  $updated = $content -replace "NEXT_PUBLIC_APP_URL=.*", "NEXT_PUBLIC_APP_URL=http://localhost:$port"
  Set-Content -Path $envLocal -Value $updated.TrimEnd() -Encoding UTF8
}

Write-Host "==> Subindo Next.js em http://localhost:$port ..." -ForegroundColor Green
Write-Host "    Login: http://localhost:$port/login"
if ($isLocal) {
  Write-Host "    Supabase Studio: http://127.0.0.1:54323"
  Write-Host "    Credenciais: admin@nextgen.dev / password123"
} else {
  Write-Host "    Modo Cloud - confira seed em supabase/seed.sql se login falhar"
}
Write-Host "    Pare com Ctrl+C"
Write-Host ""

Set-Location $web
& npx next dev -p $port
