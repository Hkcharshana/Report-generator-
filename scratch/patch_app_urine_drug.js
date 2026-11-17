const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// 1. defaults
content = content.replace(
  `'Urine Drug Screening': ['urine_drug', '12 Drugs (All Negative)'],`,
  `'Urine Drug Screening': ['urine_drug', '12 Drugs (All Negative)'],\n  'Urine Drug Screening (12 Drugs)': ['urine_drug_12', '12 Drugs (All Negative)'],\n  'Urine Drug Screening (5 Drugs)': ['urine_drug_5', '5 Drugs (All Negative)'],`
);

// 2. units
content = content.replace(
  `'Urine Drug Screening': '',`,
  `'Urine Drug Screening': '',\n  'Urine Drug Screening (12 Drugs)': '',\n  'Urine Drug Screening (5 Drugs)': '',`
);

// 3. Form extraction
content = content.replace(
  `if (data.test_name === 'Urine Drug Screening' || data.test_name === 'Type 10 B with urine drug') {`,
  `if (data.test_name === 'Urine Drug Screening' || data.test_name.startsWith('Urine Drug Screening') || data.test_name === 'Type 10 B with urine drug') {`
);

// 4. updateTest isUrineDrugOnly
content = content.replace(
  `const isUrineDrugOnly = name === 'Urine Drug Screening';`,
  `const isUrineDrugOnly = name === 'Urine Drug Screening' || name === 'Urine Drug Screening (12 Drugs)' || name === 'Urine Drug Screening (5 Drugs)' || name.startsWith('Urine Drug');`
);

// 5. hidden test_result list
content = content.replace(
  `'Type 10 B with urine drug', 'Urine Drug Screening', 'Type 7'`,
  `'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)', 'Type 7'`
);

// 6. showDrugInputs logic
content = content.replace(
  `  const showDrugInputs = isUrineDrugOnly || (isType10B && hasUrineDrug);\n  if (showDrugInputs) {\n    const spec = $('#specimen');\n    if (spec) spec.value = 'Urine';\n    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = false;\n    syncDrugGrid();\n  } else {\n    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = true;\n  }`,
  `  if (name === 'Urine Drug Screening (12 Drugs)') {\n    if ($('#drugPanelTypeSelect')) $('#drugPanelTypeSelect').value = '12';\n  } else if (name === 'Urine Drug Screening (5 Drugs)') {\n    if ($('#drugPanelTypeSelect')) $('#drugPanelTypeSelect').value = '5';\n  }\n  const pkgHasUrineDrug = isCustomPkgTest && loadedPackages.find(p => (p.name === name || p.code === name))?.tests?.some(t => t.includes('Urine Drug'));\n  if (pkgHasUrineDrug) {\n    const pkgTests = loadedPackages.find(p => (p.name === name || p.code === name))?.tests || [];\n    if (pkgTests.some(t => t.includes('5'))) {\n      if ($('#drugPanelTypeSelect')) $('#drugPanelTypeSelect').value = '5';\n    } else {\n      if ($('#drugPanelTypeSelect')) $('#drugPanelTypeSelect').value = '12';\n    }\n  }\n  const showDrugInputs = isUrineDrugOnly || (isType10B && hasUrineDrug) || pkgHasUrineDrug;\n  if (showDrugInputs) {\n    const spec = $('#specimen');\n    if (spec) spec.value = 'Urine';\n    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = false;\n    syncDrugGrid();\n  } else {\n    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = true;\n  }`
);

// 7. confirm.hidden & methodLine.hidden
content = content.replace(
  `if (confirm) confirm.hidden = _isCustomPkgCheck || ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'SGPT', 'SGOT', 'SGPT & SGOT', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening'].includes(data.test_name);`,
  `if (confirm) confirm.hidden = _isCustomPkgCheck || ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'SGPT', 'SGOT', 'SGPT & SGOT', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);`
);
content = content.replace(
  `if (methodLine) methodLine.hidden = _isCustomPkgCheck || ['Haemoglobin A1C', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening'].includes(data.test_name);`,
  `if (methodLine) methodLine.hidden = _isCustomPkgCheck || ['Urine Full Report', 'Haemoglobin A1C', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);`
);

// 8. stdTestTitle for urine drug
content = content.replace(
  `      if (data.test_name === 'Urine Drug Screening') {\n        stdTestTitle.textContent = 'URINE DRUG SCREENING TEST';\n      }`,
  `      if (data.test_name === 'Urine Drug Screening' || data.test_name.startsWith('Urine Drug Screening')) {\n        const is5 = data.test_name.includes('5') || $('#drugPanelTypeSelect')?.value === '5';\n        stdTestTitle.textContent = is5 ? 'URINE DRUG SCREENING TEST (5 DRUGS)' : 'URINE DRUG SCREENING TEST (12 DRUGS)';\n      }`
);

// 9. cardIconMap
content = content.replace(
  `'Urine Drug Screening': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },`,
  `'Urine Drug Screening': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },\n        'Urine Drug Screening (12 Drugs)': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },\n        'Urine Drug Screening (5 Drugs)': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },`
);

// 10. custom package preview card details
content = content.replace(
  `} else if (testName === 'Urine Drug Screening') {\n          detailsHtml = \`\n            <div style="display:flex;justify-content:space-between;"><b>Panel:</b><span>12 Drugs</span></div>\n            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">All Negative</b></div>\`;`,
  `} else if (testName === 'Urine Drug Screening' || testName.startsWith('Urine Drug Screening')) {\n          const is5 = testName.includes('5') || $('#drugPanelTypeSelect')?.value === '5';\n          const panelLabel = is5 ? '5 Drugs' : '12 Drugs';\n          detailsHtml = \`\n            <div style="display:flex;justify-content:space-between;"><b>Panel:</b><span>\${panelLabel}</span></div>\n            <div style="display:flex;justify-content:space-between;"><b>Result:</b><span style="color:#059669;font-weight:normal;">All Negative</span></div>\`;`
);

// 11. previewBody for Urine Drug
content = content.replace(
  `} else if (data.test_name === 'Urine Drug Screening') {\n    if (refHead) refHead.hidden = true;\n    const is12 = $('#drugPanelTypeSelect')?.value === '12';`,
  `} else if (data.test_name === 'Urine Drug Screening' || data.test_name.startsWith('Urine Drug Screening')) {\n    if (refHead) refHead.hidden = true;\n    const is12 = data.test_name.includes('12') ? true : (data.test_name.includes('5') ? false : (($('#drugPanelTypeSelect')?.value || '12') === '12'));`
);

// 12. Negative not bold in preview
content = content.replace(
  `: \`<span style="color:#059669;font-weight:700;">Negative</span>\`;`,
  `: \`<span style="color:#059669;font-weight:normal;">Negative</span>\`;`
);

// 13. standardSingleTestsHtml
content = content.replace(
  `<option>Urine Drug Screening</option>`,
  `<option>Urine Drug Screening (12 Drugs)</option>\n  <option>Urine Drug Screening (5 Drugs)</option>`
);

fs.writeFileSync(appPath, content, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'app.js'), content, 'utf8');
console.log('Successfully patched frontend/app.js and public/app.js');
