# Sobe Supabase local, repara volume PG incompativel, aplica seed se necessario.
# Fallback: API local ja rodando (sem docker ps) ou Supabase Cloud (.env.supabase).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

. (Join-Path $PSScriptRoot "dev-path.ps1")
Initialize-DevPath

$projectId = "nextgen-planner"
$seedEmail = "admin@nextgen.dev"
$localApiUrl = "http://127.0.0.1:54321"

function Get-DockerError {
  if (-not (Test-DockerCmdExists)) { return "comando docker nao encontrado no PATH" }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & docker version 2>&1 | Out-String
  $ErrorActionPreference = $prevEap
  if ($out -match "failed to connect[^\r\n]+") {
    return $Matches[0].Trim()
  }
  return $out.Trim()
}

function Test-DockerEngine {
  if (-not (Test-DockerCmdExists)) { return $false }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & docker ps -q 2>&1 | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  return ($code -eq 0) -and ($out -notmatch "failed to connect")
}

function Set-DockerContext([string]$Name) {
  if (-not (Test-DockerCmdExists)) { return }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & docker context use $Name 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap
}

function Test-LocalSupabaseApi {
  try {
    $r = Invoke-WebRequest -Uri "$localApiUrl/rest/v1/" -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -ge 200
  } catch {
    return $false
  }
}

function Wait-DockerEngine {
  if (-not (Test-DockerCmdExists)) {
    Write-Host "AVISO: comando 'docker' nao encontrado no PATH." -ForegroundColor Yellow
    return $false
  }
  $contexts = @("desktop-linux", "default")
  for ($i = 0; $i -lt 15; $i++) {
    foreach ($ctx in $contexts) {
      Set-DockerContext $ctx
      if (Test-DockerEngine) {
        if ($i -gt 0) { Write-Host "==> Docker pronto (context: $ctx)." -ForegroundColor Green }
        return $true
      }
    }
    if ($i -eq 0) {
      Write-Host "==> Aguardando Docker Engine..." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Try-StartDockerDesktop {
  $paths = @(
    "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      Write-Host "==> Iniciando Docker Desktop..." -ForegroundColor Yellow
      Start-Process -FilePath $p | Out-Null
      return $true
    }
  }
  return $false
}

function Invoke-SupabaseCommand([string]$Subcommand) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = Invoke-Expression "& supabase $Subcommand 2>&1"
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  return @{ ExitCode = $code; Output = @($out) }
}

function Test-SupabaseHealthy {
  if (Test-LocalSupabaseApi) { return $true }
  $container = "supabase_db_$projectId"
  if (Test-DockerEngine) {
    $running = & docker ps --filter "name=$container" --filter "status=running" -q 2>$null
    if ($running) { return $true }
  }
  $result = Invoke-SupabaseCommand "status"
  if ($result.ExitCode -ne 0) { return $false }
  $text = $result.Output -join "`n"
  return ($text -match "supabase local development setup is running") -or ($text -match '"API_URL"')
}

function Remove-ProjectDbVolume {
  Write-Host "==> Removendo volume DB antigo (incompatibilidade PG)..." -ForegroundColor Yellow
  Invoke-SupabaseCommand "stop --no-backup" | Out-Null
  Start-Sleep -Seconds 2
  if (-not (Test-DockerEngine)) { return }
  $volumes = & docker volume ls -q --filter "label=com.supabase.cli.project=$projectId" 2>$null
  foreach ($vol in $volumes) {
    if ($vol -match "supabase_db") {
      & docker volume rm $vol 2>$null | Out-Null
      Write-Host "    removido: $vol"
    }
  }
}

function Start-SupabaseStack {
  Write-Host "==> Subindo Supabase local..." -ForegroundColor Cyan
  $result = Invoke-SupabaseCommand "start"
  $text = $result.Output -join "`n"
  if ($result.ExitCode -ne 0) {
    if ($text -match "incompatible with server" -or $text -match "database files are incompatible") {
      Remove-ProjectDbVolume
      $result = Invoke-SupabaseCommand "start"
      $text = $result.Output -join "`n"
    }
  }
  if ($result.ExitCode -ne 0) {
    Write-Host $text
    Write-Host "ERRO: supabase start falhou." -ForegroundColor Red
    return $false
  }
  return $true
}

function Test-SeedUserExists {
  if (-not (Test-DockerEngine)) { return $false }
  $container = "supabase_db_$projectId"
  $running = & docker ps --filter "name=$container" --filter "status=running" -q 2>$null
  if (-not $running) { return $false }
  $count = & docker exec $container psql -U postgres -tAc "SELECT count(*) FROM auth.users WHERE email = '$seedEmail';" 2>$null
  return ($count -match "^\s*1\s*$")
}

function Ensure-MigrationsApplied {
  Write-Host "==> Aplicando migrations pendentes (local)..." -ForegroundColor Cyan
  $result = Invoke-SupabaseCommand "migration up --local"
  $text = $result.Output -join "`n"
  if ($result.ExitCode -ne 0) {
    Write-Host $text
    Write-Host "ERRO: supabase migration up falhou." -ForegroundColor Red
    return $false
  }
  if ($text -match "Applying migration") {
    Write-Host "==> Migrations novas aplicadas." -ForegroundColor Green
  } else {
    Write-Host "==> Migrations locais em dia." -ForegroundColor Green
  }
  return $true
}

function Ensure-DatabaseSeeded {
  if (Test-SeedUserExists) {
    Write-Host "==> Seed OK ($seedEmail existe)." -ForegroundColor Green
    return $true
  }
  if (-not (Test-DockerEngine)) {
    Write-Host "AVISO: nao foi possivel verificar seed (Docker CLI indisponivel)." -ForegroundColor Yellow
    return $true
  }
  Write-Host "==> Aplicando migrations + seed (supabase db reset)..." -ForegroundColor Yellow
  $result = Invoke-SupabaseCommand "db reset"
  $result.Output | ForEach-Object { Write-Host $_ }
  if ($result.ExitCode -ne 0) {
    Write-Host "ERRO: supabase db reset falhou." -ForegroundColor Red
    return $false
  }
  if (-not (Test-SeedUserExists)) {
    Write-Host "ERRO: seed nao criou $seedEmail." -ForegroundColor Red
    return $false
  }
  Write-Host "==> Seed aplicado." -ForegroundColor Green
  return $true
}

function Use-CloudFallback {
  Write-Host "==> Docker indisponivel - tentando Supabase Cloud..." -ForegroundColor Yellow
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "sync-supabase-env.ps1")
  if ($LASTEXITCODE -ne 0) { return $false }
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "seed-cloud-dev.ps1")
  Write-Host ""
  Write-Host "Modo Cloud ativo. Para modo local: reinicie Docker Desktop e rode npm run dev:local." -ForegroundColor Yellow
  return $true
}

