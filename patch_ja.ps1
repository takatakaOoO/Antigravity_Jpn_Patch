# ============================================================================
# Antigravity 2.0 日本語化パッチ — 方式A: 文字列パターン置換
# ============================================================================
# 使用方法: .\patch_ja.ps1
# 特徴: ファイルの行番号に依存せず、文字列パターンで置換するため
#        Antigravityのマイナーバージョンアップにも対応しやすい
# ============================================================================

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# --- 設定 ---
$AntigravityPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity"
$ResourcesPath = Join-Path $AntigravityPath "resources"
$AsarFile = Join-Path $ResourcesPath "app.asar"
$AsarUnpacked = Join-Path $ResourcesPath "app.asar.unpacked"
$BackupFile = Join-Path $ResourcesPath "app.asar.bak"
$BackupUnpacked = Join-Path $ResourcesPath "app.asar.unpacked.bak"
$ScriptDir = $PSScriptRoot
$TempExtract = Join-Path $ScriptDir "_temp_patch_extract"

# --- 翻訳辞書（置換ルール） ---
# 形式: @{ ファイル = @( @(検索文字列, 置換文字列), ... ) }
$translations = @{
    "dist\main.js" = @(
        @("language_server binary not found at:", "言語サーバーのバイナリが見つかりません："),
        @("Please build set a valid location.", "有効なパスを設定してください。"),
        @("'Binary not found'", "'バイナリが見つかりません'"),
        @("'Startup failed'", "'起動に失敗しました'"),
        @("label: 'New Window',", "label: '新しいウィンドウ',"),
        @("label: 'No agents running',", "label: 'エージェントは実行されていません',"),
        @("label: ``Open `${electron_1.app.getName()}``", "label: ``${electron_1.app.getName()} を開く``"),
        @("label: 'Quit',", "label: '終了',"),
        @("buttons: ['Cancel', 'Quit'],", "buttons: ['キャンセル', '終了'],"),
        @("title: 'Confirm Quit',", "title: '終了の確認',"),
        @("message: 'Are you sure you want to quit?',", "message: '本当に終了しますか？',"),
        @("detail: 'There may be agents or background tasks running.',", "detail: 'エージェントやバックグラウンドタスクが実行中の可能性があります。',")
    )
    "dist\menu.js" = @(
        @("label: 'New Window',", "label: '新しいウィンドウ',"),
        @("label: 'Docs',", "label: 'ドキュメント',")
    )
    "dist\updater.js" = @(
        @('"Check for Updates"', '"アップデートを確認"'),
        @('"Checking for Updates..."', '"アップデートを確認中..."'),
        @('"Downloading Update..."', '"アップデートをダウンロード中..."'),
        @('"Restart to Update"', '"再起動してアップデート"'),
        @("title: 'Check for Updates',", "title: 'アップデートを確認',"),
        @("message: 'No updates available',", "message: 'アップデートはありません',")
    )
    "dist\ipcHandlers.js" = @(
        @("title: 'Open workspace',", "title: 'ワークスペースを開く',")
    )
    "dist\languageServer.js" = @(
        @("Timeout: language server did not report its port within", "タイムアウト：言語サーバーが"),
        @("Please visit the following URL to authorize.", "認証のために以下のURLにアクセスしてください。"),
        @("After authorizing, paste the authorization code below.", "認証後、認証コードを以下に貼り付けてください。"),
        @("Language server exited unexpectedly", "言語サーバーが予期せず終了しました"),
        @("times in a row. Giving up.", "回連続でクラッシュしました。再起動を中止します。")
    )
}

# loadingOverlay.js と wizardHtml.js はテンプレートリテラル内のため別処理
$htmlReplacements = @{
    "dist\loadingOverlay.js" = @(
        @("Loading Antigravity", "Antigravity を読み込み中")
    )
    "dist\ideInstall\wizardHtml.js" = @(
        @("<title>Welcome to Antigravity</title>", "<title>Antigravity へようこそ</title>"),
        @("Setting up…", "セットアップ中…"),
        @("Welcome to the new Antigravity!", "新しい Antigravity へようこそ！"),
        @("Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE</b>.", "Antigravity はエージェントを中心に再設計されました。コードエディタが必要な場合は、<b>Antigravity IDE</b> として別途ダウンロードできます。"),
        @("Download the Antigravity IDE", "Antigravity IDE をダウンロード"),
        @("Explore the new Antigravity", "新しい Antigravity を体験する")
    )
}

# tray.js は特殊なロジック変更が必要
$trayOld = "(count > 0 ? ``$`{count}`` : 'No') +`n                    ' agent' +`n                    (count === 1 ? '' : 's') +`n                    ' running'"
$trayNew = "count > 0 ? ``エージェント $`{count}個 実行中`` : 'エージェントは実行されていません'"

# --- 前提確認 ---
if (-not (Test-Path $AsarFile)) {
    Write-Host "エラー: app.asar が見つかりません: $AsarFile" -ForegroundColor Red
    exit 1
}

Write-Host "=== Antigravity 2.0 日本語化パッチ (方式A) ===" -ForegroundColor Cyan
Write-Host ""

