# ============================================================
# SmartBin Full Setup Script
# Run this AFTER XAMPP is installed and Apache + MySQL are ON
# Usage: Right-click > Run with PowerShell (as Administrator)
# ============================================================

$ErrorActionPreference = "Stop"
$xamppPath   = "C:\xampp"
$phpExe      = "$xamppPath\php\php.exe"
$mysqlExe    = "$xamppPath\mysql\bin\mysql.exe"
$htdocsPath  = "$xamppPath\htdocs\smartbin"
$projectRoot = "C:\Users\My Pc\Downloads\SmartBin"
$backendSrc  = "$projectRoot\backend"
$frontendSrc = "$projectRoot\frontend"
$schemaFile  = "$projectRoot\backend\database\schema.sql"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SmartBin Setup Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Verify XAMPP ─────────────────────────────────────
Write-Host "[1/6] Checking XAMPP installation..." -ForegroundColor Yellow
if (-not (Test-Path $phpExe)) {
    Write-Host "ERROR: XAMPP not found at $xamppPath" -ForegroundColor Red
    Write-Host "Please install XAMPP first, then re-run this script." -ForegroundColor Red
    pause; exit 1
}
Write-Host "  XAMPP found OK" -ForegroundColor Green

# ── Step 2: Copy backend to htdocs ───────────────────────────
Write-Host "[2/6] Copying backend to htdocs\smartbin\backend..." -ForegroundColor Yellow
if (-not (Test-Path $htdocsPath)) { New-Item -ItemType Directory -Path $htdocsPath | Out-Null }
$backendDest = "$htdocsPath\backend"
if (Test-Path $backendDest) { Remove-Item $backendDest -Recurse -Force }
Copy-Item $backendSrc $backendDest -Recurse
Write-Host "  Backend copied to $backendDest" -ForegroundColor Green

# ── Step 3: Install Composer + dependencies ───────────────────
Write-Host "[3/6] Installing Composer and PHP-JWT..." -ForegroundColor Yellow
$composerPhar = "$env:TEMP\composer-setup.phar"

# Download composer installer
& $phpExe -r "copy('https://getcomposer.org/installer', '$composerPhar');"
# Install composer to xampp/php
& $phpExe $composerPhar --install-dir="$xamppPath\php" --filename=composer
$composerExe = "$xamppPath\php\composer"

# Install dependencies
Set-Location $backendDest
& $phpExe $composerExe install --no-interaction --no-progress
Write-Host "  Composer + firebase/php-jwt installed" -ForegroundColor Green

# ── Step 4: Import database schema ───────────────────────────
Write-Host "[4/6] Importing database schema into MySQL..." -ForegroundColor Yellow
# Wait a moment for MySQL to be ready
Start-Sleep -Seconds 2
& $mysqlExe -u root -e "SOURCE $schemaFile" 2>&1
if ($LASTEXITCODE -ne 0) {
    # Try alternate approach
    Get-Content $schemaFile | & $mysqlExe -u root
}
Write-Host "  Database 'smartbin' and tables created" -ForegroundColor Green

# ── Step 5: Verify .env.local ────────────────────────────────
Write-Host "[5/6] Verifying frontend .env.local..." -ForegroundColor Yellow
$envFile = "$frontendSrc\.env.local"
$envContent = "NEXT_PUBLIC_API_URL=http://localhost/smartbin/backend/api`n"
Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Write-Host "  .env.local set to: http://localhost/smartbin/backend/api" -ForegroundColor Green

# ── Step 6: Add PHP to PATH for this session ─────────────────
Write-Host "[6/6] Adding XAMPP PHP to current PATH..." -ForegroundColor Yellow
$env:PATH = "$xamppPath\php;$xamppPath\mysql\bin;$env:PATH"
Write-Host "  PHP and MySQL added to PATH" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open XAMPP Control Panel" -ForegroundColor White
Write-Host "     - Start Apache" -ForegroundColor White
Write-Host "     - Start MySQL" -ForegroundColor White
Write-Host "  2. Open a NEW terminal and run:" -ForegroundColor White
Write-Host "     cd '$frontendSrc'" -ForegroundColor Yellow
Write-Host "     npm run dev" -ForegroundColor Yellow
Write-Host "  3. Open your browser at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API runs at: http://localhost/smartbin/backend/api" -ForegroundColor Cyan
Write-Host ""
pause
