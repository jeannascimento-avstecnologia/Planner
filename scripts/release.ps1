# Release: valida, push GitHub + Supabase Cloud.
# Uso: npm run release
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> typecheck..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> git push origin main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> supabase db push..." -ForegroundColor Cyan
& "$PSScriptRoot/push-supabase-cloud.ps1"

Write-Host ""
Write-Host "OK release. No servidor (agify):" -ForegroundColor Green
Write-Host "  bash /opt/agify/scripts/deploy-server.sh" -ForegroundColor Yellow
