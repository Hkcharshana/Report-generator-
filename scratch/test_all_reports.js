const http = require('http');

async function testExport(path, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 1516,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        const ok = res.statusCode === 200;
        console.log(`${ok ? '✅' : '❌'} ${path} [${payload.test_name}]: HTTP ${res.statusCode}, size: ${buf.length} bytes`);
        if (!ok) {
          console.log(`   Error: ${buf.toString('utf8').slice(0, 200)}`);
        }
        resolve(ok);
      });
    });
    req.on('error', (err) => {
      console.log(`❌ ${path} [${payload.test_name}]: Request error ${err.message}`);
      resolve(false);
    });
    req.write(postData);
    req.end();
  });
}

(async () => {
  const testsToTest = [
    'FBS',
    'RBS',
    'Total Cholesterol',
    'SGPT & SGOT',
    'Urine Full Report',
    'Full Blood Count',
    'Type 10 B',
    'Type 10 B with urine drug',
    'Type 7',
    'Type 11',
    'Shipping'
  ];

  console.log('--- TESTING EXCEL EXPORTS ---');
  for (const t of testsToTest) {
    await testExport('/api/export/excel', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N10967209',
      gender: 'Male',
      age: '30 Years',
      test_name: t,
      medical_date: '2026-11-13'
    });
  }

  console.log('\n--- TESTING PDF EXPORTS ---');
  for (const t of testsToTest) {
    await testExport('/api/export/pdf', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N10967209',
      gender: 'Male',
      age: '30 Years',
      test_name: t,
      medical_date: '2026-11-13'
    });
  }
})();
