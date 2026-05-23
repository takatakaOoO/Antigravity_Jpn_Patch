# ============================================================================
# Antigravity 2.0 日本語化パッチ アンインストール（復元）スクリプト
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity 2.0 日本語化パッチ 復元ツール ===" -ForegroundColor Yellow
Write-Host "このスクリプトは、Antigravityを元の英語版に復元します。"

# --- パスの設定 ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"

# --- 復元処理 ---
if (-not (Test-Path $BackupFile)) {
    Write-Host "エラー: バックアップファイルが見つかりません: $BackupFile" -ForegroundColor Red
    Write-Host "パッチ適用前のバックアップが存在しないため、復元できません。"
    Pause
    exit 1
}

Write-Host "`nバックアップからオリジナルファイルを復元中..." -ForegroundColor Yellow
Copy-Item $BackupFile $AsarFile -Force

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " 復元が完了しました！" -ForegroundColor Green
Write-Host " Antigravity アプリを（再）起動してご確認ください。" -ForegroundColor Cyan
Write-Host "============================================`n"
Pause
