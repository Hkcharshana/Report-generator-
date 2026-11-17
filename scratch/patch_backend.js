const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Add pkg_colombo_consultancy to BUILTIN_PACKAGES
const colomboPkgDef = `  {
    id: 'pkg_colombo_consultancy',
    name: 'Colombo Consultancy Package',
    code: 'Colombo Consultancy',
    category: 'Medical Packages',
    description: 'Colombo Consultancy Package (5 Reports: Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
    tests: ['Fasting Blood Sugar', 'SGPT & SGOT', 'Urine Full Report', 'Gamma GT', 'Lipid Profile'],
    isBuiltin: true,
    enabled: true
  },`;

if (!code.includes('pkg_colombo_consultancy')) {
  code = code.replace("const BUILTIN_PACKAGES = [", `const BUILTIN_PACKAGES = [\n${colomboPkgDef}`);
  console.log('Added pkg_colombo_consultancy to BUILTIN_PACKAGES');
}

// 2. Add reference records for 5330 & 5331
const colomboReferenceRecords = `
    // Colombo Consultancy Reference Patients (5330 & 5331)
    const rec5330 = {
      ref_no: '5330', raw_ref_no: '5330', passport_no: 'P0997553',
      fname: 'Miss.N.G.S.Diwanjalee', patient_name: 'Miss.N.G.S.Diwanjalee', full_name: 'Miss.N.G.S.Diwanjalee',
      age: '22', gender: 'Female', agency: 'Colombo Consultancy Lanka (Pvt) Ltd.',
      medical_date: '10 November 2026', specimen: 'Blood', report_time: '11:15 AM',
      medical_type: 'Colombo Consultancy Package', medical_type_name: 'Colombo Consultancy Package', package_name: 'Colombo Consultancy Package',
      fbs: '75', sgpt: '10', sgot: '13', gamma_gt: '18',
      cholesterol: '176', hdl: '44', ldl: '112.4', vldl: '19.6', triglyceride: '98', cho_hdl: '4',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.0153', ufr_ph: '6',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_pus_cells: '+ 01- 02 / hpf', ufr_epithelial_cells: '+ A few / hpf'
    };
    const rec5331 = {
      ref_no: '5331', raw_ref_no: '5331', passport_no: 'P0165027',
      fname: 'Mr.R.V.A.Upulsiri', patient_name: 'Mr.R.V.A.Upulsiri', full_name: 'Mr.R.V.A.Upulsiri',
      age: '27', gender: 'Male', agency: 'Colombo Consultancy Lanka (Pvt) Ltd.',
      medical_date: '10 November 2026', specimen: 'Blood', report_time: '11:20 AM',
      medical_type: 'Colombo Consultancy Package', medical_type_name: 'Colombo Consultancy Package', package_name: 'Colombo Consultancy Package',
      fbs: '106', sgpt: '50', sgot: '26', gamma_gt: '25',
      cholesterol: '226', hdl: '56.5', ldl: '143.5', vldl: '26', triglyceride: '130', cho_hdl: '4',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.01', ufr_ph: '6',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_pus_cells: '+ 01- 02 / hpf', ufr_epithelial_cells: '+ A few / hpf'
    };
    referenceRecords['5330'] = rec5330;
    referenceRecords['05330'] = rec5330;
    referenceRecords['P0997553'] = rec5330;
    referenceRecords['5331'] = rec5331;
    referenceRecords['05331'] = rec5331;
    referenceRecords['P0165027'] = rec5331;
`;

if (!code.includes("referenceRecords['5330']")) {
  code = code.replace("referenceRecords['04444'] = {", `${colomboReferenceRecords}\n    referenceRecords['04444'] = {`);
  console.log('Added reference records 5330 & 5331');
}

// 3. Register Gamma GT and Colombo Consultancy Package in buildTestData
const buildTestAdditions = `
    if (name === 'Colombo Consultancy Package' || name === 'Colombo Consultancy' || data.package_name === 'Colombo Consultancy Package') {
      const pkg = BUILTIN_PACKAGES.find(p => p.id === 'pkg_colombo_consultancy') || {
        name: 'Colombo Consultancy Package',
        code: 'Colombo Consultancy',
        tests: ['Fasting Blood Sugar', 'SGPT & SGOT', 'Urine Full Report', 'Gamma GT', 'Lipid Profile']
      };
      return {
        name: 'Colombo Consultancy Package',
        code: 'Colombo Consultancy',
        isCustomPackage: true,
        packageDef: pkg,
        result: 'Colombo Consultancy Package',
        reference: '5 Reports (Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
        unit: '',
        rows: []
      };
    }
    if (name === 'Gamma GT') {
      const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'test_result', '18'));
      return {
        name: 'Gamma GT',
        code: 'GGT',
        result: \`\${ggtVal} U/L\`,
        reference: '5 - 40 U/L',
        unit: 'U/L',
        method: '[Test Method - Spectrophotometry - Kinetic ]',
        specimen: 'Blood',
        rows: [
          { test: 'Gamma GT', result: \`\${ggtVal} U/L\`, unit: 'U/L', flag: '', ref: '5 - 40 U/L' }
        ]
      };
    }
`;

