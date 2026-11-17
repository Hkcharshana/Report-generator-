// Test Type 11 workbook generation to verify col 6 reference ranges
const ExcelJS = require('exceljs');
const path = require('path');

// Minimal inline test: load the workbook and check cell values
async function test() {
  const http = require('http');
  const fs = require('fs');

  const postData = JSON.stringify({
    test_name: 'Type 11',
    ref_no: '00004239',
    passport_no: 'N8339046',
    patient_name: 'Mr.I.A.L.Dhilshanka',
    age: '25',
    gender: 'Male',
    agency: 'OPD',
    date: '02 October 2026',
    report_time: '11:28 AM',
    fbs: '75',
    sgpt: '10',
    sgot: '13',
    gamma_gt: '18',
    cholesterol: '176',
    hdl: '44',
    ldl: '112.4',
    vldl: '19.6',
    triglyceride: '98',
    cho_hdl: '4',
    ufr_colour: 'Pale Yellow',
    ufr_appearance: 'Clear',
    ufr_specific_gravity: '1.010',
    ufr_ph: '6.0',
    ufr_glucose: 'Nil',
    ufr_protein: 'Nil',
    ufr_ketone: 'Nil',
    ufr_bilirubin: 'Nil',
    ufr_urobilinogen: '+ Normal',
    ufr_pus_cells: '+ 01 - 02 /hpf',
    ufr_red_cells: 'Nil',
    ufr_epithelial_cells: '+ A Few /hpf',
    ufr_organisms: 'Nil',
    ufr_crystals: 'Nil',
    ufr_casts: 'Nil'
  });

  const options = {
    hostname: 'localhost',
    port: 1516,
    path: '/api/export/excel',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const outPath = path.join(__dirname, 'type11_fix_test.xlsx');
  const fileStream = fs.createWriteStream(outPath);

  await new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log('Status:', res.statusCode);
      res.pipe(fileStream);
      fileStream.on('finish', resolve);
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('Downloaded to:', outPath);

  // Now read the file and verify
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(outPath);

  console.log('\nSheets:', wb.worksheets.map(w => w.name));

  for (const ws of wb.worksheets) {
    console.log(`\n=== ${ws.name} ===`);
    // Check column widths
    const cols = [1,2,3,4,5,6,7,8].map(i => {
      const col = ws.getColumn(i);
      return `C${i}:w=${col.width}`;
    });
    console.log('ColWidths:', cols.join(' | '));

    // Check row 15 (section title)
    const r15 = ws.getRow(15);
    console.log('Row15 A:', r15.getCell(1).value);

    // Check row 17 (table headers)
    const r17 = ws.getRow(17);
    console.log('Row17 headers: A=', r17.getCell(1).value, '| C=', r17.getCell(3).value, '| F=', r17.getCell(6).value);

    // Check row 19 (first data row)
    const r19 = ws.getRow(19);
    console.log('Row19: A=', r19.getCell(1).value, '| C=', r19.getCell(3).value, '| F=', r19.getCell(6).value);
  }
}

test().catch(console.error);
