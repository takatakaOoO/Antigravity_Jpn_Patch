const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];
const patchFile = process.argv[3];

if (!targetFile || !patchFile) {
    console.error('Usage: node apply_patch.js <path_to_preload.js> <path_to_japanese_patch.json>');
    process.exit(1);
}

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

try {
    let content = fs.readFileSync(targetFile, 'utf8');
    const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

    const jaString = 'const JA_TRANSLATIONS = ' + JSON.stringify(patchData.JA_TRANSLATIONS, null, 4) + ';';
    const mcpString = 'const MCP_DESCRIPTIONS = ' + JSON.stringify(patchData.MCP_DESCRIPTIONS, null, 4) + ';';

    const replacement = `// --- Antigravity Japanese Patch Start ---\n${jaString}\n\n${mcpString}\n${TRANSLATION_ENGINE}\n// --- Antigravity Japanese Patch End ---`;

    // 既に日本語化パッチのブロックが埋め込まれているかチェック
    const regexPatchBlock = /\/\/ --- Antigravity Japanese Patch Start ---[\s\S]*?\/\/ --- Antigravity Japanese Patch End ---/;
    
    // 互換性フォールバック：以前の古い形式で直接埋め込まれている場合
    const regexOldOriginal = /const JA_TRANSLATIONS = \{[\s\S]*?const MCP_DESCRIPTIONS = \[[\s\S]*?\];/;

    let updatedContent = '';
    let isUpdated = false;

    if (regexPatchBlock.test(content)) {
        // すでに専用ブロックがある場合は、そのブロックを最新の辞書とエンジンで置換
        updatedContent = content.replace(regexPatchBlock, replacement);
        isUpdated = true;
        console.log('Existing Japanese Patch block updated.');
    } else if (regexOldOriginal.test(content)) {
        // 古いハードコーディング形式を見つけた場合は、それを専用ブロックごと置換
        updatedContent = content.replace(regexOldOriginal, replacement);
        isUpdated = true;
        console.log('Old style translation block upgraded to new patch block.');
    } else {
        // クリーンな純正 preload.js の場合は、末尾に新規注入
        updatedContent = content.trim() + '\n\n' + replacement + '\n';
        isUpdated = true;
        console.log('New Japanese Patch block successfully injected into preload.js.');
    }

    if (isUpdated) {
        fs.writeFileSync(targetFile, updatedContent, 'utf8');
        console.log('Successfully completed applying translation patch to preload.js');
    } else {
        console.error('Failed to apply translation patch. Preload.js could not be modified.');
        process.exit(1);
    }
} catch (e) {
    console.error('Error applying patch:', e);
    process.exit(1);
}
