# Maakt oplevering\funforest-app.zip (bronbestanden, zonder node_modules/dist)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$stageName = "funforest-app"
$stage = Join-Path $root $stageName
$outDir = Join-Path $root "oplevering"
$out = Join-Path $outDir "funforest-app.zip"

$items = @(
    "app", "assets", "constants", "hooks", "lib", "supabase", "tools",
    ".gitignore", ".env.example", "app.json", "eslint.config.js",
    "expo-env.d.ts", "package-lock.json", "package.json", "README.md",
    "LEESMIJ.txt", "start.bat", "tsconfig.json", "vercel.json"
)

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null

foreach ($item in $items) {
    $source = Join-Path $root $item
    if (Test-Path $source) {
        Copy-Item -Recurse -Force $source -Destination (Join-Path $stage (Split-Path $item -Leaf))
    }
}

# tijdelijke bestanden die niet mee hoeven
Get-ChildItem -Path $stage -Recurse -Include "*.log", ".DS_Store" -ErrorAction SilentlyContinue |
    Remove-Item -Force

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path $out) { Remove-Item -Force $out }

Compress-Archive -Path $stage -DestinationPath $out
Remove-Item -Recurse -Force $stage

$size = [math]::Round((Get-Item $out).Length / 1KB)
Write-Host "Gemaakt: oplevering\funforest-app.zip ($size KB)"
