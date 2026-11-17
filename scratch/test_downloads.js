// Test all package downloads against the backend
const http = require('http');

function testDownload(testName, extraData = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      test_name: testName,
      ref_no: '5330',
      fname: 'Test Patient',
      medical_date: '2026-11-12',
      colombo_fbs: '98',
      colombo_sgpt: '32',
      colombo_sgot: '28',
      colombo_gamma_gt: '45',
      colombo_cholesterol: '195',
      colombo_hdl: '55',
      colombo_ldl: '120',
      colombo_vldl: '20',
      colombo_triglyceride: '100',
      colombo_cho_hdl: '3.5',
      ufr_specific_gravity: '1.015',
      ufr_appearance: 'Clear',
      ufr_colour: 'Yellow',
      ufr_reaction: 'Acidic',
      ufr_protein: 'Nil',
      ufr_glucose: 'Nil',
      ...extraData
    });

    const req = http.request({
      hostname: 'localhost',
      port: 1516,
      path: '/api/export/excel',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let size = 0;
      res.on('data', chunk => size += chunk.length);
      res.on('end', () => {
        const ok = res.statusCode === 200 && size > 1000;
        console.log(`${ok ? '✅' : '❌'} ${testName}: HTTP ${res.statusCode}, ${size} bytes`);
        resolve(ok);
      });
    });
    req.on('error', (e) => {
      console.log(`❌ ${testName}: ERROR - ${e.message}`);
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('Testing all package downloads...\n');
  const results = await Promise.all([
    testDownload('Type 11'),
    testDownload('Type 10 B'),
    testDownload('Type 10 B with urine drug'),
    testDownload('Type 7'),
    testDownload('FBS'),
    testDownload('Urine Drug Screening'),
    testDownload('Lipid Profile'),
  ]);
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} tests passed`);
}

runTests();
