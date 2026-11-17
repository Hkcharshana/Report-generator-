const fs = require('fs');

['public/app.js', 'frontend/app.js'].forEach(filePath => {
  let s = fs.readFileSync(filePath, 'utf8');

  // 1. Add Shipping to defaults map at top if not present
  if (!s.includes("'Shipping':")) {
    s = s.replace(
      "'Type 11': ['type11_pkg', 'Medical Package (5 Reports)'],",
      `'Type 11': ['type11_pkg', 'Medical Package (5 Reports)'],\n  'Shipping': ['shipping_pkg', 'Shipping Medical Package (14 Reports)'],`
    );
  }

  // 2. In updateTest(), handle isShipping
  if (!s.includes('const isShipping =')) {
    s = s.replace(
      "const isColomboPkg = name === 'Type 11' || name === 'Colombo Consultancy Package';",
      `const isColomboPkg = name === 'Type 11' || name === 'Colombo Consultancy Package';\n  const isShipping = name === 'Shipping' || name === 'Type 12 - 1 (Shipping)' || name === 'Type 12 - 1' || (selectedPkg === 'Shipping');`
    );

    s = s.replace(
      "'Type 7', 'Type 11'].includes(name)",
      `'Type 7', 'Type 11', 'Shipping'].includes(name)`
    );

    s = s.replace(
      "const colomboBox = $('#colomboResults');\n  if (colomboBox) colomboBox.hidden = !isColomboPkg;",
      `const colomboBox = $('#colomboResults');\n  if (colomboBox) colomboBox.hidden = !isColomboPkg;\n  const shippingBox = $('#shippingResults');\n  if (shippingBox) shippingBox.hidden = !isShipping;`
    );
  }

  // 3. In renderLivePreview(), handle isShipping
  if (!s.includes('const isShippingPreview =')) {
    s = s.replace(
      "const isType11Preview = data.test_name === 'Type 11' || data.test_name === 'Colombo Consultancy Package';",
      `const isType11Preview = data.test_name === 'Type 11' || data.test_name === 'Colombo Consultancy Package';\n  const isShippingPreview = data.test_name === 'Shipping' || data.report_type === 'Shipping' || data.test_name === 'Type 12 - 1 (Shipping)' || data.test_name === 'Type 12 - 1';`
    );

    s = s.replace(
      "const isAnyPkg = isType10B || isType7 || isType11Preview || isCustomPkg;",
      "const isAnyPkg = isType10B || isType7 || isType11Preview || isShippingPreview || isCustomPkg;"
    );

    s = s.replace(
      "const type11Wrap = $('#type11PreviewContainer');\n  if (type11Wrap) type11Wrap.hidden = !isType11Preview;",
      `const type11Wrap = $('#type11PreviewContainer');\n  if (type11Wrap) type11Wrap.hidden = !isType11Preview;\n  const shipWrap = $('#shippingPreviewContainer');\n  if (shipWrap) shipWrap.hidden = !isShippingPreview;`
    );

    // Add shipping live preview updater
    const shipPrevUpdater = `
  // ── Shipping Preview Cards ───────────────────────────────────────────
  if (isShippingPreview) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setT('shipPrevAlcohol', $('#shipping_blood_alcohol')?.value || data.blood_alcohol || 'Not Detected');
    setT('shipPrevCrp', $('#shipping_crp')?.value || data.crp || '< 06 mg/dL');
    setT('shipPrevEsr', $('#shipping_esr')?.value || data.esr || '03 mm/1hr');
    setT('shipPrevFbs', $('#shipping_fbs')?.value || data.fbs || '76 mg/dl');
    setT('shipPrevCreatinine', $('#shipping_creatinine')?.value || data.creatinine || '1.2 mg/dL');
    setT('shipPrevEgfr', $('#shipping_egfr')?.value || data.egfr || '83 ml/min/1.73m2');
    setT('shipPrevSyphilis', $('#shipping_syphilis')?.value || data.syphilis || 'Negative');
    setT('shipPrevVdrl', $('#shipping_vdrl')?.value || data.vdrl || 'Non Reactive');
    setT('shipPrevChol', $('#shipping_cholesterol')?.value || data.cholesterol || '228 mg/dl');
    setT('shipPrevSgpt', $('#shipping_sgpt')?.value || data.sgpt || '26 iu/l');
    setT('shipPrevSgot', $('#shipping_sgot')?.value || data.sgot || '30 iu/l');
    setT('shipPrevHba1c', $('#shipping_hba1c')?.value || data.hba1c || '5.1%');
    setT('shipPrevHcv', $('#shipping_hcv')?.value || data.hcv || 'Negative');
    setT('shipPrevHbsag', $('#shipping_hbsag')?.value || data.hbsag || 'Negative');
    setT('shipPrevHiv', $('#shipping_hiv')?.value || data.hiv || 'Negative');
  }
`;
    s = s.replace(
      "// ── Type 11 / Colombo Consultancy Preview Cards ───────────────────────────",
      `${shipPrevUpdater}\n  // ── Type 11 / Colombo Consultancy Preview Cards ───────────────────────────`
    );
  }

  // 4. In collect(), map shipping form inputs
  if (!s.includes('data.test_name === "Shipping"')) {
    const collectShipping = `
  if (data.test_name === 'Shipping' || data.report_type === 'Shipping') {
    data.test_name = 'Shipping';
    data.blood_alcohol = $('#shipping_blood_alcohol')?.value || 'Not Detected';
    data.crp = $('#shipping_crp')?.value || '< 06 mg/dL';
    data.esr = $('#shipping_esr')?.value || '03 mm/1hr';
    data.fbs = $('#shipping_fbs')?.value || '76 mg/dl';
    data.creatinine = $('#shipping_creatinine')?.value || '1.2 mg/dL';
    data.egfr = $('#shipping_egfr')?.value || '83 ml/min/1.73m2';
    data.syphilis = $('#shipping_syphilis')?.value || 'Negative';
    data.vdrl = $('#shipping_vdrl')?.value || 'Non Reactive';
    data.cholesterol = $('#shipping_cholesterol')?.value || '228 mg/dl';
    data.sgpt = $('#shipping_sgpt')?.value || '26 iu/l';
    data.sgot = $('#shipping_sgot')?.value || '30 iu/l';
    data.hba1c_result = $('#shipping_hba1c')?.value || '5.1%';
    data.hba1c = data.hba1c_result;
    data.hcv = $('#shipping_hcv')?.value || 'Negative';
    data.hbsag = $('#shipping_hbsag')?.value || 'Negative';
    data.hiv = $('#shipping_hiv')?.value || 'Negative';
  }
`;
    s = s.replace(
      "if (data.test_name === 'Type 11') {",
      `${collectShipping}\n  if (data.test_name === 'Type 11') {`
    );
  }

  // 5. In test_name change listener, add Shipping to builtinPackages
  if (!s.includes("'Shipping'")) {
    s = s.replace(
      "const builtinPackages = ['Type 10 B', 'Type 10 B with urine drug', 'Type 11', 'Type 7'];",
      "const builtinPackages = ['Type 10 B', 'Type 10 B with urine drug', 'Type 11', 'Type 7', 'Shipping'];"
    );
  }

  // 6. Hook up navShipping tab click
  if (!s.includes("navShippingBtn.addEventListener")) {
    const navCode = `
// Nav Shipping tab click listener
const navShippingBtn = document.getElementById('navShipping');
if (navShippingBtn) {
  navShippingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
    navShippingBtn.classList.add('active');
    const rType = document.getElementById('report_type');
    if (rType) rType.value = 'Shipping';
    handleReportTypeChange('Shipping');
    const shipSection = document.getElementById('shippingResults') || document.getElementById('test');
    if (shipSection) {
      shipSection.hidden = false;
      shipSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    toast('🚢 Shipping Medical Package selected (14 Reports)');
  });
}
`;
    s = s.replace(
      "$('#report_type')?.addEventListener('change'",
      `${navCode}\n$('#report_type')?.addEventListener('change'`
    );
  }

  // 7. Auto-detect shipping in setPatient(record)
  if (!s.includes("record.medical_type_name.includes('Shipping')")) {
    const autoDetectShipping = `
    // Auto-detect Shipping Package
    const mType = String(record.medical_type_name || '');
    const pos = String(record.position || '').toLowerCase();
    const agn = String(record.agency || '').toLowerCase();
    if (mType.includes('Shipping') || mType.includes('12 - 1') || pos.includes('seaman') || agn.includes('shipmanagement')) {
      const rType = $('#report_type');
      if (rType) rType.value = 'Shipping';
      handleReportTypeChange('Shipping');
      // Populate shipping fields from record
      if (record.fbs && $('#shipping_fbs')) {
        const val = record.fbs.replace(/^[a-z\\s]+/i, '').trim();
        $('#shipping_fbs').value = val.includes('mg') ? val : val + ' mg/dl';
      }
      if (record.cholesterol && record.cholesterol !== 'Not Tested' && $('#shipping_cholesterol')) {
        const val = record.cholesterol.replace(/^[a-z\\s]+/i, '').trim();
        $('#shipping_cholesterol').value = val.includes('mg') ? val : val + ' mg/dl';
      }
      if (record.sgpt && record.sgpt !== 'Not Tested' && $('#shipping_sgpt')) {
        const val = record.sgpt.replace(/^[a-z\\s]+/i, '').trim();
        $('#shipping_sgpt').value = val.includes('iu') ? val : val + ' iu/l';
      }
      if (record.sgot && record.sgot !== 'Not Tested' && $('#shipping_sgot')) {
        const val = record.sgot.replace(/^[a-z\\s]+/i, '').trim();
        $('#shipping_sgot').value = val.includes('iu') ? val : val + ' iu/l';
      }
      if (record.creatinine && record.creatinine !== 'Not Tested' && $('#shipping_creatinine')) {
        const val = record.creatinine.replace(/^[a-z\\s]+/i, '').trim();
        $('#shipping_creatinine').value = val.includes('mg') ? val : val + ' mg/dL';
      }
      if (record.esr && record.esr !== 'Not Tested' && $('#shipping_esr')) {
        $('#shipping_esr').value = record.esr.includes('mm') ? record.esr : record.esr + ' mm/1hr';
      }
      const note = String(record.patient_status_note || '') + ' ' + String(record.lab_note || '');
      const hbMatch = note.match(/hba1c\\s*([0-9.]+)\\s*%/i);
      if (hbMatch && $('#shipping_hba1c')) {
        $('#shipping_hba1c').value = hbMatch[1] + '%';
      }
      if (record.vdrl && record.vdrl !== 'Not Tested' && $('#shipping_vdrl')) {
        $('#shipping_vdrl').value = record.vdrl;
      }
      if (record.hiv && record.hiv !== 'Not Tested' && $('#shipping_hiv')) {
        $('#shipping_hiv').value = record.hiv;
      }
      if (record.hcv && record.hcv !== 'Not Tested' && $('#shipping_hcv')) {
        $('#shipping_hcv').value = record.hcv;
      }
    }
`;
    s = s.replace(
      "// Auto-detect Type 11 Colombo Consultancy Package",
      `${autoDetectShipping}\n    // Auto-detect Type 11 Colombo Consultancy Package`
    );
  }

  // 8. Live input sync for shipping
  if (!s.includes('shipping_live_sync_attached')) {
    const liveSyncCode = `
  // Live input sync for Shipping Package
  const shipInputs = [
    'shipping_blood_alcohol', 'shipping_crp', 'shipping_esr', 'shipping_fbs',
    'shipping_creatinine', 'shipping_egfr', 'shipping_syphilis', 'shipping_vdrl',
    'shipping_cholesterol', 'shipping_sgpt', 'shipping_sgot', 'shipping_hba1c',
    'shipping_hcv', 'shipping_hbsag', 'shipping_hiv'
  ];
  shipInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updatePreview());
  });
  window.shipping_live_sync_attached = true;
`;
    s = s.replace(
      "window.type11_live_sync_attached = true;",
      `window.type11_live_sync_attached = true;\n${liveSyncCode}`
    );
  }

  fs.writeFileSync(filePath, s);
  console.log('Successfully patched', filePath);
});
