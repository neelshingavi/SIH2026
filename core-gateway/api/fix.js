import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else if (filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walkDir('src');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // regex to find relative imports not ending in .js (or .ts)
    // format: from './...' or from "../..."
    const newContent = content.replace(/from\s+['"](\.[^'"]*)(?<!\.js)['"]/g, "from '$1.js'");
    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Fixed ${file}`);
    }
}
