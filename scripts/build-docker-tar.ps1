param(
  [string]$ImageName = 'tiaozhanbei-platform',
  [string]$Tag = '',
  [string]$Distro = 'Ubuntu-22.04'
)

$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$artifactPath = Join-Path $projectPath 'artifacts'
New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null

if (-not $Tag) {
  $Tag = (git -C $projectPath rev-parse --short=7 HEAD).Trim()
  if (-not $Tag) { $Tag = 'local' }
}

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
$linuxArtifacts = Convert-ToWslPath $artifactPath
$linuxScript = "$linuxProject/scripts/docker-build-tar.sh"

Write-Host "Building ${ImageName}:${Tag} in WSL Docker..."
wsl -d $Distro -- bash $linuxScript $linuxProject $linuxArtifacts $ImageName $Tag
if ($LASTEXITCODE -ne 0) {
  throw "Docker build failed with exit code $LASTEXITCODE"
}

$tarPath = Join-Path $artifactPath "${ImageName}-${Tag}-linux-amd64.tar"
$hashPath = "${tarPath}.sha256"
$gzipPath = "${tarPath}.gz"
$gzipHashPath = "${gzipPath}.sha256"
if (-not (Test-Path $tarPath) -or -not (Test-Path $hashPath) -or
    -not (Test-Path $gzipPath) -or -not (Test-Path $gzipHashPath)) {
  throw 'Docker tar/tar.gz or SHA256 file was not generated.'
}

Write-Host "Docker tar and tar.gz created in: $artifactPath"
Get-Item $tarPath, $hashPath, $gzipPath, $gzipHashPath |
  Select-Object FullName, Length, LastWriteTime
