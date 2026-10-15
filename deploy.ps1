<#
.SYNOPSIS
  Marbefa Poultry - Build & Package for Hostinger deployment.
.DESCRIPTION
  1. Builds the React frontend for production.
  2. Bundles frontend (dist) + backend into a single ZIP.
  3. Prints the next steps on Hostinger.
.PARAMETER Domain
  Your Hostinger domain, e.g. yourdomain.com (no http://).
.PARAMETER Base
  Public path the React app is served from. Default "/" (domain root).
  Use "/poultry/" if serving from a subdirectory.
.PARAMETER ApiUrl
  Full URL to the Django API. Default "https://<domain>/api".
.EXAMPLE
  .\deploy.ps1 -Domain yourdomain.com
.EXAMPLE
  .\deploy.ps1 -Domain yourdomain.com -Base "/poultry/"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Domain,

    [string]$Base = "/",

    [string]$ApiUrl = ""
)

$ErrorActionPreference = "Stop"

# Resolve paths
$root      = $PSScriptRoot
$frontend  = Join-Path $root "frontend"
$backend   = Join-Path $root "backend"
$dist      = Join-Path $root "dist"
$stage     = Join-Path $root "deploy_stage"
$zipPath   = Join-Path $root "marbefa-hostinger.zip"

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    $ApiUrl = "https://$Domain/api"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Marbefa Poultry - Hostinger Deploy Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Domain : $Domain"
Write-Host "Base   : $Base"
Write-Host "API URL: $ApiUrl"
Write-Host ""

# --- 1. Build frontend ---
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Push-Location $frontend
$env:VITE_BASE     = $Base
$env:VITE_API_URL  = $ApiUrl
# npm writes build info to stderr; use cmd-style redirection so it doesn't trip $ErrorActionPreference
$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& npm.cmd run build *> $null
$buildExit = $LASTEXITCODE
$ErrorActionPreference = $oldErrorAction
if ($buildExit -ne 0) { throw "Frontend build failed (exit $buildExit)." }
Pop-Location
Write-Host "      OK -> dist\" -ForegroundColor Green

# --- 2. Stage files ---
Write-Host "[2/4] Staging deploy package..." -ForegroundColor Yellow
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# public_html (React build output)
$public = Join-Path $stage "public_html"
New-Item -ItemType Directory -Path $public | Out-Null
Copy-Item (Join-Path $dist "*") $public -Recurse -Force
Copy-Item (Join-Path $root "public_html\.htaccess") $public -Force

# backend (Django)
$beStage = Join-Path $stage "marbefa_backend"
New-Item -ItemType Directory -Path $beStage | Out-Null
Copy-Item (Join-Path $backend "*") $beStage -Recurse -Force
# Remove dev-only junk
Get-ChildItem $beStage -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem $beStage -Recurse -Filter "*.pyc"      | Remove-Item -Force
if (Test-Path (Join-Path $beStage "db.sqlite3")) {
    # Keep the seeded DB for demo; comment next line to start fresh
    # Remove-Item (Join-Path $beStage "db.sqlite3") -Force
}

# --- 3. ZIP (use Python's zipfile to guarantee forward-slash paths for Linux) ---
Write-Host "[3/4] Creating marbefa-hostinger.zip..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$python = "C:\Users\keynote\AppData\Local\Programs\Python\Python313\python.exe"
& $python -c @"
import zipfile, os, sys
src = r'$stage'
dst = r'$zipPath'
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, src).replace(os.sep, '/')
            z.write(full, arc)
print('zip created')
"@
$size = (Get-Item $zipPath).Length / 1MB

# Cleanup stage
Remove-Item $stage -Recurse -Force

Write-Host "      OK ($([math]::Round($size,1)) MB)" -ForegroundColor Green
Write-Host ""
Write-Host "[4/4] Done!" -ForegroundColor Green
Write-Host ""
Write-Host "PACKAGE: $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS on Hostinger:" -ForegroundColor Yellow
Write-Host "  1. Upload marbefa-hostinger.zip to your home folder (not public_html)"
Write-Host "     via hPanel File Manager -> Upload, or FileZilla (drag & drop)."
Write-Host "  2. In File Manager, right-click the ZIP -> Extract."
Write-Host "  3. Move public_html/* into your real public_html/ (overwrite index.html)."
Write-Host "  4. hPanel -> Advanced -> Setup Python App -> Create:"
Write-Host "       - App root : marbefa_backend"
Write-Host "       - Startup  : passenger_wsgi.py"
Write-Host "       - Entry    : application"
Write-Host "  5. In the Python App terminal run (single command):" -ForegroundColor Yellow
Write-Host "       pip install -r requirements.txt"
Write-Host "       python manage.py setup"
Write-Host "     (use --no-seed to skip demo data)"
Write-Host "  6. Set env vars (see .env.example) then Restart the app."
Write-Host ""
