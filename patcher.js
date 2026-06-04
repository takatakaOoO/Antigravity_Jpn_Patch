const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const crypto = require('crypto');
const patchData = require('./japanese_patch.json');

const EXPECTED_HASH = "A791AEAC5768EB54BAEE60166EED149427110D8CD3CEE3B48842E7224734D5DF";

const TRANSLATION_ENGINE = `
// ===========================================================================
// WebUI 日本語化 — DOM翻訳スクリプト (Antigravity Jpn Mod)
// ===========================================================================
// Language Serverが配信するWebUIのテキストを日本語に置換する。
// MutationObserverでDOMの変更を監視し、動的に挿入されるテキストも翻訳する。

let isTranslating = false;

// エディタ（Monaco Editorなど）や干渉しやすい特定要素をスキップする判定関数
function shouldSkipElement(el) {
    try {
        if (!el) return false;
        if (el.nodeType !== 1) return false;
        
        const className = el.className;
        if (typeof className === 'string' && (
            className.includes('monaco-') || 
            className.includes('editor') || 
            className.includes('overflow-guard')
        )) {
            return true;
        }
        
        // 親要素を3階層上まで遡ってチェック
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 3) {
            const pClass = parent.className;
            if (typeof pClass === 'string' && (
                pClass.includes('monaco-') || 
                pClass.includes('editor') || 
                pClass.includes('overflow-guard')
            )) {
                return true;
            }
            parent = parent.parentElement;
            depth++;
        }
    } catch (e) {
        // 安全のために例外発生時はスキップしない
    }
    return false;
}

// テキストノードの翻訳を行う関数
function translateTextNode(node) {
    try {
        if (!node) return;
        if (node.__translated) return; // 既に翻訳済みならスキップ
        
        // アプリ側JSとの無限書き換え合戦（デッドロックフリーズ）を物理的に防ぐ制限
        node.__translation_count = node.__translation_count || 0;
        if (node.__translation_count > 3) {
            return; // 3回以上の書き換え競合時は強制スキップ
        }
        
        if (node.nodeType === 3) { // TEXT_NODE
            const text = node.textContent?.trim();
            if (!text) return;
            
            // 1. 完全一致の翻訳 (JA_TRANSLATIONS)
            if (typeof JA_TRANSLATIONS !== 'undefined' && JA_TRANSLATIONS[text]) {
                const newValue = node.textContent.replace(text, JA_TRANSLATIONS[text]);
                if (node.textContent !== newValue) {
                    node.__translation_count++;
                    node.textContent = newValue;
                    node.__translated = true; // 翻訳成功マーク
                }
                return;
            }
            
            // 2. 前方一致の翻訳 (MCP_DESCRIPTIONS / Skills)
            if (typeof MCP_DESCRIPTIONS !== 'undefined' && Array.isArray(MCP_DESCRIPTIONS)) {
                for (const desc of MCP_DESCRIPTIONS) {
                    if (desc && typeof desc.prefix === 'string' && text.startsWith(desc.prefix)) {
                        if (node.textContent !== desc.translation) {
                            node.__translation_count++;
                            node.textContent = desc.translation;
                            node.__translated = true; // 翻訳成功マーク
                        }
                        return;
                    }
                }
            }
            
            // 3. 部分一致の翻訳 (tools enabled 等の動的数値を含む表記)
            if (text.includes('tools enabled')) {
                const newValue = node.textContent.replace('tools enabled', '個のツールを有効化');
                if (node.textContent !== newValue) {
                    node.__translation_count++;
                    node.textContent = newValue;
                    node.__translated = true; // 翻訳成功マーク
                }
                return;
            }
            
            // 4. コマンド実行承認プロンプトの動的日本語化
            const normalizedText = text.replace(/\\s+/g, ' ');
            const matchProject = normalizedText.match(/^Yes,\\s+and\\s+always\\s+allow\\s+([\\s\\S]+?)\\s+in\\s+this\\s+project$/i);
            if (matchProject) {
                const cmd = matchProject[1];
                const newValue = 'はい、このプロジェクトでは ' + cmd + ' を常に許可する';
                if (node.textContent !== newValue) {
                    node.__translation_count++;
                    node.textContent = newValue;
                    node.__translated = true; // 翻訳成功マーク
                }
                return;
            }
            
            const matchAlways = normalizedText.match(/^Yes,\\s+and\\s+always\\s+allow\\s+([\\s\\S]+?)$/i);
            if (matchAlways) {
                const cmd = matchAlways[1];
                const newValue = 'はい、 ' + cmd + ' を常に許可する';
                if (node.textContent !== newValue) {
                    node.__translation_count++;
                    node.textContent = newValue;
                    node.__translated = true; // 翻訳成功マーク
                }
                return;
            }
        }
    } catch (e) {
        console.error('Error in translateTextNode:', e);
    }
}

// placeholder, title, aria-label 等の属性を翻訳する関数
function translateAttributes(el) {
    try {
        if (!el || typeof el.getAttribute !== 'function') return;
        if (shouldSkipElement(el)) return; // エディタ等の要素ならスキップ
        
        const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
        for (const attr of attrs) {
            const val = el.getAttribute(attr);
            if (!val) continue;
            
            // 1. 完全一致
            if (typeof JA_TRANSLATIONS !== 'undefined' && JA_TRANSLATIONS[val]) {
                el.setAttribute(attr, JA_TRANSLATIONS[val]);
                continue;
            }
            
            // 2. 前方一致
            if (typeof MCP_DESCRIPTIONS !== 'undefined' && Array.isArray(MCP_DESCRIPTIONS)) {
                for (const desc of MCP_DESCRIPTIONS) {
                    if (desc && typeof desc.prefix === 'string' && val.startsWith(desc.prefix)) {
                        el.setAttribute(attr, desc.translation);
                        break;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error in translateAttributes:', e);
    }
}

// 要素とその子孫を再帰的に翻訳する関数
function translateElement(el) {
    try {
        if (!el) return;
        if (shouldSkipElement(el)) return; // エディタ等の要素ならスキップ
        
        // 1. テキストノードを安全に配列に抽出（走査中のDOM改変による無限ループを防ぐ）
        const textNodes = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // 2. 抽出したテキストノードに対して安全に翻訳を適用
        for (const textNode of textNodes) {
            translateTextNode(textNode);
        }
        
        // 3. 属性を翻訳（対象属性を持つ要素だけをピンポイントで超高速スキャンし、負荷を劇的に排除）
        if (el.nodeType === 1) { // ELEMENT_NODE
            translateAttributes(el);
            if (typeof el.querySelectorAll === 'function') {
                const children = el.querySelectorAll('[placeholder], [title], [aria-label], [alt]');
                for (const child of children) {
                    if (!shouldSkipElement(child)) {
                        translateAttributes(child);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error in translateElement:', e);
    }
}

// DOMContentLoaded後にMutationObserverを起動
window.addEventListener('DOMContentLoaded', () => {
    try {
        // 初回翻訳
        isTranslating = true;
        try {
            translateElement(document.body);
        } finally {
            isTranslating = false;
        }
        
        // DOMの変更を監視して動的に翻訳
        const observer = new MutationObserver((mutations) => {
            if (isTranslating) return; // 翻訳実行中のDOM変更イベントはすべて無視（無限ループ完全防止）
            
            try {
                isTranslating = true;
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const added of mutation.addedNodes) {
                            if (added.nodeType === 1) { // ELEMENT_NODE
                                if (!shouldSkipElement(added)) {
                                    translateElement(added);
                                }
                            } else if (added.nodeType === 3) { // TEXT_NODE
                                // テキストノードの親がエディタ関連ならスキップ
                                if (added.parentElement && shouldSkipElement(added.parentElement)) {
                                    continue;
                                }
                                // アプリ側の動的更新に対応するため、翻訳マークを一度リセット
                                added.__translated = false;
                                translateTextNode(added);
                            }
                        }
                    } else if (mutation.type === 'characterData') {
                        // テキストノードの親がエディタ関連ならスキップ
                        const targetParent = mutation.target.parentElement;
                        if (targetParent && shouldSkipElement(targetParent)) {
                            continue;
                        }
                        // アプリ側の動的更新に対応するため、翻訳マークを一度リセット
                        mutation.target.__translated = false;
                        translateTextNode(mutation.target);
                    }
                }
            } catch (innerError) {
                console.error('Error in mutation processing:', innerError);
            } finally {
                isTranslating = false;
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    } catch (outerError) {
        console.error('Error starting MutationObserver:', outerError);
    }
});
`;

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex').toUpperCase();
}

