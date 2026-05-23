const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];
const patchFile = process.argv[3];

if (!targetFile || !patchFile) {
    console.error('Usage: node apply_patch.js <path_to_preload.js> <path_to_japanese_patch.json>');
    process.exit(1);
}

try {
    let content = fs.readFileSync(targetFile, 'utf8');
    const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

    const jaString = 'const JA_TRANSLATIONS = ' + JSON.stringify(patchData.JA_TRANSLATIONS, null, 4) + ';';
    const mcpString = 'const MCP_DESCRIPTIONS = ' + JSON.stringify(patchData.MCP_DESCRIPTIONS, null, 4) + ';';

    // 正規表現で既存の JA_TRANSLATIONS と MCP_DESCRIPTIONS を探す
    // 元がハードコーディングされている場合
    const regexOriginal = /const JA_TRANSLATIONS = \{[\s\S]*?const MCP_DESCRIPTIONS = \[[\s\S]*?\];/;
    
    // もしすでに誰かが別の手法で置換していた場合のフォールバック（let JA_TRANSLATIONS = {}; ...）
    const regexDynamic = /let JA_TRANSLATIONS = \{\};[\s\S]*?console\.error\('Failed to load japanese_patch\.json:', e\);\n\}/;

    const replacement = `${jaString}\n\n${mcpString}`;

    let updated = false;
    if (regexOriginal.test(content)) {
        content = content.replace(regexOriginal, replacement);
        updated = true;
    } else if (regexDynamic.test(content)) {
        content = content.replace(regexDynamic, replacement);
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Successfully injected japanese translations into preload.js');
    } else {
        console.error('Failed to find translation dictionaries in preload.js. It may have been updated or modified.');
        process.exit(1);
    }
} catch (e) {
    console.error('Error applying patch:', e);
    process.exit(1);
}
