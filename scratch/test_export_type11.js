const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function testExport() {
  const wb = new ExcelJS.Workbook();
  const tplPath = path.join('public/assets', 'type11-template.xlsx');
  await wb.xlsx.readFile(tplPath);

  console.log('Worksheets:', wb.worksheets.map(w => w.name));
  for (const ws of wb.worksheets) {
    console.log('=== WS:', ws.name);
    console.log('Row 16:', ws.getRow(16).values);
    console.log('Row 17:', ws.getRow(17).values);
    console.log('Row 18:', ws.getRow(18).values);
    console.log('Row 19:', ws.getRow(19).values);
    console.log('Row 20:', ws.getRow(20).values);
  }
}
testExport().catch(console.error);
