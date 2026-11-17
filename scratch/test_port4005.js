process.env.PORT = '4005';
process.env.H360_PORT = '5601';

const ExcelJS = require('exceljs');
const http = require('http');

require('../backend/server.js');

setTimeout(async () => {
  function postJson(urlPath, body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  try {
    console.log('--- Testing Urine Drug 12 on Port 4005 ---');
    const res1 = await postJson('/api/export/excel', {
      ref_no: '04901',
      passport_no: 'N1234567',
      fname: 'Test Patient',
      gender: 'Male',
      medical_date: '2026-11-17',
      test_name: 'Urine Drug Screening (12 Drugs)',
      urine_drug_amp: 'Positive',
      urine_drug_bzo: 'Negative',
      urine_drug_met: 'Negative'
    });

    const wb1 = new ExcelJS.Workbook();
    await wb1.xlsx.load(res1.buffer);
    const ws1 = wb1.worksheets[0];
    console.log('Worksheet name:', ws1.name);

    for (let r = 16; r <= 22; r++) {
      const c1 = ws1.getCell(r, 1).value;
      const c4 = ws1.getCell(r, 4);
      console.log(`Row ${r}: Col1="${c1}" Col4="${c4.value}" bold=${c4.font?.bold} color=${JSON.stringify(c4.font?.color)}`);
    }

    console.log('\n--- Testing UFR Excel on Port 4005 ---');
    const res2 = await postJson('/api/export/excel', {
      ref_no: '04902',
      fname: 'UFR Patient',
      test_name: 'Urine Full Report'
    });
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(res2.buffer);
    let hasMethod = false;
    wb2.worksheets[0].eachRow((row, rn) => {
      row.eachCell((cell, cn) => {
        if (String(cell.value || '').toLowerCase().includes('test method')) {
          hasMethod = true;
          console.log(`Found method at row ${rn}:`, cell.value);
        }
      });
    });
    console.log('UFR has test method in Excel?', hasMethod ? 'YES (FAIL)' : 'NO (PASS)');

    console.log('\n--- Testing UFR PDF on Port 4005 ---');
    const res3 = await postJson('/api/export/pdf', {
      ref_no: '04903',
      fname: 'UFR PDF Patient',
      test_name: 'Urine Full Report'
    });
    console.log('UFR PDF status:', res3.status, 'size:', res3.buffer.length);

    console.log('\n--- Testing Custom Package type 16 on Port 4005 ---');
    const res4 = await postJson('/api/export/excel', {
      ref_no: '04904',
      fname: 'Type 16 Patient',
      test_name: 'type 16',
      urine_drug_amp: 'Positive',
      urine_drug_bzo: 'Negative'
    });
    const wb4 = new ExcelJS.Workbook();
    await wb4.xlsx.load(res4.buffer);
    console.log('Sheets in package:', wb4.worksheets.map(w => w.name));
    const drugSheet = wb4.worksheets.find(w => w.name.toLowerCase().includes('drug'));
    if (drugSheet) {
      for (let r = 16; r <= 22; r++) {
        const c1 = drugSheet.getCell(r, 1).value;
        const c4 = drugSheet.getCell(r, 4);
        console.log(`Pkg Row ${r}: Col1="${c1}" Col4="${c4.value}" bold=${c4.font?.bold} color=${JSON.stringify(c4.font?.color)}`);
      }
    }

    console.log('\nSUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
}, 1500);
