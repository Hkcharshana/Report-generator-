const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'app.js'),
  path.join(__dirname, '..', 'frontend', 'app.js')
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');

  // 1. Ensure syncDrugGrid and handleDrugSelectChange are window-bound
  if (!code.includes('window.handleDrugSelectChange = handleDrugSelectChange;')) {
    const drugFn = `
function syncDrugGrid() {
  const panelSelect = document.getElementById('drugPanelTypeSelect');
  const is12 = panelSelect ? panelSelect.value === '12' : false;
  const g12 = document.getElementById('drug12Grid');
  const opiField = document.getElementById('field_urine_drug_opi');
  if (g12) g12.style.display = is12 ? 'grid' : 'none';
  if (opiField) opiField.style.display = is12 ? 'none' : '';
}
window.syncDrugGrid = syncDrugGrid;

function handleDrugSelectChange(sel) {
  if (!sel) return;
  if (sel.value === 'Positive') {
    sel.style.backgroundColor = '#fee2e2';
    sel.style.color = '#dc2626';
    sel.style.borderColor = '#ef4444';
    sel.style.fontWeight = '700';
  } else {
    sel.style.backgroundColor = '#ffffff';
    sel.style.color = '#1e293b';
    sel.style.borderColor = '#cbd5e1';
    sel.style.fontWeight = '600';
  }
  if (typeof updatePreview === 'function') updatePreview();
}
window.handleDrugSelectChange = handleDrugSelectChange;
`;
    code = code.replace(/function syncDrugGrid\(\) \{[\s\S]*?if \(opiField\) opiField\.style\.display = is12 \? 'none' : '';\s*\}/, drugFn.trim());
  }

  // 2. Add Gamma GT and Colombo Consultancy Package to defaults & units
  if (!code.includes("'Gamma GT': ['gamma_gt'")) {
    code = code.replace("'Brucellosis Test': ['brucellosis_test', 'Negative'],", `'Brucellosis Test': ['brucellosis_test', 'Negative'],\n  'Gamma GT': ['gamma_gt', '5 - 40 U/L'],\n  'Colombo Consultancy Package': ['colombo_pkg', 'Medical Package (5 Reports)'],`);
  }
  if (!code.includes("'Gamma GT': 'U/L'")) {
    code = code.replace("'Brucellosis Test': '',", `'Brucellosis Test': '',\n  'Gamma GT': 'U/L',\n  'Colombo Consultancy Package': '',`);
  }

  // 3. In handleReportTypeChange, add branch for Colombo Consultancy Package
  const colomboTypeHandler = `    if (selectedType === 'Colombo Consultancy Package') {
      testSelect.innerHTML = \`
        <option value="Colombo Consultancy Package" selected>Colombo Consultancy Package - All 5 Reports</option>
        <optgroup label="Included Reports">
          <option value="Fasting Blood Sugar">1. Fasting Blood Sugar</option>
          <option value="SGPT & SGOT">2. SGPT &amp; SGOT</option>
          <option value="Urine Full Report">3. Urine Full Report</option>
          <option value="Gamma GT">4. Gamma GT</option>
          <option value="Lipid Profile">5. Lipid Profile</option>
        </optgroup>
      \`;
      if (pkgCard) pkgCard.hidden = true;
      testSelect.value = 'Colombo Consultancy Package';
      updateTest();
      updatePreview();
      return;
    }
`;

  if (!code.includes("selectedType === 'Colombo Consultancy Package'")) {
    code = code.replace("if (selectedType === 'Type 7') {", `${colomboTypeHandler}\n    if (selectedType === 'Type 7') {`);
  }

  // 4. In updateTest, handle isColomboPkg
  if (!code.includes('const isColomboPkg =')) {
    code = code.replace("const isType7 = name === 'Type 7';", `const isType7 = name === 'Type 7';\n  const isColomboPkg = name === 'Colombo Consultancy Package';`);
    code = code.replace("if (type7Box) type7Box.hidden = !isType7;", `if (type7Box) type7Box.hidden = !isType7;\n  const colomboBox = $('#colomboResults');\n  if (colomboBox) colomboBox.hidden = !isColomboPkg;`);
  }

  // 5. In collect(), read colombo fields
  const colomboCollect = `    if (data.test_name === 'Colombo Consultancy Package') {
      data.specimen = 'Blood';
      data.fbs = $('#colombo_fbs')?.value || '75';
      data.sgpt = $('#colombo_sgpt')?.value || '10';
      data.sgot = $('#colombo_sgot')?.value || '13';
      data.gamma_gt = $('#colombo_gamma_gt')?.value || '18';
      data.cholesterol = $('#colombo_cholesterol')?.value || '176';
      data.hdl = $('#colombo_hdl')?.value || '44';
      data.ldl = $('#colombo_ldl')?.value || '112.4';
      data.vldl = $('#colombo_vldl')?.value || '19.6';
      data.triglyceride = $('#colombo_triglyceride')?.value || '98';
      data.cho_hdl = $('#colombo_cho_hdl')?.value || '4';
      data.test_result = 'Colombo Consultancy Package';
    }
`;
  if (!code.includes("data.test_name === 'Colombo Consultancy Package'")) {
    code = code.replace("if (data.test_name === 'Type 7') {", `${colomboCollect}\n    if (data.test_name === 'Type 7') {`);
  }

  // 6. In autoSelectLabTest, detect 5330 / 5331 or Colombo Consultancy
  const autoDetectColombo = `    if (record.package_name === 'Colombo Consultancy Package' || (record.ref_no && (record.ref_no.includes('5330') || record.ref_no.includes('5331')))) {
      picked = 'Colombo Consultancy Package';
      const rType = $('#report_type');
      if (rType) {
        rType.value = 'Colombo Consultancy Package';
        rType.dispatchEvent(new Event('change'));
      }
      if ($('#colombo_fbs')) $('#colombo_fbs').value = record.fbs || '75';
      if ($('#colombo_sgpt')) $('#colombo_sgpt').value = record.sgpt || '10';
      if ($('#colombo_sgot')) $('#colombo_sgot').value = record.sgot || '13';
      if ($('#colombo_gamma_gt')) $('#colombo_gamma_gt').value = record.gamma_gt || '18';
      if ($('#colombo_cholesterol')) $('#colombo_cholesterol').value = record.cholesterol || '176';
      if ($('#colombo_hdl')) $('#colombo_hdl').value = record.hdl || '44';
      if ($('#colombo_ldl')) $('#colombo_ldl').value = record.ldl || '112.4';
      if ($('#colombo_vldl')) $('#colombo_vldl').value = record.vldl || '19.6';
      if ($('#colombo_triglyceride')) $('#colombo_triglyceride').value = record.triglyceride || '98';
      if ($('#colombo_cho_hdl')) $('#colombo_cho_hdl').value = record.cho_hdl || '4';
      return;
    }
`;
  if (!code.includes("record.package_name === 'Colombo Consultancy Package'")) {
    code = code.replace("if (record.panel_type || record.drugs) {", `${autoDetectColombo}\n    if (record.panel_type || record.drugs) {`);
  }

  // 7. In updatePreview, render Colombo Consultancy Package preview
  const colomboPreviewHtml = `    } else if (data.test_name === 'Colombo Consultancy Package') {
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
      \`;
`;
  if (!code.includes("data.test_name === 'Colombo Consultancy Package'")) {
    code = code.replace("} else if (data.test_name === 'Type 7') {", `${colomboPreviewHtml}\n    } else if (data.test_name === 'Type 7') {`);
  }

  // 8. Add resetColomboBtn handler
  if (!code.includes('resetColomboBtn')) {
    code = code.replace("$('#resetType7Btn')?.addEventListener", `$('#resetColomboBtn')?.addEventListener('click', () => {
      if ($('#colombo_fbs')) $('#colombo_fbs').value = '75';
      if ($('#colombo_sgpt')) $('#colombo_sgpt').value = '10';
      if ($('#colombo_sgot')) $('#colombo_sgot').value = '13';
      if ($('#colombo_gamma_gt')) $('#colombo_gamma_gt').value = '18';
      if ($('#colombo_cholesterol')) $('#colombo_cholesterol').value = '176';
      if ($('#colombo_hdl')) $('#colombo_hdl').value = '44';
      if ($('#colombo_ldl')) $('#colombo_ldl').value = '112.4';
      if ($('#colombo_vldl')) $('#colombo_vldl').value = '19.6';
      if ($('#colombo_triglyceride')) $('#colombo_triglyceride').value = '98';
      if ($('#colombo_cho_hdl')) $('#colombo_cho_hdl').value = '4';
      updatePreview();
      toast('Colombo Consultancy Package reset to defaults');
    });\n  $('#resetType7Btn')?.addEventListener`);
  }

  fs.writeFileSync(f, code, 'utf8');
  console.log(`Updated ${path.basename(path.dirname(f))}/${path.basename(f)}`);
});