if (!code.includes("name === 'Colombo Consultancy Package'")) {
  code = code.replace("const matchedPkg = allPkgs.find(p =>", `${buildTestAdditions}\n    const matchedPkg = allPkgs.find(p =>`);
  console.log('Added buildTestData support for Colombo Consultancy Package & Gamma GT');
}

// 4. In Excel Export (if (test.isCustomPackage)), add branches for FBS, SGPT & SGOT, Gamma GT, Lipid Profile
const excelColomboBranches = `
          } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
            copyWs(wbFbs.worksheets[0], ws);
            ws.getCell('C9').value = refNo;
            ws.getCell('H9').value = passportNo;
            ws.getCell('C10').value = shortName;
            ws.getCell('H10').value = ageText;
            ws.getCell('C11').value = gender;
            ws.getCell('H11').value = agency;
            ws.getCell('C12').value = dateVal;
            ws.getCell('H12').value = 'Blood';
            ws.getCell('C13').value = issuedTime;
            const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '75'));
            ws.getCell('B20').value = 'Fasting Blood Sugar';
            ws.getCell('E20').value = \`\${fbsVal} mg/dl\`;
            ws.getCell('H20').value = '74 - 115 mg/dl';
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - End point ]';
          } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
            copyWs(wbFbs.worksheets[0], ws);
            ws.getCell('C9').value = refNo;
            ws.getCell('H9').value = passportNo;
            ws.getCell('C10').value = shortName;
            ws.getCell('H10').value = ageText;
            ws.getCell('C11').value = gender;
            ws.getCell('H11').value = agency;
            ws.getCell('C12').value = dateVal;
            ws.getCell('H12').value = 'Blood';
            ws.getCell('C13').value = issuedTime;
            const sgptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '10'));
            const sgotVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '13'));
            ws.getCell('B17').value = 'BLOOD FOR SGPT & SGOT';
            ws.getCell('B20').value = 'SGPT';
            ws.getCell('E20').value = \`\${sgptVal} iu/l\`;
            ws.getCell('H20').value = 'Upto 45 iu/l (Men) / Upto 34 iu/l (Women)';
            ws.getCell('B21').value = 'SGOT';
            ws.getCell('E21').value = \`\${sgotVal} iu/l\`;
            ws.getCell('H21').value = 'Upto 35 iu/l (Men) / Upto 31 iu/l (Women)';
            ws.getCell('B23').value = '[Test Method - Spectrophotometry - Kinetic]';
          } else if (tName === 'Gamma GT' || tName === 'GGT') {
            copyWs(wbFbs.worksheets[0], ws);
            ws.getCell('C9').value = refNo;
            ws.getCell('H9').value = passportNo;
            ws.getCell('C10').value = shortName;
            ws.getCell('H10').value = ageText;
            ws.getCell('C11').value = gender;
            ws.getCell('H11').value = agency;
            ws.getCell('C12').value = dateVal;
            ws.getCell('H12').value = 'Blood';
            ws.getCell('C13').value = issuedTime;
            const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '18'));
            ws.getCell('B17').value = 'GAMMA GT';
            ws.getCell('B20').value = 'Gamma GT';
            ws.getCell('E20').value = \`\${ggtVal} U/L\`;
            ws.getCell('H20').value = '5 - 40 U/L';
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - Kinetic ]';
          } else if (tName === 'Lipid Profile') {
            copyWs(wbFbs.worksheets[0], ws);
            ws.getCell('C9').value = refNo;
            ws.getCell('H9').value = passportNo;
            ws.getCell('C10').value = shortName;
            ws.getCell('H10').value = ageText;
            ws.getCell('C11').value = gender;
            ws.getCell('H11').value = agency;
            ws.getCell('C12').value = dateVal;
            ws.getCell('H12').value = 'Blood';
            ws.getCell('C13').value = issuedTime;
            const cholVal = pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '176'));
            const hdlVal = pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '44'));
            const ldlVal = pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', '112.4'));
            const vldlVal = pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', '19.6'));
            const trigVal = pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '98'));
            const choHdlVal = pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', '4'));
            ws.getCell('B17').value = 'LIPID PROFILE';
            ws.getCell('B20').value = 'Total Cholesterol'; ws.getCell('E20').value = \`\${cholVal} mg/dl\`; ws.getCell('H20').value = '< 240 mg/dl';
            ws.getCell('B21').value = 'HDL Cholesterol'; ws.getCell('E21').value = \`\${hdlVal} mg/dl\`; ws.getCell('H21').value = '35 - 55 mg/dl';
            ws.getCell('B22').value = 'LDL Cholesterol'; ws.getCell('E22').value = \`\${ldlVal} mg/dl\`; ws.getCell('H22').value = '< 130 mg/dl';
            ws.getCell('B23').value = 'VLDL Cholesterol'; ws.getCell('E23').value = \`\${vldlVal} mg/dl\`; ws.getCell('H23').value = '10 - 40 mg/dl';
            ws.getCell('B24').value = 'Triglyceride'; ws.getCell('E24').value = \`\${trigVal} mg/dl\`; ws.getCell('H24').value = '< 160 mg/dl';
            ws.getCell('B25').value = 'CHO / HDL ratio'; ws.getCell('E25').value = \`\${choHdlVal}\`; ws.getCell('H25').value = '3.3 - 4.4';
            ws.getCell('B27').value = '[Test Method - Spectrophotometry - End point ]';
`;

