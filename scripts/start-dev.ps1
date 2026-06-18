# Sobe o frontend local de forma confiavel (porta 3001 fixa).
# Runbook: docs/70-ops/local-dev-start.md

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root "apps\web"
$port = 3001
$envLocal = Join-Path $web ".env.local"

Set-Location $root

function Stop-PortListeners([int]$ListenPort) {
  Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host "==> Limpando portas 3000-3002..." -ForegroundColor Cyan
3000, 3001, 3002 | ForEach-Object { Stop-PortListeners $_ }
Start-Sleep -Seconds 1

$dotNext = Join-Path $web ".next"
$manifest = Join-Path $dotNext "prerender-manifest.json"
if ((Test-Path $dotNext) -and -not (Test-Path $manifest)) {
  Write-Host "==> Cache .next incompleto - removendo..." -ForegroundColor Yellow
  Remove-Item -Path $dotNext -Recurse -Force
}

if (-not (Test-Path $envLocal)) {
  Write-Host "==> .env.local ausente - gerando via supabase:env..." -ForegroundColor Yellow
  npm run supabase:env
}

$content = Get-Content $envLocal -Raw
if ($content -notmatch "NEXT_PUBLIC_SUPABASE_URL=https://") {
  Write-Host "ERRO: apps/web/.env.local sem NEXT_PUBLIC_SUPABASE_URL." -ForegroundColor Red
  Write-Host "Rode: npm run supabase:env"
  Write-Host "Runbook: docs/70-ops/supabase-cloud-dev.md"
  exit 1
}

if ($content -notmatch "NEXT_PUBLIC_APP_URL=http://localhost:$port") {
  Write-Host "==> Ajustando NEXT_PUBLIC_APP_URL para porta $port..." -ForegroundColor Yellow
  $updated = $content -replace "NEXT_PUBLIC_APP_URL=.*", "NEXT_PUBLIC_APP_URL=http://localhost:$port"
  Set-Content -Path $envLocal -Value $updated.TrimEnd() -Encoding UTF8
}

Write-Host "==> Subindo Next.js em http://localhost:$port ..." -ForegroundColor Green
Write-Host "    Login: http://localhost:$port/login"
Write-Host "    Pare com Ctrl+C"
Write-Host ""

Set-Location $web
& npx next dev -p $port
