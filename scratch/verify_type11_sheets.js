// Deep verify Type 11 Excel - check all non-null cells in each sheet
const http = require('http');
const ExcelJS = require('exceljs');

async function testType11Content() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      test_name: 'Type 11', ref_no: '5330', fname: 'Test Patient',
      medical_date: '2026-11-12', colombo_fbs: '98', colombo_sgpt: '32',
      colombo_sgot: '28', colombo_gamma_gt: '45', colombo_cholesterol: '195',
      colombo_hdl: '55', colombo_ldl: '120', colombo_vldl: '20',
      colombo_triglyceride: '100', colombo_cho_hdl: '3.5'
    });

    const req = http.request({
      hostname: 'localhost', port: 1516,
      path: '/api/export/excel', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, async (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        const buf = Buffer.concat(chunks);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        
        wb.worksheets.forEach(ws => {
          console.log(`\n=== Sheet: "${ws.name}" ===`);
          ws.eachRow((row, rNum) => {
            if (rNum < 7 || rNum > 30) return;
            row.eachCell({ includeEmpty: false }, (cell) => {
              const v = cell.value;
              if (v !== null && v !== undefined && String(v).trim() !== '') {
                console.log(`  ${cell.address}: "${String(v).substring(0, 50)}"`);
              }
            });
          });
        });
        resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
testType11Content().catch(console.error);
