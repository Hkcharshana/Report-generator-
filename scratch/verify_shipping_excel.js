const ExcelJS = require('exceljs');

async function verifyShippingExcel() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('scratch/04904_Shipping.xlsx');
  console.log('Total worksheets:', wb.worksheets.length);
  console.log('Sheet names:', wb.worksheets.map(w => w.name));

  for (const ws of wb.worksheets) {
    console.log('--- SHEET:', ws.name);
    console.log('  Patient:', ws.getCell('C8').value, '|', ws.getCell('F8').value, '|', ws.getCell('C9').value, '|', ws.getCell('F9').value);
    console.log('  Title (A15):', ws.getCell('A15').value);
    console.log('  Row 17:', ws.getRow(17).values);
    console.log('  Row 18:', ws.getRow(18).values);
    console.log('  Row 19:', ws.getRow(19).values);
  }
}
verifyShippingExcel().catch(console.error);
