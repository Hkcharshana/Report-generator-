const fs = require('fs');

function updateAppFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. UFR Bold Removal in live preview (lines 1511-1519)
  const previewChemTarget = `let html = chemicalRows.map(([label, res]) =>
      \`<tr><td style="font-weight:600; width:45%;">\${label}</td><td style="font-weight:600;"><span style="display:inline-block; width:22px;">_</span> \${res}</td></tr>\`
    ).join('');`;
  const previewChemReplacement = `let html = chemicalRows.map(([label, res]) =>
      \`<tr><td style="font-weight:normal; width:45%;">\${label}</td><td style="font-weight:normal;"><span style="display:inline-block; width:22px;">_</span> \${res}</td></tr>\`
    ).join('');`;

  const previewMicroTarget = `html += microscopyRows.map(([label, res]) =>
      \`<tr><td style="font-weight:600; width:45%;">\${label}</td><td style="font-weight:600;"><span style="display:inline-block; width:22px;">_</span> \${res}</td></tr>\`
    ).join('');`;
  const previewMicroReplacement = `html += microscopyRows.map(([label, res]) =>
      \`<tr><td style="font-weight:normal; width:45%;">\${label}</td><td style="font-weight:normal;"><span style="display:inline-block; width:22px;">_</span> \${res}</td></tr>\`
    ).join('');`;

  code = code.replace(previewChemTarget, previewChemReplacement);
  code = code.replace(previewMicroTarget, previewMicroReplacement);

  // 2. SGPT & SGOT live preview Repeated and Confirmed update (lines 1749-1782)
  const previewSgptTarget = `    body.innerHTML = \`
      <tr><td>SGPT</td><td><b>\${formatLab(pt)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>
      <tr style="height:12px;"><td></td><td></td><td></td></tr>
      <tr><td>SGOT</td><td><b>\${formatLab(ot)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>
    \`;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGOT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgot_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\\s*i?u\\/l\\b/gi, '').trim();
      return num ? \`\${num} iu/l\` : '?';
    };
    body.innerHTML = \`
      <tr><td>SGOT</td><td><b>\${formatLab(res)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>
    \`;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGPT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgpt_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\\s*i?u\\/l\\b/gi, '').trim();
      return num ? \`\${num} iu/l\` : '?';
    };
    body.innerHTML = \`
      <tr><td>SGPT</td><td><b>\${formatLab(res)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>
    \`;`;

  const previewSgptReplacement = `    const hasNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const isPtHigh = checkIsResultHigh('SGPT', pt);
    const isOtHigh = checkIsResultHigh('SGOT', ot);
    const ptConfirm = (hasNote || isPtHigh) ? '<b>[Repeated and Confirmed]</b>' : '';
    const otConfirm = (hasNote || isOtHigh) ? '<b>[Repeated and Confirmed]</b>' : '';
    body.innerHTML = \`
      <tr><td>SGPT</td><td><b>\${formatLab(pt)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td>\${ptConfirm}</td><td>Upto 34 iu/l (Women)</td></tr>
      <tr style="height:12px;"><td></td><td></td><td></td></tr>
      <tr><td>SGOT</td><td><b>\${formatLab(ot)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td>\${otConfirm}</td><td>Upto 31 iu/l (Women)</td></tr>
    \`;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGOT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgot_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\\s*i?u\\/l\\b/gi, '').trim();
      return num ? \`\${num} iu/l\` : '?';
    };
    const hasNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const isOtHigh = checkIsResultHigh('SGOT', res);
    const otConfirm = (hasNote || isOtHigh) ? '<b>[Repeated and Confirmed]</b>' : '';
    body.innerHTML = \`
      <tr><td>SGOT</td><td><b>\${formatLab(res)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td>\${otConfirm}</td><td>Upto 31 iu/l (Women)</td></tr>
    \`;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGPT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgpt_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\\s*i?u\\/l\\b/gi, '').trim();
      return num ? \`\${num} iu/l\` : '?';
    };
    const hasNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const isPtHigh = checkIsResultHigh('SGPT', res);
    const ptConfirm = (hasNote || isPtHigh) ? '<b>[Repeated and Confirmed]</b>' : '';
    body.innerHTML = \`
      <tr><td>SGPT</td><td><b>\${formatLab(res)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td>\${ptConfirm}</td><td>Upto 34 iu/l (Women)</td></tr>
    \`;`;

  code = code.replace(previewSgptTarget, previewSgptReplacement);

  // 3. Update previewConfirm visibility in updatePreview (around line 1166)
  const confirmTarget = `if (confirm) confirm.hidden = _isCustomPkgCheck || ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'SGPT', 'SGOT', 'SGPT & SGOT', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);`;
  const confirmReplacement = `const hasNote = !!(data.result_note && String(data.result_note).trim() !== '');
  if (confirm) confirm.hidden = !hasNote || _isCustomPkgCheck || ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'SGPT', 'SGOT', 'SGPT & SGOT', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);`;
  code = code.replace(confirmTarget, confirmReplacement);

  // 4. Update collect() to guarantee test_name, report_type, and package metadata
  const collectTarget = `function collect() {
  const data = {};
  $$('#reportForm [name]').forEach(x => data[x.name] = x.value);`;
  const collectReplacement = `function collect() {
  const data = {};
  $$('#reportForm [name]').forEach(x => data[x.name] = x.value);
  const typeSelect = $('#report_type');
  const testSelect = $('#test_name');
  if (typeSelect && typeSelect.value) data.report_type = typeSelect.value;
  if (testSelect && testSelect.value) data.test_name = testSelect.value;
  if (data.report_type && data.report_type !== 'single' && (!data.test_name || data.test_name === 'single')) {
    data.test_name = data.report_type;
  }
  const matchedPkg = (loadedPackages || []).find(p => p.name === data.test_name || p.name === data.report_type || p.code === data.test_name);
  if (matchedPkg) {
    data.package_id = matchedPkg.id;
    data.package_name = matchedPkg.name;
    if (!data.test_name) data.test_name = matchedPkg.name;
    if (!data.report_type || data.report_type === 'single') data.report_type = matchedPkg.name;
  }`;
  code = code.replace(collectTarget, collectReplacement);

  // 5. Update download() fallback for custom packages (around line 2068)
  const dlTarget = `  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) {
    toast('Select a test first');
    return;
  }`;
  const dlReplacement = `  // Fallback: if test_name is empty but report_type or package_name is set, use it
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name && data.package_name) {
    data.test_name = data.package_name;
  }
  if (!data.test_name) {
    toast('Select a test first');
    return;
  }`;
  code = code.replace(dlTarget, dlReplacement);

  // 6. Fix syncCustomTestsToDropdown (around line 3220) to prevent wipe & keep selection
  const syncCustomTestsTarget = `function syncCustomTestsToDropdown(tests) {
  const testSelect = $('#test_name');
  if (!testSelect) return;

  let group = testSelect.querySelector('#customTestsOptgroup');
  if (!group) {
    group = document.createElement('optgroup');
    group.id = 'customTestsOptgroup';
    group.label = 'Custom Test Reports / පාරිභෝගික වාර්තා';
    testSelect.appendChild(group);
  }
  group.innerHTML = '';
  (tests || []).filter(t => t.enabled !== false).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.testLabel ? \`\${t.testLabel} (\${t.name})\` : t.name;
    opt.setAttribute('data-custom-test', 'true');
    group.appendChild(opt);
  });

  if (cachedSecurityStatus) applySecurityStatusToUI(cachedSecurityStatus);

  // Check URL query param for test selection (e.g. from Admin console "Print / Test")
  try {
    const params = new URLSearchParams(window.location.search);
    const testParam = params.get('test');
    if (testParam && testSelect) {
      testSelect.value = testParam;
      updateTest();
      updatePreview();
    }
  } catch {}
}`;

  const syncCustomTestsReplacement = `let lastCustomTestsJson = '';
function syncCustomTestsToDropdown(tests) {
  const testSelect = $('#test_name');
  if (!testSelect) return;

  const newJson = JSON.stringify((tests || []).map(t => ({ id: t.id, name: t.name, label: t.testLabel, enabled: t.enabled })));
  if (newJson === lastCustomTestsJson) {
    if (!window.__hasCheckedUrlCustomTest) {
      window.__hasCheckedUrlCustomTest = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const testParam = params.get('test');
        if (testParam && testSelect) {
          testSelect.value = testParam;
          updateTest();
          updatePreview();
        }
      } catch {}
    }
    return;
  }
  lastCustomTestsJson = newJson;

  const curVal = testSelect.value;
  let group = testSelect.querySelector('#customTestsOptgroup');
  if (!group) {
    group = document.createElement('optgroup');
    group.id = 'customTestsOptgroup';
    group.label = 'Custom Test Reports / පාරිභෝගික වාර්තා';
    testSelect.appendChild(group);
  }
  group.innerHTML = '';
  (tests || []).filter(t => t.enabled !== false).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.testLabel ? \`\${t.testLabel} (\${t.name})\` : t.name;
    opt.setAttribute('data-custom-test', 'true');
    group.appendChild(opt);
  });

  if (curVal) testSelect.value = curVal;
  if (cachedSecurityStatus) applySecurityStatusToUI(cachedSecurityStatus);

  if (!window.__hasCheckedUrlCustomTest) {
    window.__hasCheckedUrlCustomTest = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const testParam = params.get('test');
      if (testParam && testSelect) {
        testSelect.value = testParam;
        updateTest();
        updatePreview();
      }
    } catch {}
  }
}`;
  code = code.replace(syncCustomTestsTarget, syncCustomTestsReplacement);

  // 7. Fix syncPackagesToDropdown (around line 3483) to prevent wipe & keep selection
  const syncPkgsTarget = `function syncPackagesToDropdown(packages) {
  const typeSelect = $('#report_type');
  const customOptGroup = $('#customPackagesOptGroup');
  if (!typeSelect) return;

  if (customOptGroup) {
    customOptGroup.innerHTML = '';
    const customPkgs = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs.length === 0) {
      customOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages created yet</option>';
    } else {
      customPkgs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = \`\${p.name} (\${p.tests.length} Reports)\`;
        opt.setAttribute('data-package-id', p.id);
        customOptGroup.appendChild(opt);
      });
    }
  }

  // Also sync custom packages into #test_name dropdown (#customPackagesTestOptGroup)
  const customTestOptGroup = document.getElementById('customPackagesTestOptGroup');
  if (customTestOptGroup) {
    customTestOptGroup.innerHTML = '';
    const customPkgs2 = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs2.length === 0) {
      customTestOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages yet</option>';
    } else {
      customPkgs2.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = \`\${p.name} (\${p.tests.length} Reports)\`;
        opt.setAttribute('data-package-id', p.id);
        customTestOptGroup.appendChild(opt);
      });
    }
  }

  // Handle URL param ?package=
  try {
    const params = new URLSearchParams(window.location.search);
    const pkgParam = params.get('package');
    if (pkgParam && typeSelect) {
      typeSelect.value = pkgParam;
      handleReportTypeChange(pkgParam);
    }
  } catch {}
}`;

  const syncPkgsReplacement = `let lastPackagesJson = '';
function syncPackagesToDropdown(packages) {
  const typeSelect = $('#report_type');
  const testSelect = $('#test_name');
  const customOptGroup = $('#customPackagesOptGroup');
  if (!typeSelect) return;

  const newJson = JSON.stringify((packages || []).map(p => ({ id: p.id, name: p.name, enabled: p.enabled, tests: p.tests })));
  if (newJson === lastPackagesJson) {
    if (!window.__hasCheckedUrlPackage) {
      window.__hasCheckedUrlPackage = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const pkgParam = params.get('package');
        if (pkgParam && typeSelect) {
          typeSelect.value = pkgParam;
          handleReportTypeChange(pkgParam);
        }
      } catch {}
    }
    return;
  }
  lastPackagesJson = newJson;

  const curType = typeSelect.value;
  const curTest = testSelect ? testSelect.value : '';

  if (customOptGroup) {
    customOptGroup.innerHTML = '';
    const customPkgs = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs.length === 0) {
      customOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages created yet</option>';
    } else {
      customPkgs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = \`\${p.name} (\${p.tests.length} Reports)\`;
        opt.setAttribute('data-package-id', p.id);
        customOptGroup.appendChild(opt);
      });
    }
  }

  // Also sync custom packages into #test_name dropdown (#customPackagesTestOptGroup)
  const customTestOptGroup = document.getElementById('customPackagesTestOptGroup');
  if (customTestOptGroup) {
    customTestOptGroup.innerHTML = '';
    const customPkgs2 = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs2.length === 0) {
      customTestOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages yet</option>';
    } else {
      customPkgs2.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = \`\${p.name} (\${p.tests.length} Reports)\`;
        opt.setAttribute('data-package-id', p.id);
        customTestOptGroup.appendChild(opt);
      });
    }
  }

  if (curType) typeSelect.value = curType;
  if (testSelect && curTest) testSelect.value = curTest;

  if (!window.__hasCheckedUrlPackage) {
    window.__hasCheckedUrlPackage = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const pkgParam = params.get('package');
      if (pkgParam && typeSelect) {
        typeSelect.value = pkgParam;
        handleReportTypeChange(pkgParam);
      }
    } catch {}
  }
}`;
  code = code.replace(syncPkgsTarget, syncPkgsReplacement);

  // 8. Add checkIsResultHigh and Repeated and Confirmed logic helpers
  if (!code.includes('function checkIsResultHigh(')) {
    const helperCode = `
// ==========================================
// Repeated and Confirmed Detection & Control
// ==========================================
function checkIsResultHigh(testName, resultStr, sgptStr, sgotStr) {
  const parseNum = val => {
    if (!val) return null;
    const m = String(val).match(/([0-9]+(?:\\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : null;
  };
  const t = String(testName || '').trim();
  const num = parseNum(resultStr);

  if (/^(FBS|Fasting Blood Sugar)$/i.test(t)) {
    return num !== null && num > 115;
  }
  if (/^(RBS|Random Blood Sugar)$/i.test(t)) {
    return num !== null && num > 160;
  }
  if (/^(Total Cholesterol)$/i.test(t)) {
    return num !== null && num > 200;
  }
  if (/^(Serum Creatine|Serum Creatinine|Creatinine)$/i.test(t)) {
    return num !== null && num > 1.3;
  }
  if (/^(Total Bilirubin|Total Bilirubine)$/i.test(t)) {
    return num !== null && num > 1.2;
  }
  if (/^(Gamma GT|GGT)$/i.test(t)) {
    return num !== null && num > 40;
  }
  if (/^(SGPT)$/i.test(t)) {
    const val = parseNum(resultStr || sgptStr);
    return val !== null && val > 45;
  }
  if (/^(SGOT)$/i.test(t)) {
    const val = parseNum(resultStr || sgotStr);
    return val !== null && val > 35;
  }
  if (/^(SGPT & SGOT|SGPT &amp; SGOT)$/i.test(t)) {
    const pt = parseNum(sgptStr || (resultStr && resultStr.split('|')[0]));
    const ot = parseNum(sgotStr || (resultStr && resultStr.split('|')[1]));
    return (pt !== null && pt > 45) || (ot !== null && ot > 35);
  }
  if (/^(Haemoglobin A1C|HbA1c)$/i.test(t)) {
    return num !== null && num > 6.0;
  }
  return false;
}

let isManualConfirmToggled = false;
function autoEvaluateRepeatedConfirmed() {
  const confirmCheckbox = document.getElementById('enable_repeated_confirmed');
  const noteHidden = document.getElementById('result_note');
  const tName = $('#test_name')?.value || '';
  const rVal = $('#test_result')?.value || '';
  const ptVal = $('#sgpt_result')?.value || '';
  const otVal = $('#sgot_result')?.value || '';
  const isHigh = checkIsResultHigh(tName, rVal, ptVal, otVal);

  if (confirmCheckbox && !isManualConfirmToggled) {
    confirmCheckbox.checked = isHigh;
  }
  if (noteHidden) {
    noteHidden.value = (confirmCheckbox && confirmCheckbox.checked) ? '[Repeated and Confirmed]' : '';
  }
}
`;
    code = helperCode + code;
  }

  // 9. Attach Repeated & Confirmed checkbox event listener and wire into input changes
  const inputAttachTarget = `$('#test_name').onchange = updateTest;
$('#test_result').oninput = () => debouncedUpdatePreview();
$('#sgpt_result')?.addEventListener('input', () => debouncedUpdatePreview());
$('#sgot_result')?.addEventListener('input', () => debouncedUpdatePreview());`;

  const inputAttachReplacement = `$('#test_name').onchange = () => {
  isManualConfirmToggled = false;
  updateTest();
};
$('#test_result').oninput = () => {
  autoEvaluateRepeatedConfirmed();
  debouncedUpdatePreview();
};
$('#sgpt_result')?.addEventListener('input', () => {
  autoEvaluateRepeatedConfirmed();
  debouncedUpdatePreview();
});
$('#sgot_result')?.addEventListener('input', () => {
  autoEvaluateRepeatedConfirmed();
  debouncedUpdatePreview();
});
$('#enable_repeated_confirmed')?.addEventListener('change', e => {
  isManualConfirmToggled = true;
  const noteHidden = document.getElementById('result_note');
  if (noteHidden) noteHidden.value = e.target.checked ? '[Repeated and Confirmed]' : '';
  debouncedUpdatePreview();
});`;

  code = code.replace(inputAttachTarget, inputAttachReplacement);

  // 10. Update updateTest() to evaluate Repeated and Confirmed on test change
  const updateTestCallTarget = `$('#lipidResults').hidden = name !== 'Lipid Profile';`;
  const updateTestCallReplacement = `$('#lipidResults').hidden = name !== 'Lipid Profile';
  const repeatedWrap = $('#repeatedConfirmedWrap');
  if (repeatedWrap) {
    repeatedWrap.hidden = ['Urine Full Report', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)', 'Type 7', 'Type 11', 'Shipping'].includes(name);
  }
  autoEvaluateRepeatedConfirmed();`;

  code = code.replace(updateTestCallTarget, updateTestCallReplacement);

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

updateAppFile('frontend/app.js');
updateAppFile('public/app.js');
console.log('Finished updating app files');
