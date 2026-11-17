const ExcelJS = require('exceljs');

async function check(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  console.log('=== FILE:', filePath);
  for (const ws of wb.worksheets) {
    console.log('--- SHEET:', ws.name);
    for (let r = 7; r <= 28; r++) {
      const row = ws.getRow(r);
      const cells = [];
      for (let c = 1; c <= 10; c++) {
        const v = row.getCell(c).value;
        if (v !== null && v !== undefined && v !== '') {
          cells.push(`${String.fromCharCode(64+c)}${r}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
        }
      }
      if (cells.length) console.log(`  Row ${r}: ${cells.join(' | ')}`);
    }
  }
}

async function main() {
  await check('C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794389043900_9b805e21.xlsx');
}
main().catch(console.error);
