const ExcelJS = require('exceljs');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('scratch/current_test_type11.xlsx');
  console.log('Worksheets:', wb.worksheets.map(w => w.name));
  for (const ws of wb.worksheets) {
    console.log('====================================');
    console.log('SHEET:', ws.name);
    for (let r = 1; r <= 32; r++) {
      const row = ws.getRow(r);
      const nonEmp = [];
      for (let c = 1; c <= 12; c++) {
        const v = row.getCell(c).value;
        if (v !== null && v !== undefined && v !== '') {
          nonEmp.push(`${String.fromCharCode(64+c)}${r}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
        }
      }
      if (nonEmp.length) console.log(`Row ${r}: ${nonEmp.join(', ')}`);
    }
  }
}
main().catch(console.error);
