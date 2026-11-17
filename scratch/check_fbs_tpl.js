const ExcelJS = require('exceljs');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/assets/fbs-template.xlsx');
  console.log('Worksheets:', wb.worksheets.map(w => w.name));
  const ws = wb.worksheets[0];
  console.log('Worksheet[0] name:', ws.name);
  for (let r = 1; r <= 35; r++) {
    const row = ws.getRow(r);
    const nonEmp = [];
    for (let c = 1; c <= 12; c++) {
      const v = row.getCell(c).value;
      if (v !== null && v !== undefined && v !== '') {
        nonEmp.push(`${String.fromCharCode(64+c)}${r}=${JSON.stringify(v)}`);
      }
    }
    if (nonEmp.length) console.log(`Row ${r}: ${nonEmp.join(', ')}`);
  }
}
main().catch(console.error);
