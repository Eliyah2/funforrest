# Genereert de app-iconen, splash-afbeelding en favicon uit het Fun Forest-logo.
# Uitvoeren vanaf de projectmap:
#   powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "assets\brand\funforest-logo.png"

if (!(Test-Path $src)) {
  Write-Error "Logo niet gevonden: $src"
  exit 1
}

function Resize-ToPng($out, $size) {
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
  Write-Output ("  " + (Split-Path $out -Leaf) + " -> " + $size + "x" + $size)
}

$images = Join-Path $root "assets\images"
Write-Output "Iconen genereren uit $src"
Resize-ToPng (Join-Path $images "icon.png") 1024
Resize-ToPng (Join-Path $images "splash-icon.png") 600
Resize-ToPng (Join-Path $images "favicon.png") 48
Write-Output "Klaar."
