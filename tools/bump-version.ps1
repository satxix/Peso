param(
  [string]$AppVersion,
  [int]$CacheVersion
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
$indexPath = Join-Path $root 'index.html'
$appPath = Join-Path $root 'app.js'
$swPath = Join-Path $root 'sw.js'

function Read-Utf8($Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8($Path, $Text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

$index = Read-Utf8 $indexPath
$app = Read-Utf8 $appPath
$sw = Read-Utf8 $swPath

$currentAppMatch = [regex]::Match($index, 'PesoTrack\s+(\d+\.\d+)')
if (!$currentAppMatch.Success) {
  throw 'Could not detect current app version from index.html title.'
}

$currentCacheMatch = [regex]::Match($sw, 'gold-master-v(\d+)')
if (!$currentCacheMatch.Success) {
  throw 'Could not detect current cache version from sw.js.'
}

$currentAppVersion = $currentAppMatch.Groups[1].Value
$currentCacheVersion = [int]$currentCacheMatch.Groups[1].Value

if (!$AppVersion) {
  $parts = $currentAppVersion.Split('.')
  $AppVersion = '{0}.{1}' -f $parts[0], ([int]$parts[1] + 1)
}

if (!$CacheVersion) {
  $CacheVersion = $currentCacheVersion + 1
}

$files = @(
  @{ Path = $indexPath; Text = $index },
  @{ Path = $appPath; Text = $app },
  @{ Path = $swPath; Text = $sw }
)

foreach ($file in $files) {
  $text = $file.Text
  $text = $text.Replace($currentAppVersion, $AppVersion)
  $text = $text.Replace("v=$currentCacheVersion", "v=$CacheVersion")
  $text = $text.Replace("v$currentCacheVersion", "v$CacheVersion")
  $text = $text.Replace("gold-master-v$currentCacheVersion", "gold-master-v$CacheVersion")
  Write-Utf8 $file.Path $text
}

Write-Host "Updated PesoTrack $currentAppVersion -> $AppVersion"
Write-Host "Updated cache v$currentCacheVersion -> v$CacheVersion"
Write-Host 'Changed: index.html, app.js, sw.js'
