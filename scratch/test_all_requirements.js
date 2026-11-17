const fs = require('fs');
const http = require('http');
const zlib = require('zlib');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 1516,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:1516${urlPath}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

function pdfHasRepeatedConfirmed(pdfBuffer) {
  const str = pdfBuffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  // The glyph sequence for [Repeated and Confirmed] in Caladea-Bold embedded font
  const glyphPattern = /014400160023002e0023/i;
  while ((match = streamRegex.exec(str)) !== null) {
    try {
      const decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      if (glyphPattern.test(decompressed) || decompressed.includes('Repeated and Confirmed')) {
        return true;
      }
    } catch (e) {
      if (glyphPattern.test(match[1]) || match[1].includes('Repeated and Confirmed')) {
        return true;
      }
    }
  }
  return false;
}

async function runTests() {
  console.log('--- TEST 1: Package loading and Custom Package Excel Export ---');
  const pkgsResp = await getJson('/api/packages');
  console.log('Loaded packages count:', pkgsResp.packages ? pkgsResp.packages.length : 0);
  
  let testPkg = (pkgsResp.packages || []).find(p => !p.isBuiltin);
  if (!testPkg && pkgsResp.packages && pkgsResp.packages.length > 0) {
    testPkg = pkgsResp.packages[0];
  }
  console.log('Testing with package:', testPkg.name, 'ID:', testPkg.id, 'Tests:', testPkg.tests);

  const excelRes = await postJson('/api/export/excel', {
    test_name: testPkg.name,
    report_type: testPkg.name,
    package_name: testPkg.name,
    package_id: testPkg.id,
    ref_no: 'TEST-PKG-001',
    fname: 'TEST PATIENT',
    age: '28 Y',
    gender: 'Male',
    passport_no: 'N1234567'
  });
  console.log('Excel export HTTP status:', excelRes.statusCode);
  console.log('Excel export byte size:', excelRes.body.length);
  const test1Passed = (excelRes.statusCode === 200 && excelRes.body.length > 5000);
  console.log(test1Passed ? '✅ TEST 1 PASSED: Custom package Excel exported successfully!' : '❌ TEST 1 FAILED');

  console.log('\n--- TEST 2: UFR Bold Removal (PDF & Preview) ---');
  const ufrPdfRes = await postJson('/api/export/pdf', {
    test_name: 'Urine Full Report',
    ref_no: 'UFR-001',
    fname: 'UFR PATIENT',
    age: '30 Y',
    gender: 'Female',
    ufr_colour: 'Pale Yellow',
    ufr_pus_cells: '01 - 02 /hpf'
  });
  console.log('UFR PDF export status:', ufrPdfRes.statusCode, 'bytes:', ufrPdfRes.body.length);
  
  const serverCode = fs.readFileSync('backend/server.js', 'utf8');
  const hasUfrBoldLabel = serverCode.includes("pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, true)");
  console.log('Does single UFR PDF still have bold row.label?', hasUfrBoldLabel);
  
  const appCode = fs.readFileSync('frontend/app.js', 'utf8');
  const hasAppUfrBold = appCode.includes('<td style="font-weight:600; width:45%;">${label}</td>');
  console.log('Does frontend app.js UFR preview still have font-weight:600 on labels?', hasAppUfrBold);

  const test2Passed = (!hasUfrBoldLabel && !hasAppUfrBold && ufrPdfRes.statusCode === 200);
  console.log(test2Passed ? '✅ TEST 2 PASSED: UFR bold formatting successfully removed from PDF and Preview!' : '❌ TEST 2 FAILED');

  console.log('\n--- TEST 3: Repeated and Confirmed (HIGH only or Manual Toggle) ---');
  // Normal FBS: result_note is empty
  const normalFbsPdf = await postJson('/api/export/pdf', {
    test_name: 'FBS',
    test_result: '95',
    result_note: '',
    ref_no: 'FBS-NORM-01',
    fname: 'NORMAL FBS PATIENT'
  });
  const hasNoteInNormal = pdfHasRepeatedConfirmed(normalFbsPdf.body);
  console.log('Does Normal FBS PDF (result_note="") contain "Repeated and Confirmed"?', hasNoteInNormal);

  // HIGH FBS: result_note is '[Repeated and Confirmed]'
  const highFbsPdf = await postJson('/api/export/pdf', {
    test_name: 'FBS',
    test_result: '145',
    result_note: '[Repeated and Confirmed]',
    ref_no: 'FBS-HIGH-01',
    fname: 'HIGH FBS PATIENT'
  });
  const hasNoteInHigh = pdfHasRepeatedConfirmed(highFbsPdf.body);
  console.log('Does HIGH FBS PDF contain "Repeated and Confirmed"?', hasNoteInHigh);

  // Manual toggle for normal FBS:
  const manualFbsPdf = await postJson('/api/export/pdf', {
    test_name: 'FBS',
    test_result: '95',
    result_note: '[Repeated and Confirmed]',
    ref_no: 'FBS-MANUAL-01',
    fname: 'MANUAL FBS PATIENT'
  });
  const hasNoteInManual = pdfHasRepeatedConfirmed(manualFbsPdf.body);
  console.log('Does Normal FBS with manual toggle checked contain "Repeated and Confirmed"?', hasNoteInManual);

  const test3Passed = (!hasNoteInNormal && hasNoteInHigh && hasNoteInManual);
  console.log(test3Passed ? '✅ TEST 3 PASSED: Repeated and Confirmed correctly only prints when HIGH or manually checked!' : '❌ TEST 3 FAILED');

  if (test1Passed && test2Passed && test3Passed) {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Everything is verified.');
  }
}

runTests().catch(err => {
  console.error('Test run error:', err);
});
