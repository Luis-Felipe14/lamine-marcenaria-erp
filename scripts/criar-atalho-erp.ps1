# Cria o icone do atalho e gera/atualiza Iniciar ERP.lnk
# Coloque sua logo em assets\lamine-atalho.png (ou qualquer PNG em assets\)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$assetsDir = Join-Path $ProjectRoot "assets"
$icoPath = Join-Path $assetsDir "lamine-erp.ico"
$lnkPath = Join-Path $ProjectRoot "Iniciar ERP.lnk"
$batPath = Join-Path $ProjectRoot "Iniciar-ERP.bat"

if (-not (Test-Path $assetsDir)) {
  New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

function Get-PngSourcePath {
  $named = Join-Path $assetsDir "lamine-atalho.png"
  if (Test-Path -LiteralPath $named) { return $named }

  $anyInAssets = Get-ChildItem -LiteralPath $assetsDir -Filter "*.png" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($anyInAssets) { return $anyInAssets.FullName }

  foreach ($candidate in @(
    (Join-Path $ProjectRoot "public\lamine-atalho.png"),
    (Join-Path $ProjectRoot "public\lamine-monogram.png"),
    (Join-Path $ProjectRoot "public\lamine-logo.png")
  )) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }

  return $null
}

function New-LamineIconBitmap([int]$Size) {
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 18, 18, 18))

  $gold = [System.Drawing.Color]::FromArgb(255, 181, 159, 133)
  $brush = New-Object System.Drawing.SolidBrush $gold

  $margin = [int]($Size * 0.14)
  $stemW = [int]($Size * 0.16)
  $footH = [int]($Size * 0.16)
  $stemH = $Size - $margin - $footH
  $footW = $Size - ($margin * 2)

  $g.FillRectangle($brush, $margin, $margin, $stemW, $stemH)
  $g.FillRectangle($brush, $margin, $Size - $margin - $footH, $footW, $footH)

  $g.Dispose()
  return $bmp
}

function New-SquareBitmapFromPng([string]$PngPath, [int]$Size) {
  $source = [System.Drawing.Image]::FromFile($PngPath)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $scale = [Math]::Min($Size / $source.Width, $Size / $source.Height)
  $drawW = [int]($source.Width * $scale)
  $drawH = [int]($source.Height * $scale)
  $x = [int](($Size - $drawW) / 2)
  $y = [int](($Size - $drawH) / 2)

  $g.DrawImage($source, $x, $y, $drawW, $drawH)
  $g.Dispose()
  $source.Dispose()
  return $bmp
}

function Save-BitmapAsIco([System.Drawing.Bitmap]$Bitmap, [string]$IcoPath) {
  $ms = New-Object System.IO.MemoryStream
  $Bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes = $ms.ToArray()
  $ms.Dispose()

  $size = $Bitmap.Width
  $widthByte = if ($size -ge 256) { [byte]0 } else { [byte]$size }
  $heightByte = $widthByte

  $icoMs = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $icoMs
  $bw.Write([uint16]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]1)
  $bw.Write($widthByte)
  $bw.Write($heightByte)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$pngBytes.Length)
  $bw.Write([uint32]22)
  $bw.Write($pngBytes)
  $bw.Flush()
  [System.IO.File]::WriteAllBytes($IcoPath, $icoMs.ToArray())
  $bw.Close()
  $icoMs.Dispose()
}

function Set-ShortcutIcon {
  param(
    [string]$ShortcutPath,
    [string]$TargetBat,
    [string]$IconPath
  )

  if (Test-Path -LiteralPath $ShortcutPath) {
    Remove-Item -LiteralPath $ShortcutPath -Force
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetBat
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Lamine ERP - Servidor de desenvolvimento local"
  $shortcut.IconLocation = "$IconPath,0"
  $shortcut.Save()
}

$pngPath = Get-PngSourcePath

if ($pngPath) {
  Write-Host "Usando PNG: $pngPath" -ForegroundColor Cyan
  $bitmap = New-SquareBitmapFromPng $pngPath 256
} else {
  Write-Host "PNG nao encontrado. Usando monograma padrao." -ForegroundColor Yellow
  Write-Host "Para usar sua logo, salve como: assets\lamine-atalho.png" -ForegroundColor Yellow
  $bitmap = New-LamineIconBitmap 256
}

if (Test-Path -LiteralPath $icoPath) {
  Remove-Item -LiteralPath $icoPath -Force
}

Save-BitmapAsIco $bitmap $icoPath
$bitmap.Dispose()

Write-Host "Icone criado: $icoPath" -ForegroundColor Green

if (-not (Test-Path -LiteralPath $batPath)) {
  Write-Host "[ERRO] Iniciar-ERP.bat nao encontrado." -ForegroundColor Red
  exit 1
}

$resolvedIco = (Resolve-Path -LiteralPath $icoPath).Path
$resolvedBat = (Resolve-Path -LiteralPath $batPath).Path

Set-ShortcutIcon -ShortcutPath $lnkPath -TargetBat $resolvedBat -IconPath $resolvedIco
Write-Host "Atalho atualizado: $lnkPath" -ForegroundColor Green

$desktop = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktop "Iniciar ERP.lnk"
if (Test-Path -LiteralPath $desktopShortcut) {
  Set-ShortcutIcon -ShortcutPath $desktopShortcut -TargetBat $resolvedBat -IconPath $resolvedIco
  Write-Host "Atalho da Area de Trabalho atualizado." -ForegroundColor Green
}

# Atualiza cache de icones do Explorer
$ie4uinit = Join-Path $env:SystemRoot "System32\ie4uinit.exe"
if (Test-Path -LiteralPath $ie4uinit) {
  Start-Process -FilePath $ie4uinit -ArgumentList "-show" -WindowStyle Hidden -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Pronto. Se o icone antigo ainda aparecer, pressione F5 na pasta ou reinicie o Explorer." -ForegroundColor Cyan
