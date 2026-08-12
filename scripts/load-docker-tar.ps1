param(
  [Parameter(Mandatory = $true)]
  [string]$Archive,
  [string]$Distro = 'Ubuntu-22.04'
)

$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$archivePath = (Resolve-Path $Archive).Path

function Convert-ToWslPath([string]$WindowsPath) {
  $resolved = [IO.Path]::GetFullPath($WindowsPath)
  if ($resolved -notmatch '^([A-Za-z]):\\(.*)$') {
    throw "Unsupported Windows path: $resolved"
  }
  $drive = $Matches[1].ToLowerInvariant()
  $tail = $Matches[2].Replace('\', '/')
  return "/mnt/$drive/$tail"
}

$linuxProject = Convert-ToWslPath $projectPath
$linuxArchive = Convert-ToWslPath $archivePath
$linuxScript = "$linuxProject/scripts/docker-load-tar.sh"

Write-Host "Checking and loading Docker archive: $archivePath"
wsl -d $Distro -- bash $linuxScript $linuxArchive
if ($LASTEXITCODE -ne 0) {
  throw "Docker archive load failed with exit code $LASTEXITCODE"
}

Write-Host 'Docker archive loaded successfully.'
