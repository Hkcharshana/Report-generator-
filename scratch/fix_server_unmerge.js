/**
 * fix_server_unmerge.js
 * Add unmerge step for rows 15-35 in all Type 11 FBS-based sheets
 * to prevent merged cells from causing result values to land in wrong columns.
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
let src = fs.readFileSync(serverPath, 'utf8');

// The old clear block (now clearing 9-13 AND 15-35):
const oldClear = `            // Clear ALL template data: patient header (9-13) + content (15-35)
            for (let r = 9; r <= 13; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            for (let r = 15; r <= 35; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;`;

// New clear block: also unmerge cells in rows 15-35 to fix result column placement
const newClear = `            // Clear ALL template data: patient header (9-13) + content (15-35)
            for (let r = 9; r <= 13; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            // Unmerge cells in content area to prevent merged-cell value displacement
            if (ws.model && ws.model.merges) {
              const mergesCopy = [...ws.model.merges];
              mergesCopy.forEach(m => {
                try {
                  const startRow = parseInt(String(m).replace(/^[A-Z]+/, '').split(':')[0]);
                  if (startRow >= 15 && startRow <= 35) ws.unMergeCells(m);
                } catch(e) {}
              });
            }
            for (let r = 15; r <= 35; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;`;

let count = 0;
while (src.includes(oldClear)) {
  src = src.replace(oldClear, newClear);
  count++;
  if (count > 10) break;
}

console.log(`Applied unmerge fix to ${count} sheet(s)`);
if (count === 0) { console.error('❌ Pattern not found!'); process.exit(1); }

fs.writeFileSync(serverPath, src, 'utf8');
console.log(`✅ Written: ${serverPath}`);
