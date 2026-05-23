const fs = require('fs');
const path = 'c:/OriginalCode/Antigravity_Jpn_mod/app_extracted/dist/preload.js';
const jsonPath = 'c:/OriginalCode/Antigravity_Jpn_mod/japanese_patch.json';

let content = fs.readFileSync(path, 'utf8');
const patchData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const jaString = 'const JA_TRANSLATIONS = ' + JSON.stringify(patchData.JA_TRANSLATIONS, null, 4) + ';';
const mcpString = 'const MCP_DESCRIPTIONS = ' + JSON.stringify(patchData.MCP_DESCRIPTIONS, null, 4) + ';';

const regex = /let JA_TRANSLATIONS = \{\};[\s\S]*?console\.error\('Failed to load japanese_patch\.json:', e\);\n\}/;

const replacement = `${jaString}\n\n${mcpString}`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully restored hardcoded translations in preload.js');
} else {
    console.error('Failed to find dynamic load block in preload.js');
}
