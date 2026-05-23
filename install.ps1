# ============================================================================
# Antigravity 2.0 日本語化パッチ 適用スクリプト
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity 2.0 日本語化パッチ 適用ツール ===" -ForegroundColor Cyan
Write-Host "このスクリプトは、AntigravityのUIを日本語化します。"

# --- パスの設定 ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$ScriptDir = $PSScriptRoot
$TempExtract = Join-Path $ScriptDir "_temp_extract"
$PatchScript = Join-Path $ScriptDir "apply_patch.js"
$PatchData = Join-Path $ScriptDir "japanese_patch.json"

# --- 前提確認 ---
if (-not (Test-Path $AsarFile)) {
    Write-Host "エラー: app.asar が見つかりません: $AsarFile" -ForegroundColor Red
    Write-Host "Antigravity 2.0 がインストールされていることを確認してください。"
    Pause
    exit 1
}

# 1. バックアップ
Write-Host "`n[1/4] オリジナルファイルのバックアップを作成中..." -ForegroundColor Yellow
if (-not (Test-Path $BackupFile)) {
    Copy-Item $AsarFile $BackupFile -Force
    Write-Host "  バックアップ完了: app.asar.bak" -ForegroundColor Green
} else {
    Write-Host "  バックアップは既に存在します" -ForegroundColor DarkYellow
}

# 2. asar展開
Write-Host "`n[2/4] アプリのデータを展開中..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
cmd /c "npx -y @electron/asar extract `"$AsarFile`" `"$TempExtract`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 展開に失敗しました。Node.jsがインストールされているか確認してください。" -ForegroundColor Red
    Pause
    exit 1
}

# 3. 辞書データの注入
Write-Host "`n[3/4] 日本語翻訳データを適用中..." -ForegroundColor Yellow
$PreloadJs = Join-Path $TempExtract "dist\preload.js"
node $PatchScript $PreloadJs $PatchData
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 翻訳データの適用に失敗しました。" -ForegroundColor Red
    Pause
    exit 1
}

# 4. 再パッケージ
Write-Host "`n[4/4] アプリを再構成中..." -ForegroundColor Yellow
$NewAsar = Join-Path $ScriptDir "_temp_patched.asar"
cmd /c "npx -y @electron/asar pack `"$TempExtract`" `"$NewAsar`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 再構成に失敗しました。" -ForegroundColor Red
    Pause
    exit 1
}

# 適用とクリーンアップ
Copy-Item $NewAsar $AsarFile -Force
Remove-Item $NewAsar -Force
Remove-Item $TempExtract -Recurse -Force

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " 日本語化が完了しました！" -ForegroundColor Green
Write-Host " Antigravity アプリを（再）起動してご確認ください。" -ForegroundColor Cyan
Write-Host "============================================`n"
Pause
