const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'app.js'),
  path.join(__dirname, '..', 'frontend', 'app.js')
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');

  // 1. Defaults: add Fasting Blood Sugar
  if (!code.includes("'Fasting Blood Sugar': ['fbs'")) {
    code = code.replace(
      "'FBS': ['fbs', '74 - 115 mg/dL'],",
      `'FBS': ['fbs', '74 - 115 mg/dL'],\n  'Fasting Blood Sugar': ['fbs', '74 - 115 mg/dL'],\n  'Fasting': ['fbs', '74 - 115 mg/dL'],`
    );
  }

  // 2. Units: add Fasting Blood Sugar
  if (!code.includes("'Fasting Blood Sugar': 'mg/dL'")) {
    code = code.replace(
      "'FBS': 'mg/dL',",
      `'FBS': 'mg/dL',\n  'Fasting Blood Sugar': 'mg/dL',\n  'Fasting': 'mg/dL',`
    );
  }

  // 3. standardSingleTestsHtml: add Fasting Blood Sugar and Type 11
  if (!code.includes('<option>Fasting Blood Sugar</option>')) {
    code = code.replace('<option>FBS</option>', '<option>FBS</option>\n    <option>Fasting Blood Sugar</option>');
  }

  // 4. In applySecurityConfigToUI: prevent disabling of FBS / Fasting / Included reports
  const oldPermBlock = `    // 4. Test dropdown permissions
    const testSelect = $('#test_name');
    if (testSelect) {
      const allowedSet = new Set(rawAllowed.map(s => String(s).trim().toLowerCase()));
      Array.from(testSelect.options).forEach(opt => {
        const val = opt.value.trim().toLowerCase();
        if (!val || val.includes('-- select')) return;
        const isAllowed = allowedSet.has(val);
        opt.disabled = !isAllowed;
        const baseName = opt.getAttribute('data-base-name') || opt.textContent.replace(/\\s*\\(Disabled\\)$/, '');
        opt.setAttribute('data-base-name', baseName);
        opt.textContent = isAllowed ? baseName : \`\${baseName} (Disabled)\`;
      });
    }`;

  const newPermBlock = `    // 4. Test dropdown permissions (Bulletproof Alias Resolution)
    const testSelect = $('#test_name');
    if (testSelect) {
      const allowedSet = new Set(rawAllowed.map(s => String(s).trim().toLowerCase()));
      // Auto-expand aliases: if fbs is allowed, also allow fasting blood sugar, fasting, etc.
      if (allowedSet.has('fbs') || allowedSet.has('fasting') || allowedSet.has('fasting blood sugar')) {
        allowedSet.add('fbs');
        allowedSet.add('fasting blood sugar');
        allowedSet.add('fasting');
        allowedSet.add('fasting blood sugar (fbs)');
        allowedSet.add('fbs (fasting blood sugar)');
        allowedSet.add('1. fasting blood sugar');
        allowedSet.add('1. fasting blood sugar (fbs)');
      }
      if (allowedSet.has('type 11') || allowedSet.has('pkg_type11')) {
        allowedSet.add('type 11');
        allowedSet.add('type 11 medical package');
        allowedSet.add('colombo consultancy package');
      }
      Array.from(testSelect.options).forEach(opt => {
        const val = opt.value.trim().toLowerCase();
        if (!val || val.includes('-- select')) return;
        
        // Never disable items inside an "Included Reports" optgroup of a selected package
        const parentOptgroup = opt.closest('optgroup');
        const isIncludedReports = parentOptgroup && /included reports/i.test(parentOptgroup.label);

        const isFbsMatch = (val.includes('fbs') || val.includes('fasting')) && (allowedSet.has('fbs') || allowedSet.has('fasting blood sugar'));
        const isAllowed = isIncludedReports || isFbsMatch || allowedSet.has(val);

        opt.disabled = !isAllowed;
        const baseName = opt.getAttribute('data-base-name') || opt.textContent.replace(/\\s*\\(Disabled\\)$/, '');
        opt.setAttribute('data-base-name', baseName);
        opt.textContent = isAllowed ? baseName : \`\${baseName} (Disabled)\`;
      });
    }`;

  if (code.includes(oldPermBlock)) {
    code = code.replace(oldPermBlock, newPermBlock);
    console.log(`✓ Replaced permission block in ${path.basename(path.dirname(f))}`);
  }

  // 5. handleReportTypeChange for Type 11: clean optgroup
  const oldType11Branch = `    if (selectedType === 'Type 11') {
      testSelect.innerHTML = \`
        <option value="Type 11" selected>Type 11 - All 5 Reports</option>
        <optgroup label="Included Reports">
          <option value="Fasting Blood Sugar">1. Fasting Blood Sugar</option>
          <option value="SGPT & SGOT">2. SGPT &amp; SGOT</option>
          <option value="Urine Full Report">3. Urine Full Report</option>
          <option value="Gamma GT">4. Gamma GT</option>
          <option value="Lipid Profile">5. Lipid Profile</option>
        </optgroup>
      \`;
      if (pkgCard) pkgCard.hidden = true;
      testSelect.value = 'Type 11';
      updateTest();
      updatePreview();
      return;
    }`;

  const newType11Branch = `    if (selectedType === 'Type 11') {
      testSelect.innerHTML = \`
        <option value="Type 11" selected>Type 11 (Medical Package - 5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>
        <optgroup label="Included Reports">
          <option value="FBS">1. Fasting Blood Sugar (FBS)</option>
          <option value="SGPT & SGOT">2. SGPT &amp; SGOT</option>
          <option value="Urine Full Report">3. Urine Full Report</option>
          <option value="Gamma GT">4. Gamma GT</option>
          <option value="Lipid Profile">5. Lipid Profile</option>
        </optgroup>
      \`;
      if (pkgCard) pkgCard.hidden = true;
      testSelect.value = 'Type 11';
      updateTest();
      updatePreview();
      return;
    }`;

  if (code.includes(oldType11Branch)) {
    code = code.replace(oldType11Branch, newType11Branch);
  }

  // 6. In updatePreview: show and populate #type11PreviewContainer
  const previewCardUpdate = `
    // Type 11 Multi-Sheet Package Live Preview Update
    const isType11Active = (data.test_name === 'Type 11' || data.package_name === 'Type 11');
    const type11Prev = $('#type11PreviewContainer');
    if (type11Prev) {
      type11Prev.hidden = !isType11Active;
      if (isType11Active) {
        if ($('#type11PrevFbs')) $('#type11PrevFbs').textContent = \`\${data.fbs || '75'} mg/dl\`;
        if ($('#type11PrevSgpt')) $('#type11PrevSgpt').textContent = \`\${data.sgpt || '10'} iu/l\`;
        if ($('#type11PrevSgot')) $('#type11PrevSgot').textContent = \`\${data.sgot || '13'} iu/l\`;
        if ($('#type11PrevGgt')) $('#type11PrevGgt').textContent = \`\${data.gamma_gt || '18'} U/L\`;
        if ($('#type11PrevChol')) $('#type11PrevChol').textContent = \`\${data.cholesterol || '176'} mg/dl\`;
        if ($('#type11PrevHdl')) $('#type11PrevHdl').textContent = \`\${data.hdl || '44'} mg/dl\`;
        if ($('#type11PrevLdl')) $('#type11PrevLdl').textContent = \`\${data.ldl || '112.4'} mg/dl\`;
        if ($('#type11PrevTrig')) $('#type11PrevTrig').textContent = \`\${data.triglyceride || '98'} mg/dl\`;
      }
    }
`;

  if (!code.includes('isType11Active =')) {
    code = code.replace(
      "const isType10bActive = (data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug');",
      `const isType10bActive = (data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug');\n${previewCardUpdate}`
    );
  }

  // 7. Wire #resetType11Btn
  if (!code.includes('resetType11Btn')) {
    code = code.replace(
      "$('#resetColomboBtn')?.addEventListener",
      `$('#resetType11Btn')?.addEventListener('click', () => {
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
      toast('Type 11 Multi-Sheet Package reset to defaults');
    });\n  $('#resetColomboBtn')?.addEventListener`
    );
  }

  // 8. Connect live input change for Type 11 input fields to update preview
  if (!code.includes('type11_live_sync_attached')) {
    const liveSyncCode = `
  // Type 11 Live Input Sync
  window.type11_live_sync_attached = true;
  ['colombo_fbs', 'colombo_sgpt', 'colombo_sgot', 'colombo_gamma_gt', 'colombo_cholesterol', 'colombo_hdl', 'colombo_ldl', 'colombo_vldl', 'colombo_triglyceride', 'colombo_cho_hdl'].forEach(id => {
    $('#' + id)?.addEventListener('input', () => updatePreview());
  });
`;
    code += `\n${liveSyncCode}`;
  }

  fs.writeFileSync(f, code, 'utf8');
  console.log(`✓ Updated ${path.basename(path.dirname(f))}/${path.basename(f)}`);
});
