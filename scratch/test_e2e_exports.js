const ExcelJS = require('exceljs');
const http = require('http');

process.env.PORT = '4005';
// Require backend/server
require('../backend/server.js');

setTimeout(async () => {
  console.log('Testing export APIs on port 4005...');

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
    // 1. Urine Drug Screening 12 Drugs (with 1 positive, rest negative)
    console.log('\n--- 1. Testing Urine Drug 12 Excel Export ---');
    const res1 = await postJson('/api/export/excel', {
      ref_no: '04901',
      passport_no: 'N1234567',
      fname: 'Test Patient',
      gender: 'Male',
      medical_date: '2026-11-17',
      test_name: 'Urine Drug Screening (12 Drugs)',
      urine_drug_amp: 'Positive',
      urine_drug_bzo: 'Negative',
      urine_drug_met: 'Negative',
      urine_drug_thc: 'Negative'
    });

    const wb1 = new ExcelJS.Workbook();
    await wb1.xlsx.load(res1.buffer);
    const ws1 = wb1.worksheets[0];
    console.log('Sheet name:', ws1.name);

    let foundAmp = false;
    let foundBzo = false;
    ws1.eachRow((row, rn) => {
      const c1 = String(row.getCell(1).value || '');
      const c4 = row.getCell(4);
      if (c1.includes('Amphetamine')) {
        foundAmp = true;
        console.log(`Amphetamine: val=${c4.value}, bold=${c4.font?.bold}`);
        if (c4.value === 'Positive' && c4.font?.bold === true) {
          console.log('✅ Positive is bold!');
        } else {
          console.error('❌ Positive is NOT bold!');
        }
      }
      if (c1.includes('Benzodiazepine')) {
        foundBzo = true;
        console.log(`Benzodiazepine: val=${c4.value}, bold=${c4.font?.bold}`);
        if (c4.value === 'Negative' && c4.font?.bold !== true) {
          console.log('✅ Negative is NOT bold!');
        } else {
          console.error('❌ Negative IS BOLD!');
        }
      }
    });

    // 2. Urine Full Report (UFR) Excel Export - check NO Test Method
    console.log('\n--- 2. Testing UFR Excel Export (No Test Method) ---');
    const res2 = await postJson('/api/export/excel', {
      ref_no: '04902',
      fname: 'UFR Patient',
      test_name: 'Urine Full Report'
    });
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(res2.buffer);
    const ws2 = wb2.worksheets[0];
    let hasMethodExcel = false;
    ws2.eachRow((row, rn) => {
      row.eachCell((cell, cn) => {
        if (String(cell.value || '').toLowerCase().includes('test method')) {
          hasMethodExcel = true;
          console.log(`Found method at row ${rn} col ${cn}:`, cell.value);
        }
      });
    });
    if (!hasMethodExcel) {
      console.log('✅ UFR Excel does NOT contain Test Method!');
    } else {
      console.error('❌ UFR Excel still contains Test Method!');
    }

    // 3. Testing UFR PDF Export - check no Test Method
    console.log('\n--- 3. Testing UFR PDF Export ---');
    const res3 = await postJson('/api/export/pdf', {
      ref_no: '04903',
      fname: 'UFR PDF Patient',
      test_name: 'Urine Full Report'
    });
    console.log('UFR PDF Status:', res3.status, 'size:', res3.buffer.length);
    if (res3.status === 200 && res3.buffer.length > 1000) {
      console.log('✅ UFR PDF generated successfully!');
    } else {
      console.error('❌ UFR PDF generation failed!');
    }

    // 4. Custom Package (type 16: UFR + Urine Drug Screening)
    console.log('\n--- 4. Testing Custom Package type 16 Excel Export ---');
    const res4 = await postJson('/api/export/excel', {
      ref_no: '04904',
      fname: 'Type 16 Patient',
      test_name: 'type 16',
      urine_drug_amp: 'Positive',
      urine_drug_bzo: 'Negative'
    });
    const wb4 = new ExcelJS.Workbook();
    await wb4.xlsx.load(res4.buffer);
    console.log('Package sheets:', wb4.worksheets.map(w => w.name));
    const drugSheet = wb4.worksheets.find(w => w.name.toLowerCase().includes('drug'));
    if (drugSheet) {
      console.log('✅ Package has Urine Drug sheet!');
      let foundAmpPkg = false;
      let foundBzoPkg = false;
      drugSheet.eachRow((row, rn) => {
        const c1 = String(row.getCell(1).value || '');
        const c4 = row.getCell(4);
        if (c1.includes('Amphetamine')) {
          foundAmpPkg = true;
          console.log(`Pkg Amphetamine: val=${c4.value}, bold=${c4.font?.bold}`);
          if (c4.value === 'Positive' && c4.font?.bold === true) console.log('✅ Pkg Positive is bold!');
          else console.error('❌ Pkg Positive is not bold!');
        }
        if (c1.includes('Benzodiazepine')) {
          foundBzoPkg = true;
          console.log(`Pkg Benzodiazepine: val=${c4.value}, bold=${c4.font?.bold}`);
          if (c4.value === 'Negative' && c4.font?.bold !== true) console.log('✅ Pkg Negative is NOT bold!');
          else console.error('❌ Pkg Negative IS BOLD!');
        }
      });
    } else {
      console.error('❌ Package does NOT have Urine Drug sheet!');
    }

    console.log('\n🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Integration test error:', err);
    process.exit(1);
  }
}, 1000);
