const ExcelJS = require('exceljs');
const fs = require('fs');

async function check(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  console.log('=== File:', filePath);
  console.log('Sheets:', wb.worksheets.map(w => w.name));
  for (const ws of wb.worksheets) {
    console.log('--- Sheet:', ws.name);
    for (let r = 14; r <= 28; r++) {
      const row = ws.getRow(r);
      const vals = [];
      for (let c = 1; c <= 12; c++) {
        const val = row.getCell(c).value;
        if (val !== null && val !== undefined && val !== '') {
          vals.push('col ' + c + ' (' + String.fromCharCode(64+c) + '): ' + JSON.stringify(val));
        }
      }
      if (vals.length > 0) {
        console.log('  Row ' + r + ': ' + vals.join(' | '));
      }
    }
  }
}

async function main() {
  await check('public/assets/type11-template.xlsx');
  await check('public/assets/fbs-template.xlsx');
}
main().catch(console.error);
