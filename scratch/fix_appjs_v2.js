/**
 * fix_appjs_v2.js
 * Comprehensive fix for public/app.js:
 * 1. Fix isAnyPkg undefined bug in updatePreview()
 * 2. Add Type 11 preview container toggling in updatePreview()
 * 3. Fix handleReportTypeChange() to NOT wipe dropdown innerHTML
 * 4. Fix syncPackagesToDropdown() to populate #customPackagesTestOptGroup in #test_name
 * 5. Fix download() guard to fallback to report_type
 * 6. Add #test_name change listener to sync #report_type
 * Then copy public/app.js -> frontend/app.js
 */

const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
const frontendJsPath = path.join(__dirname, '..', 'frontend', 'app.js');

let src = fs.readFileSync(appJsPath, 'utf8');
const original = src;

let fixes = 0;

function replace(label, search, replacement) {
  if (!src.includes(search)) {
    console.error(`❌ FAILED [${label}]: Search string not found!`);
    console.error('  Looking for:', search.substring(0, 80));
    return false;
  }
  src = src.replace(search, replacement);
  console.log(`✅ Fixed [${label}]`);
  fixes++;
  return true;
}

// ============================================================
// FIX 1: Add isType11 to updatePreview() and fix isAnyPkg
// In updatePreview(), after:
//   const isType7 = data.test_name === 'Type 7';
//   if (type10bWrap) type10bWrap.hidden = !isType10B;
//   const type7Wrap = $('#type7PreviewContainer');
//   if (type7Wrap) type7Wrap.hidden = !isType7;
//   const customPkgWrap = $('#customPackagePreviewContainer');
//   if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;
// ============================================================
replace(
  'updatePreview - add isType11 + fix isAnyPkg',
  `  const isType10B = data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug';
  const isType7 = data.test_name === 'Type 7';
  if (type10bWrap) type10bWrap.hidden = !isType10B;
  const type7Wrap = $('#type7PreviewContainer');
  if (type7Wrap) type7Wrap.hidden = !isType7;
  const customPkgWrap = $('#customPackagePreviewContainer');
  if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;`,
  `  const isType10B = data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug';
  const isType7 = data.test_name === 'Type 7';
  const isType11Preview = data.test_name === 'Type 11' || data.test_name === 'Colombo Consultancy Package';
  const isAnyPkg = isType10B || isType7 || isType11Preview || isCustomPkg;
  if (type10bWrap) type10bWrap.hidden = !isType10B;
  const type7Wrap = $('#type7PreviewContainer');
  if (type7Wrap) type7Wrap.hidden = !isType7;
  const type11Wrap = $('#type11PreviewContainer');
  if (type11Wrap) type11Wrap.hidden = !isType11Preview;
  const customPkgWrap = $('#customPackagePreviewContainer');
  if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;`
);

// ============================================================
// FIX 2: Type 11 preview cards - update live values in updatePreview()
// Add after the custom package preview section (after isCustomPkg block)
// Find the line: "  // ── Custom Package Preview Cards ──"
// Add a Type 11 preview block before or after it
// ============================================================
replace(
  'updatePreview - Type 11 live preview cards',
  `  // ── Custom Package Preview Cards ──────────────────────────────────────────
  if (isCustomPkg && matchedCustomPkg) {`,
  `  // ── Type 11 / Colombo Consultancy Preview Cards ───────────────────────────
  if (isType11Preview) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    // Update preview card values from colombo_* fields
    const fbs = data.colombo_fbs || '';
    const sgpt = data.colombo_sgpt || '';
    const sgot = data.colombo_sgot || '';
    const ggt = data.colombo_gamma_gt || '';
    const chol = data.colombo_cholesterol || '';
    const hdl = data.colombo_hdl || '';
    const ldl = data.colombo_ldl || '';
    const vldl = data.colombo_vldl || '';
    const trig = data.colombo_triglyceride || '';
    const choHdl = data.colombo_cho_hdl || '';
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setT('type11PrevFbs', fbs ? fbs + ' mg/dL' : '');
    setT('type11PrevSgpt', sgpt ? 'SGPT: ' + sgpt + ' iu/l' : '');
    setT('type11PrevSgot', sgot ? 'SGOT: ' + sgot + ' iu/l' : '');
    setT('type11PrevGgt', ggt ? ggt + ' U/L' : '');
    setT('type11PrevChol', chol ? chol + ' mg/dL' : '');
    setT('type11PrevHdl', hdl ? hdl + ' mg/dL' : '');
    setT('type11PrevLdl', ldl ? ldl + ' mg/dL' : '');
    setT('type11PrevTrig', trig ? trig + ' mg/dL' : '');
  }

  // ── Custom Package Preview Cards ──────────────────────────────────────────
  if (isCustomPkg && matchedCustomPkg) {`
);

// ============================================================
// FIX 3: Fix handleReportTypeChange() - don't wipe innerHTML
// Replace the entire function with one that just sets testSelect.value
// ============================================================
// Find the function boundaries
const handleFnStart = `function handleReportTypeChange(selectedType) {`;
const handleFnEnd = `$('#report_type')?.addEventListener('change', e => handleReportTypeChange(e.target.value));`;

