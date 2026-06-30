function Read-DotEnvFile([string]$Path) {
  $vars = @{}
  if (-not (Test-Path $Path)) { return $vars }
  Get-Content $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -match "^([^#=]+)=(.*)$") {
      $vars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
    }
  }
  return $vars
}

function Format-DotEnvValue([string]$Value) {
  if ($Value -match '[\s<>]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Merge-DotEnvOverride([hashtable]$Base, [string]$OverridePath) {
  $merged = @{}
  foreach ($key in $Base.Keys) { $merged[$key] = $Base[$key] }
  $override = Read-DotEnvFile $OverridePath
  foreach ($key in $override.Keys) { $merged[$key] = $override[$key] }
  return $merged
}
