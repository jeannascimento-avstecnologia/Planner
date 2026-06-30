# Adiciona Docker/npm ao PATH (PowerShell filho / VS Code as vezes nao herda).

function Initialize-DevPath {
  $machine = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
  $user = [System.Environment]::GetEnvironmentVariable("PATH", "User")
  $env:PATH = "$machine;$user"

  $extra = @(
    "$env:ProgramFiles\Docker\Docker\resources\bin",
    "$env:ProgramFiles\Docker\Docker\resources",
    "${env:ProgramFiles(x86)}\Docker\Docker\resources\bin",
    "$env:APPDATA\npm"
  )
  foreach ($p in $extra) {
    if ((Test-Path $p) -and ($env:PATH -notlike "*$([regex]::Escape($p))*")) {
      $env:PATH = "$p;$env:PATH"
    }
  }
}

function Test-DockerCmdExists {
  return $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
}
