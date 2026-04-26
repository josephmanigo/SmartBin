Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\My Pc\Downloads\SmartBin\frontend\public\logo.png'
$outPath = 'C:\Users\My Pc\Downloads\SmartBin\frontend\src\app\icon.png'
$outLogo = 'C:\Users\My Pc\Downloads\SmartBin\frontend\public\logo-cropped.png'

if (-not (Test-Path $imgPath)) {
    Write-Host "logo.png not found"
    exit
}

$bmp = New-Object System.Drawing.Bitmap($imgPath)
$minX = $bmp.Width
$minY = $bmp.Height
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 10 -and ($pixel.R -lt 250 -or $pixel.G -lt 250 -or $pixel.B -lt 250)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

if ($minX -ge $maxX -or $minY -ge $maxY) {
    Write-Host "Could not find non-white pixels."
    exit
}

# Add a small padding
$pad = 10
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)

$rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX), ($maxY - $minY))
$cropped = $bmp.Clone($rect, $bmp.PixelFormat)

$cropped.Save($outLogo, [System.Drawing.Imaging.ImageFormat]::Png)

# For favicon (square)
$size = [Math]::Max($rect.Width, $rect.Height)
$square = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($square)
$g.Clear([System.Drawing.Color]::Transparent)
$xOff = ($size - $rect.Width) / 2
$yOff = ($size - $rect.Height) / 2
$g.DrawImage($cropped, $xOff, $yOff)

# Resize to 256x256 for icon
$iconBmp = New-Object System.Drawing.Bitmap($square, 256, 256)
$iconBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$square.Dispose()
$cropped.Dispose()
$iconBmp.Dispose()
$bmp.Dispose()
Write-Host "Cropping successful"
