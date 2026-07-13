# Sobe Next.js (porta 3001) apontando para Supabase CLOUD — OAuth Google/Microsoft.
# Runbook: docs/70-ops/local-dev-start.md (secao Microsoft OAuth)

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

Write-Host "==> Modo CLOUD: Supabase remoto (OAuth Microsoft/Google)" -ForegroundColor Cyan
Write-Host "==> Limpando portas dev 3000-3002..." -ForegroundColor Cyan
3000, 3001, 3002 | ForEach-Object { Stop-PortListeners $_ }
Start-Sleep -Seconds 1

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "sync-supabase-env.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $envLocal)) {
  Write-Host "ERRO: .env.local nao foi gerado." -ForegroundColor Red
  exit 1
}

$content = Get-Content $envLocal -Raw
if ($content -notmatch "NEXT_PUBLIC_SUPABASE_URL=https://") {
  Write-Host "ERRO: .env.local nao aponta para Supabase Cloud." -ForegroundColor Red
  exit 1
}

if ($content -notmatch "NEXT_PUBLIC_APP_URL=http://localhost:$port") {
  Write-Host "==> Ajustando NEXT_PUBLIC_APP_URL para porta $port..." -ForegroundColor Yellow
  $updated = $content -replace "NEXT_PUBLIC_APP_URL=.*", "NEXT_PUBLIC_APP_URL=http://localhost:$port"
  Set-Content -Path $envLocal -Value $updated.TrimEnd() -Encoding UTF8
}

Write-Host "OK: .env.local -> Supabase Cloud" -ForegroundColor Green
Write-Host "==> Subindo Next.js em http://localhost:$port ..." -ForegroundColor Green
Write-Host "    Login: http://localhost:$port/login"
Write-Host "    Microsoft/Google OAuth: habilitados (provider no Dashboard)"
Write-Host "    Auth URLs no Dashboard: Site + Redirect = http://localhost:$port/auth/callback"
Write-Host "    Pare com Ctrl+C"
Write-Host ""

Set-Location $web
& npx next dev -p $port
