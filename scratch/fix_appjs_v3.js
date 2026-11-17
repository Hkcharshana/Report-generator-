/**
 * fix_appjs_v3.js  
 * Uses CRLF-aware replacements for all app.js edits.
 */
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
const frontendJsPath = path.join(__dirname, '..', 'frontend', 'app.js');

// Read raw bytes and decode
const rawBytes = fs.readFileSync(appJsPath);
let src = rawBytes.toString('utf8');

// Detect line ending
const hasCRLF = src.includes('\r\n');
const NL = hasCRLF ? '\r\n' : '\n';
console.log(`Line ending: ${hasCRLF ? 'CRLF' : 'LF'}`);

let fixes = 0;

function replace(label, search, replacement) {
  // Normalize search to actual file line endings
  const normalizedSearch = search.replace(/\r\n/g, '\n').replace(/\n/g, NL);
  if (!src.includes(normalizedSearch)) {
    // Try the original search too
    if (!src.includes(search)) {
      console.error(`❌ FAILED [${label}]: Search string not found!`);
      // Show first 100 chars of what we're searching
      console.error('  Searching for: ' + normalizedSearch.substring(0, 100).replace(/\r/g,'\\r').replace(/\n/g,'\\n'));
      return false;
    }
    src = src.replace(search, replacement.replace(/\n/g, NL));
  } else {
    const normalizedReplacement = replacement.replace(/\r\n/g, '\n').replace(/\n/g, NL);
    src = src.replace(normalizedSearch, normalizedReplacement);
  }
  console.log(`✅ Fixed [${label}]`);
  fixes++;
  return true;
}

// ============================================================
// FIX 1: Add isType11 + isAnyPkg to updatePreview()
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
// FIX 2: Type 11 preview cards live values in updatePreview()
// Find the Custom Package Preview Cards section
// ============================================================
replace(
  'updatePreview - Type 11 live preview block',
  `  // ── Custom Package Preview Cards ──────────────────────────────────────────
  if (isCustomPkg && matchedCustomPkg) {`,
  `  // ── Type 11 / Colombo Consultancy Preview Cards ───────────────────────────
  if (isType11Preview) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '\u2014'; };
    setT('type11PrevFbs', data.colombo_fbs ? data.colombo_fbs + ' mg/dL' : '');
    setT('type11PrevSgpt', data.colombo_sgpt ? 'SGPT: ' + data.colombo_sgpt + ' iu/l' : '');
    setT('type11PrevSgot', data.colombo_sgot ? 'SGOT: ' + data.colombo_sgot + ' iu/l' : '');
    setT('type11PrevGgt', data.colombo_gamma_gt ? data.colombo_gamma_gt + ' U/L' : '');
    setT('type11PrevChol', data.colombo_cholesterol ? data.colombo_cholesterol + ' mg/dL' : '');
    setT('type11PrevHdl', data.colombo_hdl ? data.colombo_hdl + ' mg/dL' : '');
    setT('type11PrevLdl', data.colombo_ldl ? data.colombo_ldl + ' mg/dL' : '');
    setT('type11PrevTrig', data.colombo_triglyceride ? data.colombo_triglyceride + ' mg/dL' : '');
  }

  // ── Custom Package Preview Cards ──────────────────────────────────────────
  if (isCustomPkg && matchedCustomPkg) {`
);

// ============================================================
// FIX 3: syncPackagesToDropdown - populate #customPackagesTestOptGroup
// ============================================================
replace(
  'syncPackagesToDropdown - add customPackagesTestOptGroup',
  `  // Handle URL param ?package=
  try {
    const params = new URLSearchParams(window.location.search);
    const pkgParam = params.get('package');
    if (pkgParam && typeSelect) {
      typeSelect.value = pkgParam;
      handleReportTypeChange(pkgParam);
    }
  } catch {}
}`,
  `  // Also sync custom packages into #test_name dropdown (#customPackagesTestOptGroup)
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
}`
);

// ============================================================
// FIX 4: download() - fallback test_name from report_type
// ============================================================
replace(
  'download() - fallback test_name',
  `  if (!data.test_name) {
    toast('Select a test first');
    return;
  }
  // Auto-fill test_result if empty (use default for the selected test)`,
  `  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) {
    toast('Select a test first');
    return;
  }
  // Auto-fill test_result if empty (use default for the selected test)`
);

// ============================================================
// FIX 5: printPlainBtn - same fallback
// ============================================================
replace(
  'printPlainBtn - fallback test_name',
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
// Summary
// ============================================================
console.log(`\nTotal fixes applied: ${fixes}`);

if (fixes < 3) {
  console.error('\n⚠️  WARNING: Fewer fixes than expected. Check above for failures.');
}

// Write files
fs.writeFileSync(appJsPath, src, 'utf8');
console.log(`\n✅ Written: ${appJsPath}`);
fs.writeFileSync(frontendJsPath, src, 'utf8');
console.log(`✅ Written: ${frontendJsPath}`);
console.log('\nRun: node -c public/app.js  to verify syntax');
