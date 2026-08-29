import fs from 'fs';
const file = 'src/diagnostics/diagnostics.service.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/catch \(error\)/g, 'catch (error: any)');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed diagnostics.service.ts');
