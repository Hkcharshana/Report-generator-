const fs = require('fs');

let serverCode = fs.readFileSync('backend/server.js', 'utf8');

// 1. UFR PDF bold removal in Custom Package UFR
// Lines 6184-6198
const ufrChemTarget = `chemRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, true);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, true);`;
const ufrChemReplacement = `chemRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, false);`;

const ufrMicroTarget = `microRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, true);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, true);`;
const ufrMicroReplacement = `microRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, false);`;

serverCode = serverCode.replace(ufrChemTarget, ufrChemReplacement);
serverCode = serverCode.replace(ufrMicroTarget, ufrMicroReplacement);

// 2. UFR PDF bold removal in Type 7 Russia Package (around line 6453 and 6466)
const t7ChemTarget = `test.chemicalRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, true);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, true);`;
const t7ChemReplacement = `test.chemicalRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);`;

const t7MicroTarget = `test.microscopyRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, true);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, true);`;
const t7MicroReplacement = `test.microscopyRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);`;

// Notice t7ChemTarget and single UFR (test.chemicalRows...) appear twice in serverCode (Type 7 and Single UFR)
// Using replaceAll or global regex will update both!
serverCode = serverCode.split(t7ChemTarget).join(t7ChemReplacement);
serverCode = serverCode.split(t7MicroTarget).join(t7MicroReplacement);

// 3. result_note fallback in server.js lines 5500 and 5861
// Replace default 'Repeated and Confirmed' with ''
serverCode = serverCode.replace(
  "const note = pdfVal(data,'result_note','Repeated and Confirmed');",
  "const note = pdfVal(data,'result_note','');"
);
serverCode = serverCode.replace(
  "const note = pdfVal(data,'result_note','Repeated and Confirmed');",
  "const note = pdfVal(data,'result_note','');"
);

// 4. Update SGPT & SGOT row generation in selectedTest (around line 3439)
const sgptRowsTarget = `    rows = [
      { label: 'SGPT', result: formatLab(ptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 34 iu/l (Women)', unit: '' },
      { label: '', result: '', reference: '', unit: '' },
      { label: 'SGOT', result: formatLab(otVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];`;

const sgptRowsReplacement = `    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numPt = parseFloat(String(ptVal).replace(/[^0-9.]/g, ''));
    const numOt = parseFloat(String(otVal).replace(/[^0-9.]/g, ''));
    const isPtHigh = (!isNaN(numPt) && numPt > 45);
    const isOtHigh = (!isNaN(numOt) && numOt > 35);
    rows = [
      { label: 'SGPT', result: formatLab(ptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isPtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 34 iu/l (Women)', unit: '' },
      { label: '', result: '', reference: '', unit: '' },
      { label: 'SGOT', result: formatLab(otVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isOtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];`;

serverCode = serverCode.replace(sgptRowsTarget, sgptRowsReplacement);

// 5. Update single SGOT & single SGPT in selectedTest
const sgotTarget = `    rows = [
      { label: 'SGOT', result: formatLab(sgotVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];`;
const sgotReplacement = `    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numOt = parseFloat(String(sgotVal).replace(/[^0-9.]/g, ''));
    const isOtHigh = (!isNaN(numOt) && numOt > 35);
    rows = [
      { label: 'SGOT', result: formatLab(sgotVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isOtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];`;
serverCode = serverCode.replace(sgotTarget, sgotReplacement);

const sgptTarget = `    rows = [
      { label: 'SGPT', result: formatLab(sgptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 34 iu/l (Women)', unit: '' }
    ];`;
const sgptReplacement = `    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numPt = parseFloat(String(sgptVal).replace(/[^0-9.]/g, ''));
    const isPtHigh = (!isNaN(numPt) && numPt > 45);
    rows = [
      { label: 'SGPT', result: formatLab(sgptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isPtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 34 iu/l (Women)', unit: '' }
    ];`;
serverCode = serverCode.replace(sgptTarget, sgptReplacement);

fs.writeFileSync('backend/server.js', serverCode, 'utf8');
console.log('Successfully updated backend/server.js');
