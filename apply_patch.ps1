# ============================================================================
# Antigravity 2.0 日本語化パッチ — 方式C: 翻訳済みファイル差し替え
# ============================================================================
# 使用方法: .\apply_patch.ps1
# 復元方法: .\apply_patch.ps1 -Restore
# ============================================================================

param(
    [switch]$Restore
)

$ErrorActionPreference = "Stop"

# --- 設定 ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$AsarUnpacked = Join-Path $ResourcesPath "app.asar.unpacked"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$BackupUnpacked = Join-Path $ResourcesPath "app.asar.unpacked.bak"
$ScriptDir = $PSScriptRoot
$PatchedFiles = Join-Path $ScriptDir "patched_files"
$TempExtract = Join-Path $ScriptDir "_temp_extract"

# --- 前提確認 ---
if (-not (Test-Path $AsarFile)) {
    Write-Host "エラー: app.asar が見つかりません: $AsarFile" -ForegroundColor Red
    Write-Host "Antigravity 2.0 がインストールされていることを確認してください。"
    exit 1
}

# --- 復元モード ---
if ($Restore) {
    Write-Host "=== Antigravity 日本語パッチの復元 ===" -ForegroundColor Yellow
    if (-not (Test-Path $BackupFile)) {
        Write-Host "エラー: バックアップファイルが見つかりません: $BackupFile" -ForegroundColor Red
        exit 1
    }
    Copy-Item $BackupFile $AsarFile -Force
    if (Test-Path $BackupUnpacked) {
        if (Test-Path $AsarUnpacked) { Remove-Item $AsarUnpacked -Recurse -Force }
        Copy-Item $BackupUnpacked $AsarUnpacked -Recurse -Force
    }
    Write-Host "復元完了！元の英語版に戻しました。" -ForegroundColor Green
    exit 0
}

# --- パッチ適用モード ---
Write-Host "=== Antigravity 2.0 日本語化パッチ適用 ===" -ForegroundColor Cyan
Write-Host ""

# 1. バックアップ
Write-Host "[1/5] バックアップを作成中..." -ForegroundColor Yellow
if (-not (Test-Path $BackupFile)) {
    Copy-Item $AsarFile $BackupFile -Force
    Write-Host "  app.asar のバックアップ完了" -ForegroundColor Green
} else {
    Write-Host "  バックアップは既に存在します（スキップ）" -ForegroundColor DarkYellow
}
if ((Test-Path $AsarUnpacked) -and (-not (Test-Path $BackupUnpacked))) {
    Copy-Item $AsarUnpacked $BackupUnpacked -Recurse -Force
    Write-Host "  app.asar.unpacked のバックアップ完了" -ForegroundColor Green
}

# 2. asar展開
Write-Host "[2/5] app.asar を展開中..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
cmd /c "npx -y @electron/asar extract `"$AsarFile`" `"$TempExtract`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: asar展開に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "  展開完了" -ForegroundColor Green

# 3. 翻訳済みファイルで差し替え
Write-Host "[3/5] 翻訳済みファイルを適用中..." -ForegroundColor Yellow
$files = @(
    "dist\main.js",
    "dist\menu.js",
    "dist\tray.js",
    "dist\updater.js",
    "dist\loadingOverlay.js",
    "dist\ipcHandlers.js",
    "dist\languageServer.js",
    "dist\preload.js",
    "dist\ideInstall\wizardHtml.js"
)
foreach ($f in $files) {
    $src = Join-Path $PatchedFiles $f
    $dst = Join-Path $TempExtract $f
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  適用: $f" -ForegroundColor Green
    } else {
        Write-Host "  警告: $src が見つかりません" -ForegroundColor Yellow
    }
}

# 4. 再パッケージ
Write-Host "[4/5] app.asar を再パッケージ中..." -ForegroundColor Yellow
$newAsar = Join-Path $ScriptDir "_temp_patched.asar"
cmd /c "npx -y @electron/asar pack `"$TempExtract`" `"$newAsar`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 再パッケージに失敗しました" -ForegroundColor Red
    exit 1
}
Copy-Item $newAsar $AsarFile -Force
Remove-Item $newAsar -Force -ErrorAction SilentlyContinue
Write-Host "  再パッケージ完了" -ForegroundColor Green

# 5. クリーンアップ
Write-Host "[5/5] 一時ファイルを削除中..." -ForegroundColor Yellow
Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  クリーンアップ完了" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " 日本語化パッチの適用が完了しました！" -ForegroundColor Cyan
Write-Host " Antigravity を再起動してください。" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Cyan
Write-Host " 元に戻す場合: .\apply_patch.ps1 -Restore" -ForegroundColor DarkCyan
Write-Host "============================================" -ForegroundColor Cyan