if (!code.includes("tName === 'Fasting Blood Sugar' || tName === 'FBS'")) {
  code = code.replace("} else if (tName === 'HIV Ag & Ab Test' || tName === 'HIV') {", `${excelColomboBranches}\n          } else if (tName === 'HIV Ag & Ab Test' || tName === 'HIV') {`);
  console.log('Added Excel custom package branches for FBS, SGPT/SGOT, Gamma GT, Lipid Profile');
}

// 5. In PDF Export (if (test.isCustomPackage)), add branches for FBS, SGPT & SGOT, Gamma GT, Lipid Profile
const pdfColomboBranches = `
            } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
              const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '75'));
              const fbsMethod = '[Test Method - Spectrophotometry - End point ]';
              pdfText(pageN, font, 'FASTING BLOOD SUGAR', 43, pY, 12 + fsBonus, true);
              const tWidth = font.bold.widthOfTextAtSize('FASTING BLOOD SUGAR', 12 + fsBonus);
              pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

              const hdrY = pY - 24;
              pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
              pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
              pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

              const rowY = hdrY - 28;
              pdfText(pageN, font, 'Fasting Blood Sugar', 70, rowY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, \`\${fbsVal} mg/dl\`, rowY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, '74 - 115 mg/dl', 370, rowY, 10.5 + fsBonus, false);

              pdfText(pageN, font, fbsMethod, 43, rowY - 32, 10 + fsBonus, false);
              pdfCenteredText(pageN, font, pageFooter, rowY - 64, 11 + fsBonus, true);
              await renderSign(pageN, 175);
            } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
              const sgptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '10'));
              const sgotVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '13'));
              const methodText = '[Test Method - Spectrophotometry - Kinetic]';

              pdfText(pageN, font, 'BLOOD FOR SGPT & SGOT', 43, pY, 12 + fsBonus, true);
              const tWidth = font.bold.widthOfTextAtSize('BLOOD FOR SGPT & SGOT', 12 + fsBonus);
              pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

              const hdrY = pY - 24;
              pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
              pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
              pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

              const r1Y = hdrY - 28;
              pdfText(pageN, font, 'SGPT', 70, r1Y, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, \`\${sgptVal} iu/l\`, r1Y, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Upto 45 iu/l (Men)', 370, r1Y, 10.5 + fsBonus, false);
              pdfText(pageN, font, 'Upto 34 iu/l (Women)', 370, r1Y - 14, 10.5 + fsBonus, false);

              const r2Y = r1Y - 32;
              pdfText(pageN, font, 'SGOT', 70, r2Y, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, \`\${sgotVal} iu/l\`, r2Y, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Upto 35 iu/l (Men)', 370, r2Y, 10.5 + fsBonus, false);
              pdfText(pageN, font, 'Upto 31 iu/l (Women)', 370, r2Y - 14, 10.5 + fsBonus, false);

              pdfText(pageN, font, methodText, 43, r2Y - 36, 10 + fsBonus, false);
              pdfCenteredText(pageN, font, pageFooter, r2Y - 68, 11 + fsBonus, true);
              await renderSign(pageN, 175);
            } else if (tName === 'Gamma GT' || tName === 'GGT') {
              const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '18'));
              const methodText = '[Test Method - Spectrophotometry - Kinetic ]';

              pdfText(pageN, font, 'GAMMA GT', 43, pY, 12 + fsBonus, true);
              const tWidth = font.bold.widthOfTextAtSize('GAMMA GT', 12 + fsBonus);
              pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

              const hdrY = pY - 24;
              pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
              pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
              pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

              const rowY = hdrY - 28;
              pdfText(pageN, font, 'Gamma GT', 70, rowY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, \`\${ggtVal} U/L\`, rowY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, '5 - 40 U/L', 370, rowY, 10.5 + fsBonus, false);

              pdfText(pageN, font, methodText, 43, rowY - 32, 10 + fsBonus, false);
              pdfCenteredText(pageN, font, pageFooter, rowY - 64, 11 + fsBonus, true);
              await renderSign(pageN, 175);
            } else if (tName === 'Lipid Profile') {
              const cholVal = pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '176'));
              const hdlVal = pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '44'));
              const ldlVal = pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', '112.4'));
              const vldlVal = pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', '19.6'));
              const trigVal = pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '98'));
              const choHdlVal = pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', '4'));
              const methodText = '[Test Method - Spectrophotometry - End point ]';

              pdfText(pageN, font, 'LIPID PROFILE', 43, pY, 12 + fsBonus, true);
              const tWidth = font.bold.widthOfTextAtSize('LIPID PROFILE', 12 + fsBonus);
              pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

              const hdrY = pY - 24;
              pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
              pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
              pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
              pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
              pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

              const lipidRows = [
                { label: 'Total Cholesterol', val: \`\${cholVal} mg/dl\`, ref: '< 240 mg/dl' },
                { label: 'HDL Cholesterol', val: \`\${hdlVal} mg/dl\`, ref: '35 - 55 mg/dl' },
                { label: 'LDL Cholesterol', val: \`\${ldlVal} mg/dl\`, ref: '< 130 mg/dl' },
                { label: 'VLDL Cholesterol', val: \`\${vldlVal} mg/dl\`, ref: '10 - 40 mg/dl' },
                { label: 'Triglyceride', val: \`\${trigVal} mg/dl\`, ref: '< 160 mg/dl' },
                { label: 'CHO / HDL ratio', val: \`\${choHdlVal}\`, ref: '3.3 - 4.4' }
              ];

              let curY = hdrY - 24;
              lipidRows.forEach(r => {
                pdfText(pageN, font, r.label, 70, curY, 10.5 + fsBonus, true);
                pdfCenteredText(pageN, font, r.val, curY, 10.5 + fsBonus, true, 260);
                pdfText(pageN, font, r.ref, 370, curY, 10 + fsBonus, false);
                curY -= 17;
              });

              curY -= 6;
              pdfText(pageN, font, methodText, 43, curY, 9.5 + fsBonus, false);

              // Reference ranges info box
              curY -= 18;
              pdfText(pageN, font, 'Coronary Heart Disease Risk :', 43, curY, 9.5 + fsBonus, true);
              curY -= 13;
              pdfText(pageN, font, 'Total Cholesterol : < 200 mg/dl Desirable, 200 - 239 Borderline High, >= 240 High', 43, curY, 8.5 + fsBonus, false);
              curY -= 11;
              pdfText(pageN, font, 'HDL : Low Risk > 60 mg/dl, High Risk < 35 mg/dl', 43, curY, 8.5 + fsBonus, false);
              curY -= 11;
              pdfText(pageN, font, 'LDL : Desirable < 130 mg/dl, Borderline 130 - 159, High Risk >= 160', 43, curY, 8.5 + fsBonus, false);
              curY -= 11;
              pdfText(pageN, font, 'Triglycerides : Desirable < 160 mg/dl, Borderline 160 - 200, High Risk >= 200', 43, curY, 8.5 + fsBonus, false);

              curY -= 18;
              pdfCenteredText(pageN, font, pageFooter, curY, 11 + fsBonus, true);
              await renderSign(pageN, 175);
`;

if (!code.includes("tName === 'Fasting Blood Sugar' || tName === 'FBS'") || !code.includes("BLOOD FOR SGPT & SGOT")) {
  code = code.replace("} else if (tName === 'Urine Drug Screening') {", `${pdfColomboBranches}\n            } else if (tName === 'Urine Drug Screening') {`);
  console.log('Added PDF custom package branches for FBS, SGPT/SGOT, Gamma GT, Lipid Profile');
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Successfully updated backend/server.js');
