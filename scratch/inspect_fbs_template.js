const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, '..', 'public', 'assets', 'fbs-template.xlsx'));
  
  // Check the 04132 sheet
  const ws04132 = wb.getWorksheet('04132');
  console.log('\nWorksheet "04132" rows 7-25:');
  for (let r = 7; r <= 25; r++) {
    const row = ws04132.getRow(r);
    let rowData = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value && String(cell.value).trim()) {
        rowData.push(`${cell.address}: "${String(cell.value).substring(0, 30)}"`);
      }
    });
    if (rowData.length) console.log(`Row ${r}: ${rowData.join(', ')}`);
  }
}
inspect().catch(console.error);
