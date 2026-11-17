const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'app.js'),
  path.join(__dirname, '..', 'frontend', 'app.js')
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');

  // 1. In updateTest: make sure isType11 is recognized and regular inputs hidden
  code = code.replace(
    "const isType7 = name === 'Type 7';",
    "const isType7 = name === 'Type 7';\n  const isType11 = name === 'Type 11' || name === 'Type 11 Medical Package' || name === 'Colombo Consultancy Package';"
  );

  code = code.replace(
    "'Urine Drug Screening', 'Type 7'].includes(name)",
    "'Urine Drug Screening', 'Type 7', 'Type 11'].includes(name)"
  );

  code = code.replace(
    "const isCustomTest = isUfr || isHba1c || isFbc || isBetaHcgFia || isBetaHcgRapid || isType10B || isUrineDrugOnly || isType7 || isCustomAdminTest || isCustomPkgTest;",
    "const isCustomTest = isUfr || isHba1c || isFbc || isBetaHcgFia || isBetaHcgRapid || isType10B || isType7 || isType11 || isUrineDrugOnly || isCustomAdminTest || isCustomPkgTest;"
  );

  // 2. In updatePreview: hide single-test table for isType11 and show type11PreviewContainer
  const oldPreviewToggle = `    // Detect custom packages
    const matchedCustomPkg = loadedPackages.find(p => !p.isBuiltin && (p.name === data.test_name || p.code === data.test_name));
    const isCustomPkg = !!matchedCustomPkg;
  
    const isType10B = data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug';
    const isType7 = data.test_name === 'Type 7';
    if (type10bWrap) type10bWrap.hidden = !isType10B;
    const type7Wrap = $('#type7PreviewContainer');
    if (type7Wrap) type7Wrap.hidden = !isType7;
    const customPkgWrap = $('#customPackagePreviewContainer');
    if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;`;

  const newPreviewToggle = `    // Detect custom packages & standard packages
    const matchedCustomPkg = loadedPackages.find(p => !p.isBuiltin && (p.name === data.test_name || p.code === data.test_name || (data.report_type && data.report_type !== 'single' && (p.name === data.report_type || p.code === data.report_type))));
    const isCustomPkg = !!matchedCustomPkg;
  
    const isType10B = data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug' || data.report_type === 'Type 10 B' || data.report_type === 'Type 10 B with urine drug';
    const isType7 = data.test_name === 'Type 7' || data.report_type === 'Type 7';
    const isType11 = data.test_name === 'Type 11' || data.test_name === 'Type 11 Medical Package' || data.report_type === 'Type 11';
    const isAnyPkg = isType10B || isType7 || isType11 || isCustomPkg;

    if (type10bWrap) type10bWrap.hidden = !isType10B;
    const type7Wrap = $('#type7PreviewContainer');
    if (type7Wrap) type7Wrap.hidden = !isType7;
    const type11Wrap = $('#type11PreviewContainer');
    if (type11Wrap) type11Wrap.hidden = !isType11;
    const customPkgWrap = $('#customPackagePreviewContainer');
    if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;`;

  if (code.includes(oldPreviewToggle)) {
    code = code.replace(oldPreviewToggle, newPreviewToggle);
    console.log(`✓ Replaced preview toggle in ${path.basename(path.dirname(f))}`);
  }

  // 3. Hide regular table, confirm, methodLine, and endReport for isAnyPkg
  code = code.replace(
    'if (regTableWrap) regTableWrap.hidden = isType10B || isType7 || isCustomPkg;',
    'if (regTableWrap) regTableWrap.hidden = isAnyPkg;'
  );
  code = code.replace(
    'if (endReport) endReport.hidden = isType10B || isType7 || isCustomPkg;',
    'if (endReport) endReport.hidden = isAnyPkg;'
  );

  // 4. Update stdTestTitle
  const oldTitleBlock = `        if (data.test_name === 'Urine Drug Screening') {
          stdTestTitle.textContent = 'URINE DRUG SCREENING TEST';
        } else if (isType7) {
          stdTestTitle.textContent = 'TYPE 7 (RUSSIA) MEDICAL PACKAGE';
        } else if (isCustomPkg) {
          stdTestTitle.textContent = (matchedCustomPkg.name || data.test_name).toUpperCase();
        } else if (!isType10B) {`;

  const newTitleBlock = `        if (data.test_name === 'Urine Drug Screening') {
          stdTestTitle.textContent = 'URINE DRUG SCREENING TEST';
        } else if (isType7) {
          stdTestTitle.textContent = 'TYPE 7 (RUSSIA) MEDICAL PACKAGE';
        } else if (isType11) {
          stdTestTitle.textContent = 'TYPE 11 MEDICAL PACKAGE';
        } else if (isCustomPkg) {
          stdTestTitle.textContent = (matchedCustomPkg.name || data.test_name).toUpperCase();
        } else if (!isType10B) {`;

  if (code.includes(oldTitleBlock)) {
    code = code.replace(oldTitleBlock, newTitleBlock);
  }

  // 5. Populate Type 11 cards live
  const type11CardLiveCode = `
    // Live Type 11 Package Preview Cards Update
    if (isType11) {
      if (confirm) confirm.hidden = true;
      if (methodLine) methodLine.hidden = true;
      if (endReport) endReport.hidden = true;
      if (regTableWrap) regTableWrap.hidden = true;
      if (fbcWrap) fbcWrap.hidden = true;
      if (stdTestTitle) stdTestTitle.textContent = 'TYPE 11 MEDICAL PACKAGE';
      if ($('#type11PrevFbs')) $('#type11PrevFbs').textContent = \`\${data.fbs || '75'} mg/dl\`;
      if ($('#type11PrevSgpt')) $('#type11PrevSgpt').textContent = \`\${data.sgpt || '10'} iu/l\`;
      if ($('#type11PrevSgot')) $('#type11PrevSgot').textContent = \`\${data.sgot || '13'} iu/l\`;
      if ($('#type11PrevGgt')) $('#type11PrevGgt').textContent = \`\${data.gamma_gt || '18'} U/L\`;
      if ($('#type11PrevChol')) $('#type11PrevChol').textContent = \`\${data.cholesterol || '176'} mg/dl\`;
      if ($('#type11PrevHdl')) $('#type11PrevHdl').textContent = \`\${data.hdl || '44'} mg/dl\`;
      if ($('#type11PrevLdl')) $('#type11PrevLdl').textContent = \`\${data.ldl || '112.4'} mg/dl\`;
      if ($('#type11PrevTrig')) $('#type11PrevTrig').textContent = \`\${data.triglyceride || '98'} mg/dl\`;
    }
`;

  if (!code.includes('// Live Type 11 Package Preview Cards Update')) {
    code = code.replace(
      "// Type 11 Multi-Sheet Package Live Preview Update",
      type11CardLiveCode.trim() + "\n    // Type 11 Multi-Sheet Package Live Preview Update"
    );
  }

  // 6. Remove old body.innerHTML for Type 11 table
  const oldType11BodyBranch = `    } else if (data.test_name === 'Type 11') {
      if (refHead) refHead.hidden = false;
      body.innerHTML = \`
        <tr>
          <th style="font-weight:bold; width:45%; border-bottom:1px solid #333; padding-bottom:6px;">Investigation</th>
          <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px; text-align:center;">Result</th>
          <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Reference Interval</th>
        </tr>
        <tr style="background:#f8fafc;"><td colspan="3" style="font-weight:bold; padding:4px 0; color:#0284c7;">1. FASTING BLOOD SUGAR</td></tr>
        <tr><td style="padding:4px 0;">Fasting Blood Sugar</td><td style="text-align:center; font-weight:bold;">\${data.fbs || '75'} mg/dl</td><td>74 - 115 mg/dl</td></tr>
        <tr style="background:#f8fafc;"><td colspan="3" style="font-weight:bold; padding:4px 0; color:#0284c7;">2. BLOOD FOR SGPT &amp; SGOT</td></tr>
        <tr><td style="padding:4px 0;">SGPT</td><td style="text-align:center; font-weight:bold;">\${data.sgpt || '10'} iu/l</td><td>Upto 45 iu/l (M) / 34 iu/l (W)</td></tr>
        <tr><td style="padding:4px 0;">SGOT</td><td style="text-align:center; font-weight:bold;">\${data.sgot || '13'} iu/l</td><td>Upto 35 iu/l (M) / 31 iu/l (W)</td></tr>
        <tr style="background:#f8fafc;"><td colspan="3" style="font-weight:bold; padding:4px 0; color:#0284c7;">3. URINE FULL REPORT</td></tr>
        <tr><td style="padding:4px 0;">Routine &amp; Microscopy</td><td style="text-align:center; font-weight:bold;">Clear / Normal</td><td>Normal</td></tr>
        <tr style="background:#f8fafc;"><td colspan="3" style="font-weight:bold; padding:4px 0; color:#0284c7;">4. GAMMA GT</td></tr>
        <tr><td style="padding:4px 0;">Gamma GT</td><td style="text-align:center; font-weight:bold;">\${data.gamma_gt || '18'} U/L</td><td>5 - 40 U/L</td></tr>
        <tr style="background:#f8fafc;"><td colspan="3" style="font-weight:bold; padding:4px 0; color:#0284c7;">5. LIPID PROFILE</td></tr>
        <tr><td style="padding:4px 0;">Total Cholesterol</td><td style="text-align:center; font-weight:bold;">\${data.cholesterol || '176'} mg/dl</td><td>&lt; 240 mg/dl</td></tr>
        <tr><td style="padding:4px 0;">HDL Cholesterol</td><td style="text-align:center; font-weight:bold;">\${data.hdl || '44'} mg/dl</td><td>35 - 55 mg/dl</td></tr>
        <tr><td style="padding:4px 0;">LDL Cholesterol</td><td style="text-align:center; font-weight:bold;">\${data.ldl || '112.4'} mg/dl</td><td>&lt; 130 mg/dl</td></tr>
        <tr><td style="padding:4px 0;">VLDL Cholesterol</td><td style="text-align:center; font-weight:bold;">\${data.vldl || '19.6'} mg/dl</td><td>10 - 40 mg/dl</td></tr>
        <tr><td style="padding:4px 0;">Triglyceride</td><td style="text-align:center; font-weight:bold;">\${data.triglyceride || '98'} mg/dl</td><td>&lt; 160 mg/dl</td></tr>
        <tr><td style="padding:4px 0;">CHO / HDL ratio</td><td style="text-align:center; font-weight:bold;">\${data.cho_hdl || '4'}</td><td>3.3 - 4.4</td></tr>
      \`;
      refs.innerHTML = \`
        <div style="font-size:11.5px; color:#475569; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px;">
          <strong>Export package:</strong> Auto-generates 5 sheets in Excel &amp; 5 pages in PDF with official signatures.
        </div>
      \`;`;

  if (code.includes(oldType11BodyBranch)) {
    code = code.replace(oldType11BodyBranch, '');
    console.log(`✓ Removed old Type 11 table HTML from body in ${path.basename(path.dirname(f))}`);
  }

  // 7. Wire prevExcelBtnType11
  if (!code.includes('prevExcelBtnType11')) {
    code += `\n  $('#prevExcelBtnType11')?.addEventListener('click', () => $('#excelBtn')?.click());\n`;
  }

  fs.writeFileSync(f, code, 'utf8');
  console.log(`✓ Processed ${path.basename(path.dirname(f))}/${path.basename(f)}`);
});
