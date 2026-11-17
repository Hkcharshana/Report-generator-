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

async function dumpStreams() {
  const buf = await postJson('/api/export/pdf', {
    test_name: 'FBS',
    test_result: '145',
    result_note: '[Repeated and Confirmed]',
    ref_no: 'FBS-HIGH-01',
    fname: 'HIGH FBS PATIENT'
  });

  const str = buf.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let count = 0;
  while ((match = streamRegex.exec(str)) !== null) {
    count++;
    try {
      const decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      console.log(`Stream #${count}: length=${decompressed.length}`);
      if (decompressed.includes('FASTING') || decompressed.includes('End of Report') || decompressed.includes('W.D.Gunarathne')) {
        console.log('--- FOUND PAGE TEXT STREAM ---');
        console.log(decompressed);
      }
    } catch (e) {
      // not compressed stream
    }
  }
}

dumpStreams();