// We'll replace from function start to just before the event listener
const oldHandleFn = src.indexOf(handleFnStart);
const oldHandleEnd = src.indexOf(handleFnEnd);

if (oldHandleFn === -1 || oldHandleEnd === -1) {
  console.error('❌ FAILED [handleReportTypeChange]: Cannot find function boundaries!');
} else {
  const beforeFn = src.substring(0, oldHandleFn);
  const afterFn = src.substring(oldHandleEnd);

  const newHandleFn = `function handleReportTypeChange(selectedType) {
  const testSelect = $('#test_name');
  if (!testSelect) return;

  // For 'single', just clear the selection (dropdown already has all options in HTML)
  if (selectedType === 'single') {
    // Don't wipe innerHTML - just clear selection
    testSelect.value = '';
    updateTest();
    updatePreview();
    return;
  }

  // For built-in and custom packages: just set the value directly on the existing dropdown
  // The HTML dropdown already has all packages in the "Multi-Sheet Medical Packages" optgroup
  testSelect.value = selectedType;

  // If value didn't set (option not found), try matching by text
  if (testSelect.value !== selectedType) {
    Array.from(testSelect.options).forEach(opt => {
      if (opt.value === selectedType || opt.textContent.trim().startsWith(selectedType)) {
        opt.selected = true;
      }
    });
  }

  updateTest();
  updatePreview();
}

`;

  src = beforeFn + newHandleFn + afterFn;
  console.log('✅ Fixed [handleReportTypeChange - no longer wipes innerHTML]');
  fixes++;
}

// ============================================================
// FIX 4: syncPackagesToDropdown - also populate #customPackagesTestOptGroup
// ============================================================
replace(
  'syncPackagesToDropdown - add customPackagesTestOptGroup',
  `  // Handle URL param ?package=
  try {`,
  `  // Also sync custom packages into #test_name dropdown
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
  try {`
);

// ============================================================
// FIX 5: download() - fallback test_name from report_type
// ============================================================
replace(
  'download - fallback test_name from report_type',
  `  if (!data.test_name) {
    toast('Select a test first');
    return;
  }`,
  `  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) {
    toast('Select a test first');
    return;
  }`
);

// ============================================================
// FIX 6: printPlainBtn - same fallback
// ============================================================
replace(
  'printPlainBtn - fallback test_name from report_type',
  `  if (!data.test_name) { toast('Select a test first'); return; }
  // Auto-fill test_result if empty
  if (!data.test_result) {
    data.test_result = defaults[data.test_name] ? data.test_name : 'Negative';
  }`,
  `  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) { toast('Select a test first'); return; }
  // Auto-fill test_result if empty
  if (!data.test_result) {
    data.test_result = defaults[data.test_name] ? data.test_name : 'Negative';
  }`
);

// ============================================================
// FIX 7: Add bidirectional sync - when #test_name changes, update #report_type
// Add after the '#report_type' event listener line
// ============================================================
replace(
  'Add #test_name -> #report_type bidirectional sync',
  `$('#report_type')?.addEventListener('change', e => handleReportTypeChange(e.target.value));`,
  `$('#report_type')?.addEventListener('change', e => handleReportTypeChange(e.target.value));

// Bidirectional sync: when test_name changes, update report_type to match
$('#test_name')?.addEventListener('change', e => {
  const val = e.target.value;
  const typeSelect = $('#report_type');
  if (!typeSelect) return;
  const builtinPackages = ['Type 10 B', 'Type 10 B with urine drug', 'Type 11', 'Type 7'];
  if (builtinPackages.includes(val)) {
    typeSelect.value = val;
  } else {
    const isCustomPkg = loadedPackages.some(p => !p.isBuiltin && p.name === val && p.enabled !== false);
    if (isCustomPkg) {
      typeSelect.value = val;
    } else {
      typeSelect.value = 'single';
    }
  }
  updateTest();
  updatePreview();
});`
);

// ============================================================
// FIX 8: Type 11 isColomboPkg - also hide urine drug results when Type 11
// In updateTest(), show urineDrugResults only for Urine Drug Screening
// (Already correct - check if urineDrugResults is hidden for Type 11)
// Add Type 11 to test_result hidden list if not there
// ============================================================
// Check if 'Type 11' is in the hidden list for test_result field
if (!src.includes("'Type 11'].includes(name) || isCustomAdminTest")) {
  // Need to add it
  replace(
    'updateTest - hide test_result for Type 11',
    `['SGPT & SGOT', 'Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Type 7'].includes(name) || isCustomAdminTest`,
    `['SGPT & SGOT', 'Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Type 7', 'Type 11'].includes(name) || isCustomAdminTest`
  );
} else {
  console.log('ℹ️  Type 11 already in test_result hidden list');
}

// ============================================================
// VERIFY: Check src is valid (look for obvious issues)
// ============================================================
if (src === original) {
  console.error('\n❌ No changes were made! Check all search strings above.');
  process.exit(1);
}

// Write files
fs.writeFileSync(appJsPath, src, 'utf8');
console.log(`\n✅ Written: ${appJsPath}`);

fs.writeFileSync(frontendJsPath, src, 'utf8');
console.log(`✅ Written: ${frontendJsPath}`);

console.log(`\n🎉 Done! Applied ${fixes} fixes to app.js`);
console.log('   Run: node -c public/app.js  to verify syntax');
