# ============================================================================
# Antigravity 日本語化パッチ適用スクリプト (ハッシュ検証 ＆ 自動復旧機能付き)
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity 日本語化パッチ適用スクリプト ===" -ForegroundColor Cyan
Write-Host "このスクリプトは、Antigravityに日本語化パッチを安全に適用します。"

# --- パス設定 ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$ScriptDir = $PSScriptRoot
$TempExtract = Join-Path $ScriptDir "_temp_extract"
$PatchScript = Join-Path $ScriptDir "apply_patch.js"
$PatchData = Join-Path $ScriptDir "japanese_patch.json"

# 公式最新純正 app.asar (v2.0.10) の SHA-256 ハッシュ値
$ExpectedHash = "7EBE22606F03EAA7CDD0A0384B6240A0E5E20064C5EFCC0DA446A38F33AAC74B"

# --- 前提条件のチェック ---
if (-not (Test-Path $AsarFile)) {
    Write-Host "エラー: $AsarFile が見つかりません。" -ForegroundColor Red
    Write-Host "Antigravityが正しくインストールされているか確認してください。"
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 1. 適用前のオリジナル整合性検証 (CRCチェック)
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[準備] オリジナルファイル（app.asar）の整合性を検証しています（SHA-256）..." -ForegroundColor Yellow
$CurrentHashObj = Get-FileHash -Path $AsarFile -Algorithm SHA256
$CurrentHash = $CurrentHashObj.Hash

Write-Host "  現在のハッシュ値:       $CurrentHash"
Write-Host "  公式純正ハッシュ値:     $ExpectedHash"

if ($CurrentHash -ne $ExpectedHash) {
    Write-Host ""
    Write-Host "  [警告] オリジナルファイル（app.asar）の整合性検証に失敗しました！" -ForegroundColor Red
    Write-Host "  ------------------------------------------------------------------"
    Write-Host "  * このファイルは既に日本語化されているか、異なるバージョンの可能性があります。"
    Write-Host "  * ハッシュ値が不一致のまま適用を続行すると、アプリが正常に起動しなくなる恐れがあります。"
    Write-Host "  ------------------------------------------------------------------"
    
    $confirm = Read-Host "  インストールを安全に中止しますか？ (Y/n) (※推奨: Y)"
    if ($confirm -notmatch "^n$|^no$") {
        Write-Host ""
        Write-Host "  ユーザーによってキャンセルされました。安全に終了します。" -ForegroundColor Yellow
        Pause
        exit 1
    }
    Write-Host "  警告を無視して続行します。動作保証外となりますのでご注意ください。" -ForegroundColor DarkYellow
} else {
    Write-Host "  整合性検証に合格しました！ 公式純正の app.asar を検出しました。" -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# 2. バックアップの作成
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[1/4] オリジナルの app.asar をバックアップしています..." -ForegroundColor Yellow
if (-not (Test-Path $BackupFile)) {
    Copy-Item $AsarFile $BackupFile -Force
    Write-Host "  バックアップが正常に作成されました: app.asar.bak" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  [警告] バックアップファイル（app.asar.bak）が既に存在します！" -ForegroundColor DarkYellow
    Write-Host "  ------------------------------------------------------------------"
    Write-Host "  * Antigravityをアップデートした直後の場合は、[y] を入力して上書きしてください。"
    Write-Host "  * 翻訳辞書データのみを更新する場合は、[n] を入力して上書きをスキップしてください。"
    Write-Host "  * 注意: パッチ適用済みのバックアップを上書きすると、元の純正状態に復元できなくなります。"
    Write-Host "  ------------------------------------------------------------------"
    
    $overwrite = Read-Host "  現在のクリーンな状態でバックアップファイルを上書きしますか？ (y/N)"
    if ($overwrite -match "^y$|^yes$") {
        Copy-Item $AsarFile $BackupFile -Force
        Write-Host "  バックアップが正常に上書きされました: app.asar.bak" -ForegroundColor Green
    } else {
        Write-Host "  既存のバックアップファイルを保持しました（上書きスキップ）" -ForegroundColor Green
    }
}

# ----------------------------------------------------------------------------
# 3. ASAR の展開
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] アプリケーションのコンテンツを展開しています..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }

