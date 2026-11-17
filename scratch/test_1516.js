const ExcelJS = require('exceljs');
const http = require('http');

const data = JSON.stringify({
  ref_no: '04901',
  passport_no: 'N1234567',
  fname: 'Test Patient',
  gender: 'Male',
  medical_date: '2026-11-17',
  test_name: 'Urine Drug Screening (12 Drugs)',
  urine_drug_amp: 'Positive',
  urine_drug_bzo: 'Negative'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 1516,
  path: '/api/export/excel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', async () => {
    console.log('Status from port 1516:', res.statusCode);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.concat(chunks));
    const ws = wb.worksheets[0];
    console.log('Sheet name:', ws.name);
    for (let r = 16; r <= 22; r++) {
      console.log(`Row ${r}: Col1="${ws.getCell(r, 1).value}" Col4="${ws.getCell(r, 4).value}" font4=${JSON.stringify(ws.getCell(r, 4).font)}`);
    }
  });
});
req.on('error', e => console.error('Error hitting 1516:', e.message));
req.write(data);
req.end();
