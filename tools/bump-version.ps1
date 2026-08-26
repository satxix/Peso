param(
  [string]$AppVersion,
  [int]$CacheVersion
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
$indexPath = Join-Path $root 'index.html'
$swPath = Join-Path $root 'sw.js'

function Read-Utf8($Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8($Path, $Text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

$index = Read-Utf8 $indexPath
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

$index = [regex]::Replace(
  $index,
  '<title>PesoTrack\s+\d+\.\d+</title>',
  "<title>PesoTrack $AppVersion</title>"
)
$index = [regex]::Replace(
  $index,
  '(<div class="appVersionPill[^"]*" id="(?:homeVersionPill|appVersionPill)">)v\d+\.\d+(</div>)',
  "`$1v$AppVersion`$2"
)
$index = $index.Replace("v=$currentCacheVersion", "v=$CacheVersion")
$sw = $sw.Replace("gold-master-v$currentCacheVersion", "gold-master-v$CacheVersion")

# Repair coordinates altered by the former global version-number replacement.
$index = $index.Replace('M12 15.7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z')
$index = $index.Replace('M7.5 9h9M7.5 12.5h9M7.5 16h5.7', 'M7.5 9h9M7.5 12.5h9M7.5 16h5.5')

Write-Utf8 $indexPath $index
Write-Utf8 $swPath $sw

Write-Host "Updated PesoTrack $currentAppVersion -> $AppVersion"
Write-Host "Updated cache v$currentCacheVersion -> v$CacheVersion"
Write-Host 'Changed: index.html, sw.js'
