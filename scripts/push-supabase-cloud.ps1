# Aplica migrations + Edge Functions no Supabase Cloud (rode no PC de dev).
# Uso: npm run supabase:push
# Requer: npx supabase login + link feito uma vez

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ref = $env:SUPABASE_PROJECT_REF
if (-not $ref) {
  $ref = "mkpjtvpstdjfmidvruor"
  Write-Host "==> SUPABASE_PROJECT_REF nao definido; usando $ref" -ForegroundColor Yellow
}

Write-Host "==> Link projeto Cloud ($ref)..." -ForegroundColor Cyan
npx supabase link --project-ref $ref

Write-Host "==> db push (migrations)..." -ForegroundColor Cyan
npx supabase db push --yes

$functions = @(
  "automation-runner",
  "cloudinary-sign",
  "export-deadlines-to-google",
  "export-plan-to-teams",
  "tiflux-create-ticket"
)

foreach ($fn in $functions) {
  Write-Host "==> functions deploy $fn..." -ForegroundColor Cyan
  npx supabase functions deploy $fn
}

Write-Host ""
Write-Host "OK: Supabase Cloud atualizado." -ForegroundColor Green
Write-Host "Depois no servidor: bash scripts/deploy-server.sh" -ForegroundColor Green
