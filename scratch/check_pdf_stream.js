const zlib = require('zlib');
const http = require('http');

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
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkPdf() {
  const buf = await postJson('/api/export/pdf', {
    test_name: 'FBS',
    test_result: '145',
    result_note: '[Repeated and Confirmed]',
    ref_no: 'FBS-HIGH-01',
    fname: 'HIGH FBS PATIENT'
  });

  // Extract all stream blocks from PDF
  const str = buf.toString('latin1');
  let found = false;
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(str)) !== null) {
    try {
      const decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('utf8');
      if (decompressed.includes('Repeated and Confirmed')) {
        found = true;
        console.log('FOUND "Repeated and Confirmed" in decompressed stream!');
        break;
      }
    } catch (e) {
      // not flate compressed or failed
      if (match[1].includes('Repeated and Confirmed')) {
        found = true;
        console.log('FOUND in raw stream!');
        break;
      }
    }
  }
  console.log('Was Repeated and Confirmed found in PDF?', found);
}

checkPdf();
