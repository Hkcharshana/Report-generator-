const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const targetStr = `} else if (tName === 'Urine Drug Screening') {
            renderRapidTestBody(pageN, pY, 'URINE DRUG SCREENING TEST (12 DRUGS)', '12 Panel Urine Drug Screen', 'All Negative', '(Test Method - Rapid Chromatographic Immunoassay)', pageFooter);
            await renderSign(pageN, 175);`;

const replacement = `} else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
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
          } else if (tName === 'Urine Drug Screening') {
            renderRapidTestBody(pageN, pY, 'URINE DRUG SCREENING TEST (12 DRUGS)', '12 Panel Urine Drug Screen', 'All Negative', '(Test Method - Rapid Chromatographic Immunoassay)', pageFooter);
            await renderSign(pageN, 175);`;

const idx = code.indexOf(targetStr);
if (idx !== -1) {
  code = code.substring(0, idx) + replacement + code.substring(idx + targetStr.length);
  fs.writeFileSync(serverFile, code, 'utf8');
  console.log('Successfully patched PDF branches for Colombo Consultancy Package!');
} else {
  console.error('Target string still not matched!');
}