async function main() {
    console.log("=== Antigravity 日本語化パッチ適用ツール ===");
    console.log("このツールは、Antigravityに日本語化パッチを安全に適用します。");

    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
        console.error("エラー: LOCALAPPDATA環境変数が見つかりません。");
        process.exit(1);
    }

    const antigravityPath = path.join(localAppData, 'Programs', 'Antigravity');
    const resourcesPath = path.join(antigravityPath, 'resources');
    const asarFile = path.join(resourcesPath, 'app.asar');
    const backupFile = path.join(resourcesPath, 'app.asar.bak');
    const tempExtract = path.join(resourcesPath, '_temp_extract_jpn');

    if (!fs.existsSync(asarFile)) {
        console.error("エラー: " + asarFile + " が見つかりません。");
        console.error("Antigravityが正しくインストールされているか確認してください。");
        process.exit(1);
    }

    console.log("\\n[準備] オリジナルファイル（app.asar）の整合性を検証しています（SHA-256）...");
    const currentHash = getFileHash(asarFile);
    console.log("  現在のハッシュ値:       " + currentHash);
    console.log("  公式純正ハッシュ値:     " + EXPECTED_HASH);

    if (currentHash !== EXPECTED_HASH) {
        console.log("\\n  [警告] オリジナルファイル（app.asar）の整合性検証に失敗しました！");
        console.log("  ------------------------------------------------------------------");
        console.log("  * このファイルは既に日本語化されているか、異なるバージョンの可能性があります。");
        console.log("  * ハッシュ値が不一致のまま適用を続行すると、アプリが正常に起動しなくなる恐れがあります。");
        console.log("  ------------------------------------------------------------------");
        console.log("  自動実行モード: 警告を無視して適用を続行します。動作保証外となりますのでご注意ください。");
    } else {
        console.log("  整合性検証に合格しました！ 公式純正の app.asar を検出しました。");
    }

    console.log("\\n[1/4] オリジナルの app.asar をバックアップしています...");
    if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(asarFile, backupFile);
        console.log("  バックアップが正常に作成されました: app.asar.bak");
    } else {
        console.log("\\n  [警告] バックアップファイル（app.asar.bak）が既に存在します！");
        console.log("  自動実行モード: 既存のバックアップファイルを安全に保持します（上書きスキップ）");
    }

    console.log("\\n[2/4] アプリケーションのコンテンツを展開しています...");
    if (fs.existsSync(tempExtract)) {
        fs.rmSync(tempExtract, { recursive: true, force: true });
    }
    
    try {
        asar.extractAll(asarFile, tempExtract);
    } catch (err) {
        console.error("エラー: アプリケーションの展開に失敗しました。", err);
        process.exit(1);
    }

    console.log("\\n[3/4] 日本語化翻訳パッチを適用しています...");
    const preloadJsPath = path.join(tempExtract, 'dist', 'preload.js');
    if (!fs.existsSync(preloadJsPath)) {
        console.error("エラー: 展開先に preload.js が見つかりません。");
        process.exit(1);
    }

    try {
        let content = fs.readFileSync(preloadJsPath, 'utf8');

        const jaString = 'const JA_TRANSLATIONS = ' + JSON.stringify(patchData.JA_TRANSLATIONS, null, 4) + ';';
        const mcpString = 'const MCP_DESCRIPTIONS = ' + JSON.stringify(patchData.MCP_DESCRIPTIONS, null, 4) + ';';
        const replacement = '// --- Antigravity Japanese Patch Start ---\\n' + jaString + '\\n\\n' + mcpString + '\\n' + TRANSLATION_ENGINE + '\\n// --- Antigravity Japanese Patch End ---';

        const regexPatchBlock = new RegExp("\\\\/\\\\/ --- Antigravity Japanese Patch Start ---[\\\\s\\\\S]*?\\\\/\\\\/ --- Antigravity Japanese Patch End ---");
        const regexOldOriginal = new RegExp("const JA_TRANSLATIONS = \\\\{[\\\\s\\\\S]*?const MCP_DESCRIPTIONS = \\\\[[\\\\s\\\\S]*?\\\\];");

        let updatedContent = '';
        let isUpdated = false;

        if (regexPatchBlock.test(content)) {
            updatedContent = content.replace(regexPatchBlock, replacement);
            isUpdated = true;
            console.log('  Existing Japanese Patch block updated.');
        } else if (regexOldOriginal.test(content)) {
            updatedContent = content.replace(regexOldOriginal, replacement);
            isUpdated = true;
            console.log('  Old style translation block upgraded to new patch block.');
        } else {
            updatedContent = content.trim() + '\\n\\n' + replacement + '\\n';
            isUpdated = true;
            console.log('  New Japanese Patch block successfully injected into preload.js.');
        }

        if (isUpdated) {
            fs.writeFileSync(preloadJsPath, updatedContent, 'utf8');
        } else {
            throw new Error('Preload.js could not be modified.');
        }
    } catch (err) {
        console.error("エラー: 翻訳データの注入に失敗しました。", err);
        process.exit(1);
    }

    console.log("\\n[4/4] アプリケーションのコンテンツを再パッケージしています...");
    const tempAsar = path.join(resourcesPath, '_temp_patched.asar');
    try {
        await asar.createPackage(tempExtract, tempAsar);
    } catch (err) {
        console.error("エラー: 再パッケージ化に失敗しました。", err);
        process.exit(1);
    }

    const patchedHash = getFileHash(tempAsar);

    console.log("\\n[適用] パッチ適用済みファイルをシステムへコピーしています...");
    try {
        fs.copyFileSync(tempAsar, asarFile);
    } catch (err) {
        console.error("エラー: システムへのファイルコピーに失敗しました。", err);
        process.exit(1);
    }

    const appliedHash = getFileHash(asarFile);
    console.log("  パッチ適用一時ファイルのハッシュ: " + patchedHash);
    console.log("  システム適用後のハッシュ:        " + appliedHash);

    if (appliedHash !== patchedHash) {
        console.error("\\n  [致命的エラー] 適用後のハッシュ整合性検証に失敗しました！");
        console.log("  安全のため、直前に作成したバックアップからオリジナルの純正ファイルを復元しています...");
        if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, asarFile);
            console.log("  復元完了: オリジナルの app.asar を正常に復旧しました。");
        }
        
        fs.rmSync(tempAsar, { force: true });
        fs.rmSync(tempExtract, { recursive: true, force: true });
        process.exit(1);
    }

    // Cleanup
    if (fs.existsSync(tempAsar)) fs.rmSync(tempAsar, { force: true });
    if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });

    console.log("\\n=============================================");
    console.log(" 日本語化パッチが正常に適用されました！");
    console.log(" Antigravityアプリを起動（または再起動）してください。");
    console.log(" このウィンドウは数秒後に自動で閉じます。");
    console.log("=============================================\\n");

    // Wait 5 seconds before exiting so the user can see the message
    setTimeout(() => {
        process.exit(0);
    }, 5000);
}

main();
