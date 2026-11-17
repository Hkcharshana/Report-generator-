const ExcelJS = require('exceljs');
const fs = require('fs');

const files = [
  'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794378918924_442e90c9.xlsx',
  'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794378918924_fded7671.xlsx',
  'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794389043900_9b805e21.xlsx',
  'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.user_uploaded/media_1794389044107_8952761a.xlsx'
];

async function main() {
  for (const f of files) {
    console.log('=== FILE:', f);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(f);
    console.log('Sheets:', wb.worksheets.map(w => w.name));
    const ws = wb.worksheets[0];
    console.log('Sheet[0] row 9:', ws.getRow(9).values);
    console.log('Sheet[0] row 10:', ws.getRow(10).values);
  }
}
main().catch(console.error);