# 1. バックアップ
Write-Host "[1/5] バックアップを作成中..." -ForegroundColor Yellow
if (-not (Test-Path $BackupFile)) {
    Copy-Item $AsarFile $BackupFile -Force
    Write-Host "  バックアップ完了: $BackupFile" -ForegroundColor Green
} else {
    Write-Host "  バックアップは既に存在します（スキップ）" -ForegroundColor DarkYellow
}
if ((Test-Path $AsarUnpacked) -and (-not (Test-Path $BackupUnpacked))) {
    Copy-Item $AsarUnpacked $BackupUnpacked -Recurse -Force
}

# 2. asar展開
Write-Host "[2/5] app.asar を展開中..." -ForegroundColor Yellow
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
cmd /c "npx -y @electron/asar extract `"$AsarFile`" `"$TempExtract`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 展開失敗" -ForegroundColor Red; exit 1
}
Write-Host "  展開完了" -ForegroundColor Green

# 3. 文字列置換
Write-Host "[3/5] 文字列パターンを置換中..." -ForegroundColor Yellow
$totalReplacements = 0

# 通常の置換
foreach ($file in $translations.Keys) {
    $filePath = Join-Path $TempExtract $file
    if (-not (Test-Path $filePath)) {
        Write-Host "  警告: $file が見つかりません" -ForegroundColor Yellow
        continue
    }
    $content = [System.IO.File]::ReadAllText($filePath)
    $count = 0
    foreach ($pair in $translations[$file]) {
        if ($content.Contains($pair[0])) {
            $content = $content.Replace($pair[0], $pair[1])
            $count++
        }
    }
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    Write-Host "  $file : $count 箇所置換" -ForegroundColor Green
    $totalReplacements += $count
}

# HTML内テンプレートリテラルの置換
foreach ($file in $htmlReplacements.Keys) {
    $filePath = Join-Path $TempExtract $file
    if (-not (Test-Path $filePath)) { continue }
    $content = [System.IO.File]::ReadAllText($filePath)
    $count = 0
    foreach ($pair in $htmlReplacements[$file]) {
        if ($content.Contains($pair[0])) {
            $content = $content.Replace($pair[0], $pair[1])
            $count++
        }
    }
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    Write-Host "  $file : $count 箇所置換" -ForegroundColor Green
    $totalReplacements += $count
}

# tray.js 特殊処理
$trayPath = Join-Path $TempExtract "dist\tray.js"
if (Test-Path $trayPath) {
    $content = [System.IO.File]::ReadAllText($trayPath)
    $oldPattern = "(count > 0 ? ``${count}`` : 'No') +`n                    ' agent' +`n                    (count === 1 ? '' : 's') +`n                    ' running'"
    # 実際のファイル内容に基づいた置換
    $content = $content.Replace("(count > 0 ? `"`$`{count}`"" + ' : ''No'') +' + "`r`n" + '                    '' agent'' +' + "`r`n" + '                    (count === 1 ? '''' : ''s'') +' + "`r`n" + '                    '' running''', 'count > 0 ? `"エージェント `$`{count}個 実行中`" : ''エージェントは実行されていません''')
    # フォールバック: シンプルなパターン
    if ($content.Contains("'No') +")) {
        $content = $content -replace "\(count > 0 \? .+\) \+\s+' agent' \+\s+\(count === 1 \? '' : 's'\) \+\s+' running'", "count > 0 ? ``エージェント `${count}個 実行中`` : 'エージェントは実行されていません'"
    }
    [System.IO.File]::WriteAllText($trayPath, $content, $utf8NoBom)
    Write-Host "  dist\tray.js : ロジック書き換え完了" -ForegroundColor Green
    $totalReplacements++
}

# preload.js にWebUI翻訳スクリプトを注入
$preloadPath = Join-Path $TempExtract "dist\preload.js"
$preloadPatchSrc = Join-Path $PSScriptRoot "patched_files\dist\preload.js"
if ((Test-Path $preloadPath) -and (Test-Path $preloadPatchSrc)) {
    Copy-Item $preloadPatchSrc $preloadPath -Force
    Write-Host "  dist\preload.js : WebUI翻訳スクリプト注入完了" -ForegroundColor Green
    $totalReplacements++
}

Write-Host "  合計: $totalReplacements 箇所" -ForegroundColor Cyan

# 4. 再パッケージ
Write-Host "[4/5] app.asar を再パッケージ中..." -ForegroundColor Yellow
$newAsar = Join-Path $ScriptDir "_temp_patched_a.asar"
cmd /c "npx -y @electron/asar pack `"$TempExtract`" `"$newAsar`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 再パッケージ失敗" -ForegroundColor Red; exit 1
}
Copy-Item $newAsar $AsarFile -Force
Remove-Item $newAsar -Force -ErrorAction SilentlyContinue
Write-Host "  再パッケージ完了" -ForegroundColor Green

# 5. クリーンアップ
Write-Host "[5/5] クリーンアップ..." -ForegroundColor Yellow
Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  完了" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " 日本語化パッチの適用が完了しました！" -ForegroundColor Cyan
Write-Host " Antigravity を再起動してください。" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
