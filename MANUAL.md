# Antigravity 日本語化パッチ マニュアル

## 1. 翻訳データの仕組み
このパッチは、AntigravityのUIやツールの説明文を日本語化します。
翻訳データはすべて `japanese_patch.json` というファイルで管理されています。
アプリ本体にこのファイルを読み込ませることで、UIを動的に日本語に置き換えます。

## 2. 自分で翻訳を追加・修正する方法
今後、新しい画面や未翻訳のテキストを見つけた場合は、以下の手順でご自身で翻訳を追加できます。

1. **翻訳ファイルの場所を開く**
   以下のフォルダにある `japanese_patch.json` をメモ帳やVSCodeなどで開きます。
   `C:\Users\<ユーザー名>\AppData\Local\Programs\Antigravity\resources\japanese_patch.json`
   （※Macの場合は `/Applications/Antigravity.app/Contents/Resources/japanese_patch.json` など）

2. **テキストを追加する**
   - **完全一致する短いテキストの場合（メニューなど）**:
     `"JA_TRANSLATIONS"` のブロックの中に、`"英語の元のテキスト": "日本語のテキスト",` を追加します。
   - **長い説明文などの場合（MCPやスキル説明など）**:
     `"MCP_DESCRIPTIONS"` のブロックの中に、`{"prefix": "英語の先頭部分...", "translation": "日本語訳"},` を追加します。

3. **反映させる**
   ファイルを保存し、Antigravityのアプリを一度完全に終了（メニューバーからも終了）させてから、再度起動すると新しい翻訳が反映されます。

## 3. アプリのアップデート時の再適用手順
Antigravity本体のバージョンアップが行われた場合、`preload.js` が上書きされるため日本語化が外れてしまいます。
その場合は以下の手順で再度パッチを適用してください。

1. **app.asar の解凍**
   コマンドプロンプトやPowerShellで以下のコマンドを実行し、アプリのリソースを展開します。
   ```bash
   npx @electron/asar extract "C:\Users\<ユーザー名>\AppData\Local\Programs\Antigravity\resources\app.asar" app_extracted
   ```

2. **preload.js に読み込み処理を追加**
   展開された `app_extracted\dist\preload.js` を開き、以下のコードを挿入します（テキストの翻訳処理関数など）。
   ※具体的なコードは、このリポジトリの履歴や `update_preload.js` を参照してください。

3. **再パッケージ化と上書き**
   ```bash
   npx @electron/asar pack app_extracted app.asar
   ```
   作成された `app.asar` を元の `resources/app.asar` に上書きコピーします。
