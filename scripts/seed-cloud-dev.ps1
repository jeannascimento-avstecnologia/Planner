# Garante usuario seed no Supabase Cloud (admin@nextgen.dev / password123).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root "apps\web\.env.local"
$seedEmail = "admin@nextgen.dev"
$seedPassword = "password123"
$seedUserId = "11111111-1111-1111-1111-111111111111"

function Read-DotEnv([string]$Path) {
  $vars = @{}
  if (-not (Test-Path $Path)) { return $vars }
  Get-Content $Path -Encoding UTF8 | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") { $vars[$Matches[1].Trim()] = $Matches[2].Trim() }
  }
  return $vars
}

$env = Read-DotEnv $envPath
$url = $env["NEXT_PUBLIC_SUPABASE_URL"]
$key = $env["SUPABASE_SERVICE_ROLE_KEY"]
$anon = $env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
if (-not $url -or -not $key -or $url -notmatch "^https://") {
  Write-Host "AVISO: seed cloud ignorado (sem SERVICE_ROLE_KEY ou URL Cloud)." -ForegroundColor Yellow
  exit 0
}

$adminHeaders = @{
  apikey        = $key
  Authorization = "Bearer $key"
  "Content-Type" = "application/json"
}

try {
  $probe = Invoke-RestMethod -Uri "$url/auth/v1/token?grant_type=password" -Method POST `
    -Headers @{ apikey = $anon; "Content-Type" = "application/json" } `
    -Body (@{ email = $seedEmail; password = $seedPassword } | ConvertTo-Json)
  if ($probe.access_token) {
    Write-Host "==> Seed Cloud OK ($seedEmail)." -ForegroundColor Green
    exit 0
  }
} catch { }

Write-Host "==> Sincronizando senha seed no Cloud..." -ForegroundColor Yellow
$userId = $seedUserId
try {
  $null = Invoke-RestMethod -Uri "$url/auth/v1/admin/users/$userId" -Method PUT -Headers $adminHeaders `
    -Body (@{ password = $seedPassword; email_confirm = $true } | ConvertTo-Json)
} catch {
  try {
    $created = Invoke-RestMethod -Uri "$url/auth/v1/admin/users" -Method POST -Headers $adminHeaders `
      -Body (@{
        id            = $seedUserId
        email         = $seedEmail
        password      = $seedPassword
        email_confirm = $true
        user_metadata = @{ full_name = "Admin Demo" }
      } | ConvertTo-Json)
    if ($created.id) { $userId = $created.id }
  } catch {
    Write-Host "AVISO: seed cloud falhou: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 0
  }
}

$restHeaders = $adminHeaders.Clone()
$restHeaders["Prefer"] = "resolution=ignore-duplicates"
$orgId = "22222222-2222-2222-2222-222222222222"

try {
  Invoke-RestMethod -Uri "$url/rest/v1/organizations" -Method POST -Headers $restHeaders `
    -Body (@{ id = $orgId; name = "Acme Inc"; slug = "acme" } | ConvertTo-Json) | Out-Null
} catch { }
try {
  Invoke-RestMethod -Uri "$url/rest/v1/memberships" -Method POST -Headers $restHeaders `
    -Body (@{ org_id = $orgId; user_id = $userId; role = "admin" } | ConvertTo-Json) | Out-Null
} catch { }

try {
  $probe = Invoke-RestMethod -Uri "$url/auth/v1/token?grant_type=password" -Method POST `
    -Headers @{ apikey = $anon; "Content-Type" = "application/json" } `
    -Body (@{ email = $seedEmail; password = $seedPassword } | ConvertTo-Json)
  if ($probe.access_token) {
    Write-Host "==> Seed Cloud OK ($seedEmail / $seedPassword)." -ForegroundColor Green
  }
} catch {
  Write-Host "AVISO: login seed ainda falha - execute supabase/seed.sql no SQL Editor." -ForegroundColor Yellow
}