# エスケープを回避し、安全に実行プロセスを呼び出す配列引数
$ExtractArgs = @("/c", "npx", "-y", "@electron/asar", "extract", ('"' + $AsarFile + '"'), ('"' + $TempExtract + '"'))
$process = Start-Process -FilePath "cmd" -ArgumentList $ExtractArgs -NoNewWindow -PassThru -Wait

if ($process.ExitCode -ne 0) {
    Write-Host "エラー: アプリケーションの展開に失敗しました。Node.jsが正しくインストールされているか確認してください。" -ForegroundColor Red
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 4. 翻訳データの注入
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] 日本語化翻訳パッチを適用しています..." -ForegroundColor Yellow
$PreloadJs = Join-Path $TempExtract "dist\preload.js"
node $PatchScript $PreloadJs $PatchData
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 翻訳データの注入に失敗しました。" -ForegroundColor Red
    Pause
    exit 1
}

# ----------------------------------------------------------------------------
# 5. ASAR の再パッケージ化 ＆ ハッシュ整合性検証
# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] アプリケーションのコンテンツを再パッケージしています..." -ForegroundColor Yellow
$NewAsar = Join-Path $ScriptDir "_temp_patched.asar"

# エスケープを回避し、安全に実行プロセスを呼び出す配列引数
$PackArgs = @("/c", "npx", "-y", "@electron/asar", "pack", ('"' + $TempExtract + '"'), ('"' + $NewAsar + '"'))
$process = Start-Process -FilePath "cmd" -ArgumentList $PackArgs -NoNewWindow -PassThru -Wait

if ($process.ExitCode -ne 0) {
    Write-Host "エラー: 再パッケージ化に失敗しました。" -ForegroundColor Red
    Pause
    exit 1
}

# パッチ適用直後の一時ファイルのハッシュ値を測定
$PatchedHashObj = Get-FileHash -Path $NewAsar -Algorithm SHA256
$ExpectedPatchedHash = $PatchedHashObj.Hash

Write-Host ""
Write-Host "[適用] パッチ適用済みファイルをシステムへコピーしています..." -ForegroundColor Yellow
Copy-Item $NewAsar $AsarFile -Force

# システムに配置されたファイルのハッシュ値を再度測定
$AppliedHashObj = Get-FileHash -Path $AsarFile -Algorithm SHA256
$AppliedHash = $AppliedHashObj.Hash

Write-Host "  パッチ適用一時ファイルのハッシュ: $ExpectedPatchedHash"
Write-Host "  システム適用後のハッシュ:        $AppliedHash"

# ----------------------------------------------------------------------------
# 6. 適用後の整合性検証 ＆ 自動復旧（リカバリ）
# ----------------------------------------------------------------------------
if ($AppliedHash -ne $ExpectedPatchedHash) {
    Write-Host ""
    Write-Host "  [致命的エラー] 適用後のハッシュ整合性検証に失敗しました！" -ForegroundColor Red
    Write-Host "  システムへコピーされたハッシュ値が一致しません。ファイルが破損している可能性があります。" -ForegroundColor Red
    
    # バックアップからの自動復旧
    Write-Host "  安全のため、直前に作成したバックアップからオリジナルの純正ファイルを復元しています..." -ForegroundColor Yellow
    if (Test-Path $BackupFile) {
        Copy-Item $BackupFile $AsarFile -Force
        Write-Host "  復元完了: オリジナルの $AsarFile を正常に復旧しました。" -ForegroundColor Green
    } else {
        Write-Host "  [重大な警告] バックアップファイル（app.asar.bak）が見つかりません！復元できません。" -ForegroundColor Red
    }
    
    # 一時ファイルの削除
    Remove-Item $NewAsar -Force -ErrorAction SilentlyContinue
    Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "  パッチの適用処理を安全に中止しました。" -ForegroundColor Red
    Pause
    exit 1
}

# 成功時のクリーンアップ
Remove-Item $NewAsar -Force
Remove-Item $TempExtract -Recurse -Force

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " 日本語化パッチが正常に適用されました！" -ForegroundColor Green
Write-Host " Antigravityアプリを起動（または再起動）してください。" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Pause
