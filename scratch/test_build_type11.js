const ExcelJS = require('exceljs');
const fs = require('fs');

async function buildType11Workbook(data = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NeoSys Medicare';
  wb.lastModifiedBy = 'NeoSys Medicare';
  wb.created = new Date();
  wb.modified = new Date();

  const refNo = String(data.ref_no || '5329');
  const passportNo = String(data.passport_no || data.nic || 'P1010657');
  const patientName = String(data.full_name || data.name || 'Mr.I.A.L.Dhilshanka');
  const age = String(data.age || '25 Years');
  const gender = String(data.gender || data.sex || 'Male');
  const agency = String(data.agency || data.refby || 'Colombo Consultancy Lanka (Pvt) Ltd.');
  const dateVal = String(data.date || '02 October 2026');
  const issuedTime = String(data.issued_time || data.report_time || '11:28 AM');

  const defaultColWidths = [24, 3, 26, 12, 3, 36, 12, 16];

  function setupSheet(ws, title, specimen = 'Blood') {
    ws.views = [{ showGridLines: true }];
    defaultColWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Row 6: Title
    ws.mergeCells('A6:F6');
    const r6 = ws.getCell('A6');
    r6.value = 'Laboratory Report';
    r6.font = { name: 'Arial Black', size: 16, bold: true, underline: true };
    r6.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(6).height = 25;

    // Rows 8-12: Patient Block
    const pRows = [
      { r: 8, l1: 'Ref.No', v1: refNo, l2: 'PP/NIC', v2: passportNo, b1: true },
      { r: 9, l1: 'Name', v1: patientName, l2: 'Age', v2: age },
      { r: 10, l1: 'Sex', v1: gender, l2: 'Ref.By', v2: agency },
      { r: 11, l1: 'Date', v1: dateVal, l2: 'Specimen', v2: specimen, b2: true },
      { r: 12, l1: 'Report Issued Time', v1: issuedTime, l2: '', v2: '' }
    ];

    pRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.height = 18;
      row.getCell(1).value = item.l1;
      row.getCell(1).font = { name: 'Cambria', size: 11, bold: !!item.b1 };
      row.getCell(2).value = item.l1 ? ':' : '';
      row.getCell(2).font = { name: 'Calibri', size: 11, bold: !!item.b1 };
      row.getCell(3).value = item.v1;
      row.getCell(3).font = { name: 'Cambria', size: 11, bold: !!item.b1 };

      if (item.l2) {
        row.getCell(4).value = item.l2;
        row.getCell(4).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
        row.getCell(5).value = ':';
        row.getCell(5).font = { name: 'Calibri', size: 11, bold: !!item.b2 };
        row.getCell(6).value = item.v2;
        row.getCell(6).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
      }
    });

    // Row 15: Section Title
    const r15 = ws.getCell('A15');
    r15.value = title;
    r15.font = { name: 'Arial Black', size: 12, bold: true, underline: true };
    ws.getRow(15).height = 22;

    // Signature Block at bottom
    const sigStart = 31;
    const sigs = [
      'W.D.Gunarathne',
      'Chief Medical Laboratory Technologist',
      'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012',
      'W.H.O.Fellow'
    ];
    sigs.forEach((text, idx) => {
      const cell = ws.getCell(`A${sigStart + idx}`);
      cell.value = text;
      cell.font = { name: 'Cambria', size: 10, bold: idx === 0 };
      ws.getRow(sigStart + idx).height = 16;
    });

    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };
  }

  function styleHeaders(ws, r, headers) {
    const row = ws.getRow(r);
    row.height = 20;
    headers.forEach((h, i) => {
      const col = h.col || (i === 0 ? 1 : i === 1 ? 3 : 5);
      const cell = row.getCell(col);
      cell.value = h.text;
      cell.font = { name: 'Arial Black', size: 11, bold: true };
      if (h.align) cell.alignment = { horizontal: h.align };
    });
  }

  // 1. FBS
  {
    const ws = wb.addWorksheet('FBS');
    setupSheet(ws, 'Fasting Blood Sugar', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Fasting Blood Sugar';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const fbsVal = data.fbs || data.colombo_fbs || '75';
    r19.getCell(3).value = `${String(fbsVal).replace(/\s*mg\/dl/i, '')} mg/dl`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '74 - 115 mg/dl';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C26');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 2. SGPT & SGOT
  {
    const ws = wb.addWorksheet('SGPT & SGOT');
    setupSheet(ws, 'Blood for SGPT & SGOT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);

    const ptVal = data.sgpt || data.colombo_sgpt || '10';
    const otVal = data.sgot || data.colombo_sgot || '13';

    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'SGPT';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = `${String(ptVal).replace(/\s*iu\/l/i, '')} iu/l`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = 'Upto 45 iu/l (Men)';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };

    const r20 = ws.getRow(20);
    r20.getCell(1).value = '[Repeated and Confirmed]';
    r20.getCell(1).font = { name: 'Cambria', size: 10, italic: true };
    r20.getCell(5).value = 'Upto 34 iu/l (Women)';
    r20.getCell(5).font = { name: 'Cambria', size: 11 };

    const r22 = ws.getRow(22);
    r22.getCell(1).value = 'SGOT';
    r22.getCell(1).font = { name: 'Cambria', size: 11 };
    r22.getCell(3).value = `${String(otVal).replace(/\s*iu\/l/i, '')} iu/l`;
    r22.getCell(3).font = { name: 'Cambria', size: 11 };
    r22.getCell(3).alignment = { horizontal: 'center' };
    r22.getCell(5).value = 'Upto 35 iu/l (Men)';
    r22.getCell(5).font = { name: 'Cambria', size: 11 };

    const r23 = ws.getRow(23);
    r23.getCell(1).value = '[Repeated and Confirmed]';
    r23.getCell(1).font = { name: 'Cambria', size: 10, italic: true };
    r23.getCell(5).value = 'Upto 31 iu/l (Women)';
    r23.getCell(5).font = { name: 'Cambria', size: 11 };

    ws.getCell('A25').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C28');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 3. UFR
  {
    const ws = wb.addWorksheet('UFR');
    setupSheet(ws, 'URINE FULL REPORT', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 4, text: 'Results', align: 'center' }]);

    const chemTitle = ws.getCell('A19');
    chemTitle.value = 'CHEMICAL EXAMINATION';
    chemTitle.font = { name: 'Arial Black', size: 11, bold: true, underline: true };

    const chemRows = [
      { r: 20, l: 'Colour', v: data.ufr_colour || 'Pale Yellow' },
      { r: 21, l: 'Appearance', v: data.ufr_appearance || 'Clear' },
      { r: 22, l: 'Specific Gravity', v: data.ufr_specific_gravity || '1.010' },
      { r: 23, l: 'pH', v: data.ufr_ph || '6.0' },
      { r: 24, l: 'Glucose', v: data.ufr_glucose || 'Nil' },
      { r: 25, l: 'Protein (Albumin)', v: data.ufr_protein || 'Nil' },
      { r: 26, l: 'Ketone Bodies', v: data.ufr_ketone || 'Nil' },
      { r: 27, l: 'Bilirubin', v: data.ufr_bilirubin || 'Nil' },
      { r: 28, l: 'Urobilinogen', v: data.ufr_urobilinogen || '+ Normal' }
    ];
    chemRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(4).value = item.v;
      row.getCell(4).font = { name: 'Cambria', size: 11 };
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const micTitle = ws.getCell('A30');
    micTitle.value = 'CENTRIFUGED DEPOSITS';
    micTitle.font = { name: 'Arial Black', size: 11, bold: true, underline: true };

    const micRows = [
      { r: 31, l: 'Pus Cells', v: data.ufr_pus_cells || '+ 01 - 02 /hpf' },
      { r: 32, l: 'Red Cells', v: data.ufr_red_cells || 'Nil' },
      { r: 33, l: 'Epithelial Cells', v: data.ufr_epithelial_cells || '+ A Few      /hpf' },
      { r: 34, l: 'Organisms', v: data.ufr_organisms || 'Nil' },
      { r: 35, l: 'Crystals', v: data.ufr_crystals || 'Nil' },
      { r: 36, l: 'Casts', v: data.ufr_casts || 'Nil' }
    ];
    micRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(4).value = item.v;
      row.getCell(4).font = { name: 'Cambria', size: 11 };
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const endCell = ws.getCell('C38');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 4. Gamma GT
  {
    const ws = wb.addWorksheet('Gamma GT');
    setupSheet(ws, 'Gamma GT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Gamma GT';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const ggtVal = data.gamma_gt || data.colombo_gamma_gt || '18';
    r19.getCell(3).value = `${String(ggtVal).replace(/\s*u\/l/i, '')} U/L`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '5 - 40 U/L (Male) / 3 - 30 U/L (Female)';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C26');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 5. Lipid Profile
  {
    const ws = wb.addWorksheet('Lipid Profile');
    setupSheet(ws, 'Lipid Profile', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);

    const cholVal = parseFloat(data.cholesterol || data.colombo_cholesterol || '176') || 176;
    const hdlVal = parseFloat(data.hdl || data.colombo_hdl || '44') || 44;
    const ldlVal = parseFloat(data.ldl || data.colombo_ldl || '112.4') || 112.4;
    const vldlVal = parseFloat(data.vldl || data.colombo_vldl || '19.6') || 19.6;
    const trigVal = parseFloat(data.triglyceride || data.colombo_triglyceride || '98') || 98;
    const choHdlVal = data.cho_hdl || data.colombo_cho_hdl || '4';

    const lipRows = [
      { r: 19, l: 'Total Cholesterol', v: `${cholVal} mg/dl`, ref: '< 240 mg/dl' },
      { r: 20, l: 'HDL Cholesterol', v: `${hdlVal} mg/dl`, ref: '35 - 55 mg/dl' },
      { r: 21, l: 'LDL Cholesterol', v: `${ldlVal} mg/dl`, ref: '< 130 mg/dl' },
      { r: 22, l: 'VLDL Cholesterol', v: `${vldlVal} mg/dl`, ref: '10 - 40 mg/dl' },
      { r: 23, l: 'Triglyceride', v: `${trigVal} mg/dl`, ref: '< 160 mg/dl' },
      { r: 24, l: 'CHO / HDL ratio', v: `${choHdlVal}`, ref: '3.3 - 4.4' }
    ];

    lipRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(3).value = item.v;
      row.getCell(3).font = { name: 'Cambria', size: 11 };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(5).value = item.ref;
      row.getCell(5).font = { name: 'Cambria', size: 11 };
    });

    ws.getCell('A26').value = '[Test Method - Spectrophotometry - End point]';
    ws.getCell('A26').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C29');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  return wb;
}

(async () => {
  const patient4239 = {
    ref_no: '00004239',
    passport_no: 'N8339046',
    full_name: 'Mr.I.A.L.Dhilshanka',
    age: '25 Years',
    gender: 'Male',
    agency: 'OPD',
    date: '02 October 2026',
    issued_time: '11:28 AM',
    fbs: '75',
    sgpt: '10',
    sgot: '13',
    gamma_gt: '18',
    cholesterol: '176',
    hdl: '44',
    ldl: '112.4',
    vldl: '19.6',
    triglyceride: '98',
    cho_hdl: '4'
  };

  const wb = await buildType11Workbook(patient4239);
  await wb.xlsx.writeFile('scratch/00004239_Type-11_perfect.xlsx');
  console.log('Saved scratch/00004239_Type-11_perfect.xlsx');

  // Verify all 5 sheets
  for (const ws of wb.worksheets) {
    console.log(`\n=== SHEET: ${ws.name} ===`);
    for (let r = 1; r <= 32; r++) {
      const row = ws.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        cells.push(`${cell.address}:${JSON.stringify(cell.value)}`);
      });
      if (cells.length) console.log(`  Row ${r}: ${cells.join(' | ')}`);
    }
  }
})();
