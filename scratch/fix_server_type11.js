/**
 * fix_server_type11.js
 * Fix Type 11 Excel generation in backend/server.js:
 * 
 * Problem 1: `copyWs(wbFbs.worksheets[0], ws)` copies from the FIRST sheet
 *   of fbs-template.xlsx which is an old patient record ("lakshan ") with 
 *   "Fasting Blood Sugar" hardcoded in B16. SGPT, GGT, and Lipid sheets 
 *   inherit this leftover text.
 * 
 * Fix 1: Use `wbFbs.getWorksheet('04132')` (clean template) instead of worksheets[0]
 * 
 * Problem 2: Even if we use the clean template, the template B16 has content
 *   from prior patient runs. After copyWs(), clear B16/E16 for non-FBS sheets.
 *
 * Fix 2: After copyWs for SGPT, GGT, Lipid, clear B16 and E16 explicitly.
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
let src = fs.readFileSync(serverPath, 'utf8');
const original = src;

const hasCRLF = src.includes('\r\n');
const NL = hasCRLF ? '\r\n' : '\n';
console.log(`Line ending: ${hasCRLF ? 'CRLF' : 'LF'}`);

let fixes = 0;

function replace(label, search, replacement) {
  const normalizedSearch = search.replace(/\r\n/g, '\n').replace(/\n/g, NL);
  const normalizedReplacement = replacement.replace(/\r\n/g, '\n').replace(/\n/g, NL);
  if (src.includes(normalizedSearch)) {
    src = src.replace(normalizedSearch, normalizedReplacement);
    console.log(`✅ Fixed [${label}]`);
    fixes++;
    return true;
  } else if (src.includes(search)) {
    src = src.replace(search, replacement);
    console.log(`✅ Fixed [${label}] (original NL)`);
    fixes++;
    return true;
  } else {
    console.error(`❌ FAILED [${label}]: Search string not found!`);
    console.error('  Searching for: ' + search.substring(0, 100));
    return false;
  }
}

// ============================================================
// FIX 1: FBS sheet - use '04132' template sheet, not worksheets[0]
// ============================================================
replace(
  'FBS sheet - use clean 04132 template',
  `          } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
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
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - End point ]';`,
  `          } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
            const fbsTpl = wbFbs.getWorksheet('04132') || wbFbs.worksheets[1] || wbFbs.worksheets[0];
            copyWs(fbsTpl, ws);
            // Clear any residual template data
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }
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
            ws.getCell('B16').value = 'FASTING BLOOD SUGAR';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Result'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Fasting Blood Sugar';
            ws.getCell('E20').value = \`\${fbsVal} mg/dl\`;
            ws.getCell('H20').value = '74 - 115 mg/dl';
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - End point ]';
            ws.getCell('D25').value = '**End of Report**';`
);

// ============================================================
// FIX 2: SGPT & SGOT sheet - clear residual template data
// ============================================================
replace(
  'SGPT & SGOT sheet - use clean template + clear B16',
  `          } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
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
            ws.getCell('B23').value = '[Test Method - Spectrophotometry - Kinetic]';`,
  `          } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
            const sgptSgotTpl = wbFbs.getWorksheet('04132') || wbFbs.worksheets[1] || wbFbs.worksheets[0];
            copyWs(sgptSgotTpl, ws);
            // Clear residual template data rows 16-35
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }
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
            ws.getCell('B16').value = 'SGPT & SGOT';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Result'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'SGPT';
            ws.getCell('E20').value = \`\${sgptVal} iu/l\`;
            ws.getCell('H20').value = 'Upto 45 iu/l (Men) / Upto 34 iu/l (Women)';
            ws.getCell('B21').value = 'SGOT';
            ws.getCell('E21').value = \`\${sgotVal} iu/l\`;
            ws.getCell('H21').value = 'Upto 35 iu/l (Men) / Upto 31 iu/l (Women)';
            ws.getCell('B23').value = '[Test Method - Spectrophotometry - Kinetic]';
            ws.getCell('D26').value = '**End of Report**';`
);

// ============================================================
// FIX 3: Gamma GT sheet - clear residual template data  
// ============================================================
replace(
  'Gamma GT sheet - use clean template + clear B16',
  `          } else if (tName === 'Gamma GT' || tName === 'GGT') {
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
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - Kinetic ]';`,
  `          } else if (tName === 'Gamma GT' || tName === 'GGT') {
            const ggtTpl = wbFbs.getWorksheet('04132') || wbFbs.worksheets[1] || wbFbs.worksheets[0];
            copyWs(ggtTpl, ws);
            // Clear residual template data rows 16-35
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }
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
            ws.getCell('B16').value = 'GAMMA GT';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Result'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Gamma GT';
            ws.getCell('E20').value = \`\${ggtVal} U/L\`;
            ws.getCell('H20').value = '5 - 40 U/L (Male) / 3 - 30 U/L (Female)';
            ws.getCell('B22').value = '[Test Method - Spectrophotometry - Kinetic]';
            ws.getCell('D25').value = '**End of Report**';`
);

// ============================================================
// FIX 4: Lipid Profile sheet - clear residual template data
// ============================================================
replace(
  'Lipid Profile sheet - use clean template + clear B16',
  `          } else if (tName === 'Lipid Profile') {
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
            ws.getCell('B27').value = '[Test Method - Spectrophotometry - End point ]';`,
  `          } else if (tName === 'Lipid Profile') {
            const lipidTpl = wbFbs.getWorksheet('04132') || wbFbs.worksheets[1] || wbFbs.worksheets[0];
            copyWs(lipidTpl, ws);
            // Clear residual template data rows 16-35
            for (let r = 16; r <= 35; r++) {
              for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
            }
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
            ws.getCell('B16').value = 'LIPID PROFILE';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Result'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Total Cholesterol'; ws.getCell('E20').value = \`\${cholVal} mg/dl\`; ws.getCell('H20').value = '< 240 mg/dl';
            ws.getCell('B21').value = 'HDL Cholesterol'; ws.getCell('E21').value = \`\${hdlVal} mg/dl\`; ws.getCell('H21').value = '35 - 55 mg/dl';
            ws.getCell('B22').value = 'LDL Cholesterol'; ws.getCell('E22').value = \`\${ldlVal} mg/dl\`; ws.getCell('H22').value = '< 130 mg/dl';
            ws.getCell('B23').value = 'VLDL Cholesterol'; ws.getCell('E23').value = \`\${vldlVal} mg/dl\`; ws.getCell('H23').value = '10 - 40 mg/dl';
            ws.getCell('B24').value = 'Triglyceride'; ws.getCell('E24').value = \`\${trigVal} mg/dl\`; ws.getCell('H24').value = '< 160 mg/dl';
            ws.getCell('B25').value = 'CHO / HDL ratio'; ws.getCell('E25').value = \`\${choHdlVal}\`; ws.getCell('H25').value = '3.3 - 4.4';
            ws.getCell('B27').value = '[Test Method - Spectrophotometry - End point]';
            ws.getCell('D30').value = '**End of Report**';`
);

// ============================================================
// Summary
// ============================================================
console.log(`\nTotal fixes applied: ${fixes}`);

if (src === original) {
  console.error('\n❌ No changes were made!');
  process.exit(1);
}

fs.writeFileSync(serverPath, src, 'utf8');
console.log(`\n✅ Written: ${serverPath}`);
console.log('\nRestart the server for changes to take effect.');
