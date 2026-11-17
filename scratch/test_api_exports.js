const http = require('http');

async function testExport(path, payload) {
  return new Promise((resolve, reject) => {
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
        console.log(`${path} status: ${res.statusCode}, size: ${buf.length}`);
        if (res.statusCode !== 200) {
          console.log(`Error body: ${buf.toString('utf8')}`);
        }
        resolve({ statusCode: res.statusCode, length: buf.length, body: buf.toString('utf8').slice(0, 300) });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log('Testing single test PDF export...');
    await testExport('/api/export/pdf', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N1234567',
      gender: 'Male',
      age: '30',
      test_name: 'FBS',
      test_result: '95',
      medical_date: '2026-11-13'
    });

    console.log('Testing Type 10 B PDF export...');
    await testExport('/api/export/pdf', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N1234567',
      gender: 'Male',
      age: '30',
      test_name: 'Type 10 B',
      medical_date: '2026-11-13'
    });

    console.log('Testing single test Excel export...');
    await testExport('/api/export/excel', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N1234567',
      gender: 'Male',
      age: '30',
      test_name: 'FBS',
      test_result: '95',
      medical_date: '2026-11-13'
    });

    console.log('Testing Type 10 B Excel export...');
    await testExport('/api/export/excel', {
      ref_no: '05184',
      fname: 'Mr. Test Patient',
      passport_no: 'N1234567',
      gender: 'Male',
      age: '30',
      test_name: 'Type 10 B',
      medical_date: '2026-11-13'
    });
  } catch (err) {
    console.error('Test error:', err);
  }
})();
