# ============================================================================
# Antigravity 2.0 日本語化パッチ 復元ツール (オリジナルに戻すパッチ)
# ============================================================================
# 使用方法: 右クリックして「PowerShell で実行」または .\restore_original.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$AsarUnpacked = Join-Path $ResourcesPath "app.asar.unpacked"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$BackupUnpacked = Join-Path $ResourcesPath "app.asar.unpacked.bak"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Antigravity 日本語パッチの復元" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $BackupFile)) {
    Write-Host "エラー: バックアップファイルが見つかりません" -ForegroundColor Red
    Write-Host "  期待するパス: $BackupFile"
    Write-Host ""
    Write-Host "パッチ適用前にバックアップが作成されていないため、復元できません。" -ForegroundColor Yellow
    Write-Host "Antigravity を一度アンインストールし、再度インストールしてください。" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Enterキーを押して終了します"
    exit 1
}

# app.asar を復元
Write-Host "[1/2] app.asar を復元中..." -ForegroundColor Yellow
Copy-Item $BackupFile $AsarFile -Force
Write-Host "  復元完了" -ForegroundColor Green

# app.asar.unpacked を復元
if (Test-Path $BackupUnpacked) {
    Write-Host "[2/2] app.asar.unpacked を復元中..." -ForegroundColor Yellow
    if (Test-Path $AsarUnpacked) {
        Remove-Item $AsarUnpacked -Recurse -Force
    }
    Copy-Item $BackupUnpacked $AsarUnpacked -Recurse -Force
    Write-Host "  復元完了" -ForegroundColor Green
} else {
    Write-Host "[2/2] app.asar.unpacked のバックアップなし（スキップ）" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " 元の英語版（オリジナル）に完全に復元しました！" -ForegroundColor Green
Write-Host " Antigravity を起動して確認してください。" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Read-Host "Enterキーを押して終了します"
