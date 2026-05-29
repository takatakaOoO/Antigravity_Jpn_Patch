# ============================================================================
# Antigravity Japanese Patch - Applicator Script (Hash Check & Recovery)
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity Japanese Patch Applicator ===" -ForegroundColor Cyan
Write-Host "This script will apply the Japanese localization patch to Antigravity."

# --- Path Configurations ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$ScriptDir = $PSScriptRoot
$TempExtract = Join-Path $ScriptDir "_temp_extract"
$PatchScript = Join-Path $ScriptDir "apply_patch.js"
$PatchData = Join-Path $ScriptDir "japanese_patch.json"

# SHA-256 hash of the official clean app.asar (v2.0.7)
$ExpectedHash = "7EBE22606F03EAA7CDD0A0384B6240A0E5E20064C5EFCC0DA446A38F33AAC74B"

# --- Pre-requisites Check ---
if (-not (Test-Path $AsarFile)) {
    Write-Host "Error: app.asar not found at: $AsarFile" -ForegroundColor Red
    Write-Host "Please ensure Antigravity is installed."
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 1. Pre-patch Hash Integrity Check
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[Prep] Verifying original file integrity (SHA-256)..." -ForegroundColor Yellow
$CurrentHashObj = Get-FileHash -Path $AsarFile -Algorithm SHA256
$CurrentHash = $CurrentHashObj.Hash

Write-Host "  Current Hash:  $CurrentHash"
Write-Host "  Expected Hash: $ExpectedHash"

if ($CurrentHash -ne $ExpectedHash) {
    Write-Host ""
    Write-Host "  [WARNING] Original file (app.asar) integrity check failed!" -ForegroundColor Red
    Write-Host "  ------------------------------------------------------------------"
    Write-Host "  * This file might already be patched or is a different version."
    Write-Host "  * Proceeding with a mismatched hash might cause startup failure."
    Write-Host "  ------------------------------------------------------------------"
    
    $confirm = Read-Host "  Do you want to abort the installation? (Y/n)"
    if ($confirm -notmatch "^n$|^no$") {
        Write-Host ""
        Write-Host "  Cancelled by user. Exiting safely." -ForegroundColor Yellow
        Pause
        exit 1
    }
    Write-Host "  Ignoring warning. Proceeding at your own risk." -ForegroundColor DarkYellow
} else {
    Write-Host "  Integrity check passed! Official clean app.asar detected." -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# 2. Create Backup
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[1/4] Backing up original app.asar..." -ForegroundColor Yellow
if (-not (Test-Path $BackupFile)) {
    Copy-Item $AsarFile $BackupFile -Force
    Write-Host "  Backup created successfully: app.asar.bak" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  [WARNING] Backup file (app.asar.bak) already exists!" -ForegroundColor DarkYellow
    Write-Host "  ------------------------------------------------------------------"
    Write-Host "  * If you just updated Antigravity, enter [y] to overwrite."
    Write-Host "  * If you are just updating dictionary data, enter [n] to skip."
    Write-Host "  * WARNING: Overwriting a patched backup will prevent restoration."
    Write-Host "  ------------------------------------------------------------------"
    
    $overwrite = Read-Host "  Do you want to overwrite the backup with the current file? (y/N)"
    if ($overwrite -match "^y$|^yes$") {
        Copy-Item $AsarFile $BackupFile -Force
        Write-Host "  Backup overwritten successfully: app.asar.bak" -ForegroundColor Green
    } else {
        Write-Host "  Kept existing backup file (skipped)" -ForegroundColor Green
    }
}

# ----------------------------------------------------------------------------
# 3. Extract ASAR
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Extracting app contents..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }

# Safe Start-Process with array argument to avoid quotation escaping issues
$ExtractArgs = @("/c", "npx", "-y", "@electron/asar", "extract", ('"' + $AsarFile + '"'), ('"' + $TempExtract + '"'))
$process = Start-Process -FilePath "cmd" -ArgumentList $ExtractArgs -NoNewWindow -PassThru -Wait

if ($process.ExitCode -ne 0) {
    Write-Host "Error: Extraction failed. Please check if Node.js is installed." -ForegroundColor Red
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 4. Inject Translation Data
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Applying Japanese translation patch..." -ForegroundColor Yellow
$PreloadJs = Join-Path $TempExtract "dist\preload.js"
node $PatchScript $PreloadJs $PatchData
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to inject translation data." -ForegroundColor Red
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 5. Pack ASAR & Verify Integrity
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Repackaging app contents..." -ForegroundColor Yellow
$NewAsar = Join-Path $ScriptDir "_temp_patched.asar"

# Safe Start-Process with array argument to avoid quotation escaping issues
$PackArgs = @("/c", "npx", "-y", "@electron/asar", "pack", ('"' + $TempExtract + '"'), ('"' + $NewAsar + '"'))
$process = Start-Process -FilePath "cmd" -ArgumentList $PackArgs -NoNewWindow -PassThru -Wait

if ($process.ExitCode -ne 0) {
    Write-Host "Error: Packaging failed." -ForegroundColor Red
    Pause
    exit 1
}

# Calculate hash of the newly generated temp patched file
$PatchedHashObj = Get-FileHash -Path $NewAsar -Algorithm SHA256
$ExpectedPatchedHash = $PatchedHashObj.Hash

Write-Host ""
Write-Host "[Apply] Copying patched file to the system..." -ForegroundColor Yellow
Copy-Item $NewAsar $AsarFile -Force

# Calculate hash of the newly copied file on system
$AppliedHashObj = Get-FileHash -Path $AsarFile -Algorithm SHA256
$AppliedHash = $AppliedHashObj.Hash

Write-Host "  Patched Temp Hash: $ExpectedPatchedHash"
Write-Host "  System Applied Hash: $AppliedHash"

# ----------------------------------------------------------------------------
# 6. Post-patch Verification & Auto-recovery
# ----------------------------------------------------------------------------
if ($AppliedHash -ne $ExpectedPatchedHash) {
    Write-Host ""
    Write-Host "  [FATAL ERROR] Post-patch integrity check failed!" -ForegroundColor Red
    Write-Host "  The copied file hash does not match. The file might be corrupted." -ForegroundColor Red
    
    # Auto-recovery from backup
    Write-Host "  Restoring the original file from backup for safety..." -ForegroundColor Yellow
    if (Test-Path $BackupFile) {
        Copy-Item $BackupFile $AsarFile -Force
        Write-Host "  Restoration Complete: Successfully recovered original $AsarFile." -ForegroundColor Green
    } else {
        Write-Host "  [CRITICAL] Backup file (app.asar.bak) not found! Cannot recover." -ForegroundColor Red
    }
    
    # Cleanup temp
    Remove-Item $NewAsar -Force -ErrorAction SilentlyContinue
    Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "  Operation aborted." -ForegroundColor Red
    Pause
    exit 1
}

# Cleanup temp files on success
Remove-Item $NewAsar -Force
Remove-Item $TempExtract -Recurse -Force

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Japanese localization applied successfully!" -ForegroundColor Green
Write-Host " Please (re)start the Antigravity app." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Pause

