const ExcelJS = require('exceljs');

async function inspectRealType11() {
  const file = 'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794389043900_9b805e21.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  for (const ws of wb.worksheets) {
    console.log('====================================');
    console.log('REAL SHEET:', ws.name);
    console.log('Columns count:', ws.columnCount);
    for (let c = 1; c <= 10; c++) {
      console.log(`  Col ${c} (${String.fromCharCode(64+c)}): width = ${ws.getColumn(c).width}`);
    }
    console.log('Merges:', ws.model && ws.model.merges);
    for (let r = 1; r <= 35; r++) {
      const row = ws.getRow(r);
      const cells = [];
      for (let c = 1; c <= 12; c++) {
        const v = row.getCell(c).value;
        if (v !== null && v !== undefined && v !== '') {
          cells.push(`${String.fromCharCode(64+c)}${r}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
        }
      }
      if (cells.length) console.log(`  Row ${r} (h=${row.height}): ${cells.join(' | ')}`);
    }
  }
}
inspectRealType11().catch(console.error);
