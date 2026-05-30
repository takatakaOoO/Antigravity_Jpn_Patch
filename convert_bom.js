const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];

if (!targetFile) {
    console.error('Usage: node convert_bom.js <path_to_file>');
    process.exit(1);
}

try {
    const absolutePath = path.resolve(targetFile);
    let content = fs.readFileSync(absolutePath, 'utf8');
    
    // すでにBOMがあるかチェック
    if (!content.startsWith('\uFEFF')) {
        content = '\uFEFF' + content; // UTF-8 BOMを付与
        fs.writeFileSync(absolutePath, content, 'utf8');
        console.log(`Successfully added UTF-8 BOM to ${targetFile}`);
    } else {
        console.log(`File ${targetFile} already has UTF-8 BOM.`);
    }
} catch (e) {
    console.error('Error adding BOM:', e);
    process.exit(1);
}
