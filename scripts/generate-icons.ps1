Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "public/logo-icon-transparent.png").Path
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$srcBmp = New-Object System.Drawing.Bitmap($srcImg)
$srcImg.Dispose()

# 1. Encontrar o bounding box exato da logo no arquivo original
$minX = $srcBmp.Width
$maxX = 0
$minY = $srcBmp.Height
$maxY = 0

for ($y = 0; $y -lt $srcBmp.Height; $y++) {
    for ($x = 0; $x -lt $srcBmp.Width; $x++) {
        $pixel = $srcBmp.GetPixel($x, $y)
        if ($pixel.A -gt 15) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Host "Bounding box detectado: X=$minX..$maxX ($contentW px), Y=$minY..$maxY ($contentH px)"

# Recortar apenas o conteúdo visível
$cropRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)
$croppedBmp = $srcBmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$srcBmp.Dispose()

# Função para desenhar a logo centralizada em uma imagem quadrada com alta qualidade
function CreateSquareIcon($source, $targetSize, $paddingPercent, $bgColor) {
    $result = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($result)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne $null) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $g.FillRectangle($brush, 0, 0, $targetSize, $targetSize)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $maxDrawDim = $targetSize * (1.0 - (2.0 * $paddingPercent))
    $scale = [Math]::Min($maxDrawDim / $source.Width, $maxDrawDim / $source.Height)
    $drawW = [int]($source.Width * $scale)
    $drawH = [int]($source.Height * $scale)
    $destX = [int](($targetSize - $drawW) / 2)
    $destY = [int](($targetSize - $drawH) / 2)

    $g.DrawImage($source, $destX, $destY, $drawW, $drawH)
    $g.Dispose()

    return $result
}

$brandBgColor = [System.Drawing.Color]::FromArgb(255, 6, 31, 24) # #061F18 cor oficial do app

# 2. Gerar versões PNG quadradas com tamanhos padronizados pelo W3C / PWA / Desktop Windows
$sizes = @(
    @{ Name = "icon-16.png"; Size = 16; Padding = 0.05; Bg = $null },
    @{ Name = "icon-32.png"; Size = 32; Padding = 0.05; Bg = $null },
    @{ Name = "icon-48.png"; Size = 48; Padding = 0.05; Bg = $null },
    @{ Name = "icon-96.png"; Size = 96; Padding = 0.08; Bg = $null },
    @{ Name = "icon-128.png"; Size = 128; Padding = 0.08; Bg = $null },
    @{ Name = "icon-144.png"; Size = 144; Padding = 0.08; Bg = $null },
    @{ Name = "icon-180.png"; Size = 180; Padding = 0.10; Bg = $null },
    @{ Name = "apple-touch-icon.png"; Size = 180; Padding = 0.10; Bg = $brandBgColor },
    @{ Name = "icon-192.png"; Size = 192; Padding = 0.08; Bg = $null },
    @{ Name = "icon-256.png"; Size = 256; Padding = 0.08; Bg = $null },
    @{ Name = "icon-384.png"; Size = 384; Padding = 0.08; Bg = $null },
    @{ Name = "icon-512.png"; Size = 512; Padding = 0.08; Bg = $null },
    @{ Name = "icon-maskable-512.png"; Size = 512; Padding = 0.18; Bg = $brandBgColor },
    @{ Name = "favicon.png"; Size = 512; Padding = 0.08; Bg = $null },
    @{ Name = "favicon-32x32.png"; Size = 32; Padding = 0.05; Bg = $null },
    @{ Name = "favicon-16x16.png"; Size = 16; Padding = 0.05; Bg = $null }
)

foreach ($item in $sizes) {
    $bmp = CreateSquareIcon $croppedBmp $item.Size $item.Padding $item.Bg
    $outPath = Join-Path "public" $item.Name
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Gerado: $outPath ($($item.Size)x$($item.Size))"
}

# 3. Gerar favicon.ico real multi-resolution para Windows Desktop
# Um arquivo .ico suporta múltiplos tamanhos: 16x16, 32x32, 48x48
$icoSizes = @(16, 32, 48, 64)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Header ICO
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type 1 = Icon
$bw.Write([UInt16]$icoSizes.Count) # Número de imagens

$pngStreams = @()
foreach ($sz in $icoSizes) {
    $bmp = CreateSquareIcon $croppedBmp $sz 0.05 $null
    $entryMs = New-Object System.IO.MemoryStream
    $bmp.Save($entryMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += @{ Size = $sz; Bytes = $entryMs.ToArray() }
    $entryMs.Dispose()
}

$offset = 6 + (16 * $icoSizes.Count)

foreach ($entry in $pngStreams) {
    $w = if ($entry.Size -ge 256) { 0 } else { [byte]$entry.Size }
    $h = if ($entry.Size -ge 256) { 0 } else { [byte]$entry.Size }
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0) # Palette colors
    $bw.Write([byte]0) # Reserved
    $bw.Write([UInt16]1) # Color planes
    $bw.Write([UInt16]32) # Bits per pixel
    $bw.Write([UInt32]$entry.Bytes.Length) # Image size in bytes
    $bw.Write([UInt32]$offset) # Offset
    $offset += $entry.Bytes.Length
}

foreach ($entry in $pngStreams) {
    $bw.Write($entry.Bytes)
}

[System.IO.File]::WriteAllBytes((Join-Path "public" "favicon.ico"), $ms.ToArray())
$bw.Dispose()
$ms.Dispose()
Write-Host "Gerado: public/favicon.ico (Multi-size 16, 32, 48, 64)"

$croppedBmp.Dispose()
Write-Host "✅ Todos os ícones quadrados de alta fidelidade foram gerados com sucesso!"

