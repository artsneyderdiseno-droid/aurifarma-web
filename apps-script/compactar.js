// Convierte Codigo.gs en una función por línea (sin comentarios internos) para escribirla en el editor de Apps Script
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const out = [];
let block = [];
let depth = 0;
for (const raw of src) {
  let line = raw.trim();
  if (!line) continue;
  if (depth === 0 && line.startsWith('//')) { out.push(line); continue; }
  if (depth === 0 && (line.startsWith('/**') || line.startsWith('*'))) {
    const text = line.replace(/^\/\*\*|\*\/$|^\*/g, '').trim();
    if (text) out.push(`// ${text}`);
    continue;
  }
  line = line.replace(/\s\/\/\s.*$/, '');
  if (line.startsWith('//')) continue;
  for (const ch of line) { if (ch === '{' || ch === '[' || ch === '(') depth++; if (ch === '}' || ch === ']' || ch === ')') depth--; }
  block.push(line);
  if (depth === 0) { out.push(block.join(' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/,\s*\]/g, ']')); block = []; }
}
fs.writeFileSync(process.argv[3], out.join('\n') + '\n');
console.log(out.length + ' líneas');
