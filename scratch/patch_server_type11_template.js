const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// The marker: if (test.isCustomPackage) {
const targetMarker = 'if (test.isCustomPackage) {';
if (!code.includes(targetMarker)) {
  console.error('Target marker not found!');
  process.exit(1);
}

const type11Branch = `if (test.isType11 || test.name === 'Type 11' || data.test_name === 'Type 11' || data.report_type === 'Type 11') {
      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '5329'));
      const passportNo = pdfVal(data, 'passport_no', pdfVal(data, 'nic', 'P1010657'));
      const shortName = reportDisplayName(data);
      const ageText = reportAge(data);
      const gender = pdfVal(data, 'gender', pdfVal(data, 'sex', 'Female'));
      const agency = pdfVal(data, 'agency', pdfVal(data, 'refby', 'Colombo Consultancy Lanka (Pvt) Ltd.'));
      const dateVal = reportDate(data);
      const issuedTime = generatedReportTime(data);

      const wb = new ExcelJS.Workbook();
      const tplPath = path.join(ASSETS_DIR, 'type11-template.xlsx');
      await wb.xlsx.readFile(tplPath);

      // Sheet 1: FBS
      const wsFbs = wb.getWorksheet('FBS') || wb.worksheets[0];
      if (wsFbs) {
        wsFbs.getCell('C8').value = refNo;
        wsFbs.getCell('F8').value = passportNo;
        wsFbs.getCell('C9').value = shortName;
        wsFbs.getCell('F9').value = ageText;
        wsFbs.getCell('C10').value = gender;
        wsFbs.getCell('F10').value = agency;
        wsFbs.getCell('C11').value = dateVal;
        wsFbs.getCell('F11').value = 'Blood';
        wsFbs.getCell('C12').value = issuedTime;

        const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '77'));
        wsFbs.getCell('C19').value = \`\${fbsVal} mg/dl\`;
      }

      // Sheet 2: SGOT & SGPT
      const wsSg = wb.getWorksheet('SGOT & SGPT') || wb.getWorksheet('SGPT & SGOT') || wb.worksheets[1];
      if (wsSg) {
        wsSg.getCell('C16').value = refNo;
        wsSg.getCell('F16').value = passportNo;
        wsSg.getCell('C17').value = shortName;
        wsSg.getCell('F17').value = ageText;
        wsSg.getCell('C18').value = gender;
        wsSg.getCell('F18').value = agency;
        wsSg.getCell('C19').value = dateVal;
        wsSg.getCell('F19').value = 'Blood';
        wsSg.getCell('C20').value = issuedTime;

        const sgptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '19'));
        const sgotVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '18'));
        wsSg.getCell('C27').value = \`\${sgptVal} iu/l \`;
        wsSg.getCell('C30').value = \`\${sgotVal} iu/l\`;
      }

      // Sheet 3: UFR
      const wsUfr = wb.getWorksheet('UFR') || wb.worksheets[2];
      if (wsUfr) {
        wsUfr.getCell('C13').value = refNo;
        wsUfr.getCell('H13').value = passportNo;
        wsUfr.getCell('C14').value = shortName;
        wsUfr.getCell('H14').value = ageText;
        wsUfr.getCell('C15').value = gender;
        wsUfr.getCell('H15').value = agency;
        wsUfr.getCell('C16').value = dateVal;
        wsUfr.getCell('H16').value = 'Urine';
        wsUfr.getCell('C17').value = issuedTime;

        wsUfr.getCell('E24').value = pdfVal(data, 'ufr_colour', 'Pale Yellow');
        wsUfr.getCell('E25').value = pdfVal(data, 'ufr_appearance', 'Clear');
        wsUfr.getCell('E26').value = parseFloat(pdfVal(data, 'ufr_specific_gravity', '1.010')) || 1.010;
        wsUfr.getCell('E27').value = parseFloat(pdfVal(data, 'ufr_ph', '6.0')) || 6.0;
        wsUfr.getCell('E28').value = pdfVal(data, 'ufr_glucose', 'Nil');
        wsUfr.getCell('E29').value = pdfVal(data, 'ufr_protein', 'Nil');
        wsUfr.getCell('E30').value = pdfVal(data, 'ufr_ketone', 'Nil');
        wsUfr.getCell('E31').value = pdfVal(data, 'ufr_bilirubin', 'Nil');
        wsUfr.getCell('E32').value = pdfVal(data, 'ufr_urobilinogen', '+ Normal');

        wsUfr.getCell('E35').value = pdfVal(data, 'ufr_pus_cells', '+ 01- 02 / hpf');
        wsUfr.getCell('E36').value = pdfVal(data, 'ufr_red_cells', 'Nil');
        wsUfr.getCell('E37').value = pdfVal(data, 'ufr_epithelial_cells', '+ A few / hpf');
        wsUfr.getCell('E38').value = pdfVal(data, 'ufr_organisms', 'Nil');
      }

      // Sheet 4: GGT
      const wsGgt = wb.getWorksheet('GGT') || wb.getWorksheet('Gamma GT') || wb.worksheets[3];
      if (wsGgt) {
        wsGgt.getCell('C16').value = refNo;
        wsGgt.getCell('F16').value = passportNo;
        wsGgt.getCell('C17').value = shortName;
        wsGgt.getCell('F17').value = ageText;
        wsGgt.getCell('C18').value = gender;
        wsGgt.getCell('F18').value = agency;
        wsGgt.getCell('C19').value = dateVal;
        wsGgt.getCell('F19').value = 'Blood';
        wsGgt.getCell('C20').value = issuedTime;

        const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '25'));
        wsGgt.getCell('C27').value = \`\${ggtVal} U/L\`;
      }

      // Sheet 5: Lipid Profile
      const wsLip = wb.getWorksheet('Lipid Profile') || wb.worksheets[4];
      if (wsLip) {
        wsLip.getCell('C9').value = refNo;
        wsLip.getCell('H9').value = passportNo;
        wsLip.getCell('C10').value = shortName;
        wsLip.getCell('H10').value = ageText;
        wsLip.getCell('C11').value = gender;
        wsLip.getCell('H11').value = agency;
        wsLip.getCell('C12').value = dateVal;
        wsLip.getCell('H12').value = 'Blood';
        wsLip.getCell('C13').value = issuedTime;

        const tc = parseFloat(pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '213'))) || 213;
        const hdl = parseFloat(pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '49'))) || 49;
        const tg = parseFloat(pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '93'))) || 93;
        const vldl = parseFloat(pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', (tg / 5).toFixed(1)))) || (tg / 5);
        const ldl = parseFloat(pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', (tc - hdl - vldl).toFixed(1)))) || (tc - hdl - vldl);
        const choHdl = parseFloat(pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', (hdl ? tc / hdl : 0).toFixed(2)))) || (hdl ? tc / hdl : 0);

        wsLip.getCell('D19').value = tc;
        wsLip.getCell('D20').value = hdl;
        wsLip.getCell('D21').value = ldl;
        wsLip.getCell('D22').value = vldl;
        wsLip.getCell('D23').value = tg;
        wsLip.getCell('D24').value = choHdl;
      }

      wb.worksheets.forEach(w => {
        w.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
      });

      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', \`attachment; filename="\${reportFilename(data, 'xlsx')}"\`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: 'Type 11' }, 'SUCCESS', req);
      return res.send(Buffer.from(buffer));
    }

    if (test.isCustomPackage) {`;

code = code.replace('if (test.isCustomPackage) {', type11Branch);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Successfully injected dedicated Type 11 Excel handler into server.js!');
