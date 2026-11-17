const ExcelJS = require('exceljs');
const fs = require('fs');

async function createShippingWorkbook(data = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NeoSys Medicare';
  wb.lastModifiedBy = 'NeoSys Medicare';
  wb.created = new Date();
  wb.modified = new Date();

  const refNo = data.ref_no || '04904';
  const passportNo = data.passport_no || 'N10880963';
  const patientName = data.patient_name || data.fname || 'Mr.W.U.H.Kumara';
  const age = data.age ? `${String(data.age).replace(/\s*Years?$/i, '')} Years` : '31 Years';
  const gender = data.gender || 'Male';
  const agency = data.agency || 'Lauterjung Shipmanagement Colombo Ltd.,';
  const dateVal = data.date || '26 October 2026';
  const issuedTime = data.time || '12:37 PM';

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
      { r: 10, l1: 'Sex', v1: gender, l2: 'Referred By', v2: agency },
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

  // 1. Blood Alcohol Test
  {
    const ws = wb.addWorksheet('Blood Alcohol');
    setupSheet(ws, 'Blood Alcohol Test', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Blood Alcohol';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.blood_alcohol || 'Not Detected';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
  }

  // 2. C-reactive protein
  {
    const ws = wb.addWorksheet('CRP');
    setupSheet(ws, 'C-reactive protein', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'C-reactive protein';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.crp || '< 06 mg/dL';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '<06 mg/dL';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Latex Agglutination]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 3. ESR
  {
    const ws = wb.addWorksheet('ESR');
    setupSheet(ws, 'ESR', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Erythrocyte Sedimentation Rate';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.esr || '03 mm/1hr';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A21').value = 'Reference Range   (ESR 01st Hour)';
    ws.getCell('A21').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('C22').value = 'Male';
    ws.getCell('C22').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('C22').alignment = { horizontal: 'center' };
    ws.getCell('E22').value = 'Female';
    ws.getCell('E22').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('E22').alignment = { horizontal: 'center' };

    const esrRanges = [
      ['Newborn', '<3mm/hr', '<3mm/hr'],
      ['Children', '<13mm/hr', '<13mm/hr'],
      ['12 – 20 Year', '<15mm/hr', '<18mm/hr'],
      ['20 – 55 Year', '<17mm/hr', '<21mm/hr'],
      ['>55 Year', '<19mm/hr', '<23mm/hr']
    ];
    esrRanges.forEach((row, i) => {
      const r = ws.getRow(23 + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(3).value = row[1];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(5).value = row[2];
      r.getCell(5).font = { name: 'Cambria', size: 10 };
      r.getCell(5).alignment = { horizontal: 'center' };
    });
    ws.getCell('A29').value = '[Test Method - Westregren Method]';
    ws.getCell('A29').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 4. FBS
  {
    const ws = wb.addWorksheet('FBS');
    setupSheet(ws, 'FBS', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Fasting Blood Sugar';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.fbs ? (String(data.fbs).includes('mg') ? data.fbs : `${data.fbs} mg/dl`) : '76 mg/dl';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '74 - 115 mg/dl';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 5. S.Creatinine & eGFR
  {
    const ws = wb.addWorksheet('S.Creatinine & eGFR');
    setupSheet(ws, 'S.Creatinine & eGFR', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Serum Creatinine';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.creatinine ? (String(data.creatinine).includes('mg') ? data.creatinine : `${data.creatinine} mg/dL`) : '1.2 mg/dL';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '0.6 - 1.3 mg/dL';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };

    const r20 = ws.getRow(20);
    r20.getCell(1).value = 'eGFR';
    r20.getCell(1).font = { name: 'Cambria', size: 11 };
    r20.getCell(3).value = data.egfr || '83 ml/min/1.73m2';
    r20.getCell(3).font = { name: 'Cambria', size: 11 };
    r20.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A22').value = 'Reference Ranges [eGFR] : ';
    ws.getCell('A22').font = { name: 'Cambria', size: 11, bold: true, underline: true };
    const egfrRanges = [
      ['> 90', 'Normal'],
      ['60 - 89', 'Mildly decreased'],
      ['45 - 59', 'Mildly to moderately decreased'],
      ['30 - 44', 'Moderately to severly deccreased'],
      ['15 - 29', 'Severly descreased'],
      ['<15', 'Kidney failure']
    ];
    egfrRanges.forEach((item, i) => {
      const r = ws.getRow(23 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
    });
  }

  // 6. Serology (Syphilis & VDRL)
  {
    const ws = wb.addWorksheet('Serology');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Syphilis';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.syphilis || 'Negative';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };

    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'VDRL';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.vdrl || 'Non Reactive';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };

    ws.getCell('A24').value = '[SYPHILIS - Immnochromatography]';
    ws.getCell('A24').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('A25').value = '[VDRL- Carbon Antigen Method]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 7. Total Cholesterol
  {
    const ws = wb.addWorksheet('Total Cholesterol');
    setupSheet(ws, 'Total Cholesterol', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Cholesterol';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = data.cholesterol ? (String(data.cholesterol).includes('mg') ? data.cholesterol : `${data.cholesterol} mg/dl`) : '228 mg/dl';
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '<240 mg/dl';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 8. Blood for SGPT & SGOT
  {
    const ws = wb.addWorksheet('SGPT & SGOT');
    setupSheet(ws, 'Blood for SGPT & SGOT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'SGPT';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.sgpt ? (String(data.sgpt).includes('iu') ? data.sgpt : `${data.sgpt} iu/l`) : '26 iu/l';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };
    r18.getCell(5).value = 'Upto 45 iu/l (Men)';
    r18.getCell(5).font = { name: 'Cambria', size: 11 };

    const r19 = ws.getRow(19);
    r19.getCell(5).value = 'Upto 34 iu/l (Women)';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };

    const r21 = ws.getRow(21);
    r21.getCell(1).value = 'SGOT';
    r21.getCell(1).font = { name: 'Cambria', size: 11 };
    r21.getCell(3).value = data.sgot ? (String(data.sgot).includes('iu') ? data.sgot : `${data.sgot} iu/l`) : '30 iu/l';
    r21.getCell(3).font = { name: 'Cambria', size: 11 };
    r21.getCell(3).alignment = { horizontal: 'center' };
    r21.getCell(5).value = 'Upto 35 iu/l (Men)';
    r21.getCell(5).font = { name: 'Cambria', size: 11 };

    const r22 = ws.getRow(22);
    r22.getCell(5).value = 'Upto 31 iu/l (Women)';
    r22.getCell(5).font = { name: 'Cambria', size: 11 };

    ws.getCell('A26').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A26').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 9. Urine Full Report
  {
    const ws = wb.addWorksheet('UFR');
    setupSheet(ws, 'URINE FULL REPORT', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Results', align: 'left' }]);

    const chem = [
      ['Colour', data.ufr_colour || 'Pale Yellow'],
      ['Appearance', data.ufr_appearance || 'Clear'],
      ['Specific Gravity', data.ufr_sg || '1.015'],
      ['pH', data.ufr_ph || '6.0'],
      ['Glucose', data.ufr_glucose || 'Nil'],
      ['Protein', data.ufr_protein || 'Nil'],
      ['Ketone Bodies', data.ufr_ketone || 'Nil'],
      ['Bilirubin', data.ufr_bilirubin || 'Nil'],
      ['Urobilinogen', data.ufr_urobilinogen || '+ Normal']
    ];
    chem.forEach((item, i) => {
      const r = ws.getRow(19 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(2).value = '-';
      r.getCell(2).font = { name: 'Calibri', size: 11 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });

    ws.getCell('A29').value = 'Centrifuged Urine Microscopy';
    ws.getCell('A29').font = { name: 'Times New Roman', size: 11, bold: true, underline: true };

    const micro = [
      ['Pus Cells', data.ufr_pus || '+ 01 - 02 / hpf'],
      ['Red Cells', data.ufr_red || 'Nil'],
      ['Epithelial Cells', data.ufr_epi || '+ A few   / hpf'],
      ['Organisms', data.ufr_org || 'Nil'],
      ['Crystals', data.ufr_crys || 'Nil'],
      ['Casts', data.ufr_casts || 'Nil']
    ];
    micro.forEach((item, i) => {
      const r = ws.getRow(30 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(2).value = '-';
      r.getCell(2).font = { name: 'Calibri', size: 11 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });
  }

  // 10. Urine Drug Screening Test (12 parameters)
  {
    const ws = wb.addWorksheet('Urine Drug');
    setupSheet(ws, 'URINE DRUG SCREENING TEST', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);

    const drugs = [
      'Amphetamine (AMP)',
      'Barbiturates (BAR)',
      'Benzodiazepine (BZO)',
      'Buprenorphine (BUP)',
      'Cocaine (COC)',
      'Marijuana (THC)',
      'Methadone (MTD)',
      'Methamphetamine (MET)',
      'Methylenedioxymethamphetamine (MDMA)',
      'Morphine (MOP)',
      'Phencyclidine (PCP)',
      'Tricyclic Antidepressants (TCA)'
    ];
    drugs.forEach((dName, i) => {
      const r = ws.getRow(18 + i);
      r.getCell(1).value = dName;
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(3).value = 'Negative';
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });
    ws.getCell('A31').value = '[Test Method - Immnochromatography]';
    ws.getCell('A31').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 11. Haemoglobin A1C
  {
    const ws = wb.addWorksheet('HbA1c');
    setupSheet(ws, 'HAEMOGLOBIN A1C', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'HbA1c';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.hba1c || '5.1%';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A20').value = 'Reference Range';
    ws.getCell('A20').font = { name: 'Arial Black', size: 10, bold: true, underline: true };
    const hba1cRefs = [
      ['Below 6.0%', '-', 'Normal'],
      ['6.0% to 6.4%', '-', 'Prediabetes'],
      ['6.5% or above', '-', 'Diabetes'],
      ['<7.0%', '-', 'Goal of Therapy (Adults)'],
      ['>8.0%', '-', 'Action Suggested (Adults)']
    ];
    hba1cRefs.forEach((row, i) => {
      const r = ws.getRow(21 + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(2).value = row[1];
      r.getCell(2).font = { name: 'Calibri', size: 10 };
      r.getCell(3).value = row[2];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
    });
    ws.getCell('A27').value = 'Analyzer - Ichroma II';
    ws.getCell('A27').font = { name: 'Cambria', size: 10, bold: true };
    ws.getCell('A28').value = '(Test Method - Fluorescence Immunoassay (FIA))';
    ws.getCell('A28').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 12. Hepatitis C [HCV]
  {
    const ws = wb.addWorksheet('HCV');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Hepatitis C [HCV]';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.hcv || 'Negative';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test method - Immnochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 13. Hepatitis B [HBsAg]
  {
    const ws = wb.addWorksheet('HBsAg');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Hepatitis B [HBsAg]';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.hbsag || 'Negative';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test method - Immnochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 14. HIV Test
  {
    const ws = wb.addWorksheet('HIV');
    setupSheet(ws, 'HIV TEST', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'HIV I & II';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = data.hiv || 'Negative';
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };
    ws.getCell('A23').value = '[Test Method - Immunochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  return wb;
}

async function test() {
  const wb = await createShippingWorkbook();
  await wb.xlsx.writeFile('scratch/test_shipping_output.xlsx');
  console.log('Successfully generated scratch/test_shipping_output.xlsx with sheets:', wb.worksheets.map(w => w.name));
}
test().catch(console.error);
