const ExcelJS = require('exceljs');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/assets/fbs-template.xlsx');
  const ws0 = wb.worksheets[0];
  console.log('ws0 merges:', ws0.model && ws0.model.merges);
  const ws1 = wb.worksheets[1];
  console.log('ws1 merges:', ws1.model && ws1.model.merges);
}
main().catch(console.error);
