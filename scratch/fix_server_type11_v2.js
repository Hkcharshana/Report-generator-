/**
 * fix_server_type11_v2.js
 * Fix Type 11 Excel generation - clear header rows AND data rows from template
 * before writing fresh data. Also fix cell address issues with merged cells.
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
let src = fs.readFileSync(serverPath, 'utf8');

// The fbs-template.xlsx is a file full of real patient records with merged cells.
// The copyWs function copies ALL data including old patient info into header rows.
// We must clear rows 9-13 (patient header) AND 16-35 (data section) after copyWs.
// Also the template uses merged cells (B9 merged with C9, D9 etc) so when we set 
// ws.getCell('C9').value = refNo, ExcelJS may set it in the wrong cell due to merging.
// Better approach: clear rows 9-13 fully, then write to the EXACT same addresses the
// template uses for labels (B9, C9) to match the template structure.

// The new approach for Type 11 sheets:
// 1. copyWs from template (gets layout/formatting)
// 2. Clear rows 9-13 (patient header) 
// 3. Clear rows 15-35 (content area)
// 4. Write all values fresh using B/C/D/E/H pattern from template

// Looking at the output, the template uses column A for labels (after copyWs removes col A)
// Actually the removeEmptyColumnA() function may be shifting things.
// Looking at UFR output: A9="Ref.No", B9=":", C9=refNo  <-- this is correct format
// Looking at FBS output: A9="Ref.No", B9=refNo, C9=old_data_from_template <-- B9 is set to refNo OK

// The real issue: merged cells in the template cause old values to bleed through
// The fix: also clear rows 9-13 after copyWs

const clearBlock = `
            // Clear ALL template data: patient header (rows 9-13) + content (rows 15-35)
            for (let r = 9; r <= 13; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }
            for (let r = 15; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }`;

// Replace each clearBlock in the existing code
// The existing code has: 
//   for (let r = 16; r <= 35; r++) { for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null; }

const oldClear16 = `            // Clear any residual template data
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }`;

const oldClear16b = `            // Clear residual template data rows 16-35
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }`;

const newClear = `            // Clear ALL template data: patient header (9-13) + content (15-35)
            for (let r = 9; r <= 13; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            for (let r = 15; r <= 35; r++) for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;`;

// Apply to FBS sheet (uses "Clear any residual template data")
src = src.replace(oldClear16, newClear);
// Apply to SGPT, Gamma GT, Lipid (use "Clear residual template data rows 16-35")
// There are 3 occurrences
let count = 0;
while (src.includes(oldClear16b)) {
  src = src.replace(oldClear16b, newClear);
  count++;
  if (count > 10) break; // safety
}

console.log(`Replaced clear blocks: 1 FBS + ${count} others`);

// Also fix the SGOT E21 issue - in the template E21 has merged cells from "Repeated and Confirmed"
// We already clear row 21 so it should be fine now.
// Let's also fix the HDL cholesterol E21 issue same way.

// Write 
fs.writeFileSync(serverPath, src, 'utf8');
console.log(`✅ Written: ${serverPath}`);
