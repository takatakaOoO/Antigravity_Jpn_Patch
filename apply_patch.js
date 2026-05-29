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

// テキストノードの翻訳を行う関数
function translateTextNode(node) {
    if (node.nodeType === 3) { // TEXT_NODE
        const text = node.textContent?.trim();
        if (text && JA_TRANSLATIONS[text]) {
            node.textContent = node.textContent.replace(text, JA_TRANSLATIONS[text]);
        }
    }
}

// placeholder, title, aria-label 等の属性を翻訳する関数
function translateAttributes(el) {
    const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
    for (const attr of attrs) {
        const val = el.getAttribute?.(attr);
        if (val && JA_TRANSLATIONS[val]) {
            el.setAttribute(attr, JA_TRANSLATIONS[val]);
        }
    }
}

// 要素とその子孫を再帰的に翻訳する関数
function translateElement(el) {
    if (!el) return;
    // テキストノードを翻訳
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        translateTextNode(node);
    }
    // 属性を翻訳
    if (el.querySelectorAll) {
        const allElements = el.querySelectorAll('*');
        for (const child of allElements) {
            translateAttributes(child);
        }
        translateAttributes(el);
    }
}

// DOMContentLoaded後にMutationObserverを起動
window.addEventListener('DOMContentLoaded', () => {
    // 初回翻訳
    translateElement(document.body);
    // DOMの変更を監視して動的に翻訳
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const added of mutation.addedNodes) {
                    if (added.nodeType === 1) { // ELEMENT_NODE
                        translateElement(added);
                    } else if (added.nodeType === 3) { // TEXT_NODE
                        translateTextNode(added);
                    }
                }
            } else if (mutation.type === 'characterData') {
                translateTextNode(mutation.target);
            }
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
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
