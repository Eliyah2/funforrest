# Maakt de web-versie van het logo voor in de app.
#   powershell -ExecutionPolicy Bypass -File tools\make-web-logo.ps1
#
# Het origineel is 2560x2560 (bron voor de app-iconen); in de app staat het
# logo maximaal 200 px breed, dus die grote versie uploaden is ~100 kB
# verspild bij elk eerste bezoek. Deze versie is 400 px (2x voor retina).
# Het origineel blijft ongewijzigd.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root "assets\brand\funforest-logo.png"
$out  = Join-Path $root "assets\brand\funforest-logo-web.png"
$size = 400

if (!(Test-Path $src)) {
  Write-Error "Logo niet gevonden: $src"
  exit 1
}

$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($img, 0, 0, $size, $size)
$g.Dispose()
$img.Dispose()

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Gemaakt: $out ($kb kB, $size x $size)"
