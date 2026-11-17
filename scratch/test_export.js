const http = require('http');
const fs = require('fs');
const ExcelJS = require('exceljs');

const postData = JSON.stringify({
  ref_no: '00004239',
  passport_no: 'N8339046',
  full_name: 'Mr.I.A.L.Dhilshanka',
  age: '25 Years',
  gender: 'Male',
  agency: 'OPD',
  date: '02 October 2026',
  issued_time: '11:28 AM',
  test_name: 'Type 11',
  report_type: 'Type 11',
  fbs: '75',
  sgpt: '10',
  sgot: '13',
  gamma_gt: '18',
  cholesterol: '176',
  hdl: '44',
  ldl: '112.4',
  vldl: '19.6',
  triglyceride: '98',
  cho_hdl: '4'
});

const req = http.request({
  hostname: 'localhost',
  port: 1516,
  path: '/api/export/excel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', async () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync('scratch/test_type11_export.xlsx', buf);
    console.log('Saved scratch/test_type11_export.xlsx, size:', buf.length);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    console.log('Worksheets:', wb.worksheets.map(w => w.name));
    for (const ws of wb.worksheets) {
      console.log('=== WS:', ws.name);
      for (let r = 1; r <= 30; r++) {
        const row = ws.getRow(r);
        const cells = [];
        row.eachCell({ includeEmpty: false }, (cell, cNum) => {
          cells.push(`${cell.address}: ${JSON.stringify(cell.value)}`);
        });
        if (cells.length) console.log(`Row ${r}: ${cells.join(', ')}`);
      }
    }
  });
});
req.write(postData);
req.end();