# --- fluxo principal ---
$dockerOk = $false
if (Test-DockerEngine) {
  $dockerOk = $true
} elseif (Test-LocalSupabaseApi) {
  Write-Host "==> Supabase local respondendo em $localApiUrl (sem Docker CLI)." -ForegroundColor Green
  $dockerOk = $true
} else {
  if (-not (Wait-DockerEngine)) {
    Try-StartDockerDesktop | Out-Null
    if (-not (Wait-DockerEngine)) {
      if (Use-CloudFallback) { exit 0 }
      Write-Host ""
      Write-Host "ERRO: Docker Engine nao responde." -ForegroundColor Red
      Write-Host "  $(Get-DockerError)" -ForegroundColor DarkYellow
      Write-Host ""
      Write-Host "Tente:" -ForegroundColor Yellow
      Write-Host "  1. Abrir Docker Desktop e aguardar Engine running (icone verde)"
      Write-Host "  2. Settings -> General -> Use the WSL 2 based engine ligado"
      Write-Host "  3. Docker Desktop -> Troubleshoot -> Restart"
      Write-Host "  4. No terminal: docker ps   (deve listar containers sem erro)"
      exit 1
    }
  }
  $dockerOk = $true
}

if (-not (Test-SupabaseHealthy)) {
  if (-not (Start-SupabaseStack)) {
    if (Use-CloudFallback) { exit 0 }
    exit 1
  }
} else {
  Write-Host "==> Supabase local ja esta rodando." -ForegroundColor Green
}

if (-not (Ensure-MigrationsApplied)) { exit 1 }

if (-not (Ensure-DatabaseSeeded)) { exit 1 }

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "sync-supabase-env-local.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Login: admin@nextgen.dev / password123" -ForegroundColor Green
