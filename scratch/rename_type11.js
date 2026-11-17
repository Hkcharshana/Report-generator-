const fs = require('fs');
const path = require('path');

const files = {
  serverJs: path.join(__dirname, '..', 'backend', 'server.js'),
  appJsPub: path.join(__dirname, '..', 'public', 'app.js'),
  appJsFront: path.join(__dirname, '..', 'frontend', 'app.js'),
  indexHtmlPub: path.join(__dirname, '..', 'public', 'index.html'),
  indexHtmlFront: path.join(__dirname, '..', 'frontend', 'index.html'),
  secConfig: path.join(__dirname, '..', 'backend', 'security_config.json'),
};

// --- 1. Rename in backend/server.js ---
let serverCode = fs.readFileSync(files.serverJs, 'utf8');

// Package definition
serverCode = serverCode
  .replace("id: 'pkg_colombo_consultancy',", "id: 'pkg_type11',")
  .replace("name: 'Colombo Consultancy Package',\n    code: 'Colombo Consultancy',\n    category: 'Medical Packages',\n    description: 'Colombo Consultancy Package (5 Reports", "name: 'Type 11',\n    code: 'Type 11',\n    category: 'Medical Packages',\n    description: 'Type 11 Medical Package (5 Reports")
  .replace(/medical_type: 'Colombo Consultancy Package'/g, "medical_type: 'Type 11'")
  .replace(/medical_type_name: 'Colombo Consultancy Package'/g, "medical_type_name: 'Type 11'")
  .replace(/package_name: 'Colombo Consultancy Package'/g, "package_name: 'Type 11'")
  // buildTestData branch
  .replace(
    "if (name === 'Colombo Consultancy Package' || name === 'Colombo Consultancy' || data.package_name === 'Colombo Consultancy Package')",
    "if (name === 'Type 11' || name === 'Colombo Consultancy Package' || name === 'Colombo Consultancy' || data.package_name === 'Type 11' || data.package_name === 'Colombo Consultancy Package')"
  )
  // inner name/code in buildTestData
  .replace(
    "name: 'Colombo Consultancy Package',\n        code: 'Colombo Consultancy',\n        isCustomPackage: true,",
    "name: 'Type 11',\n        code: 'Type 11',\n        isCustomPackage: true,"
  )
  .replace(
    "name: 'Colombo Consultancy Package',\n        code: 'Colombo Consultancy',\n        tests: ['Fasting Blood Sugar'",
    "name: 'Type 11',\n        code: 'Type 11',\n        tests: ['Fasting Blood Sugar'"
  )
  // requestedTests
  .replace("'Colombo Consultancy Package': { key: 'colombo_pkg', reference: '5 Reports' }", "'Type 11': { key: 'type11_pkg', reference: '5 Reports' }")
  // testUnits
  .replace("'Colombo Consultancy Package':''", "'Type 11':''")
  // result string
  .replace("result: 'Colombo Consultancy Package',\n        reference: '5 Reports (Fasting Blood Sugar", "result: 'Type 11',\n        reference: '5 Reports (Fasting Blood Sugar");

fs.writeFileSync(files.serverJs, serverCode, 'utf8');
console.log('✓ server.js updated');

// --- 2. Update security_config.json ---
const sec = JSON.parse(fs.readFileSync(files.secConfig, 'utf8'));
if (sec.testPermissions['Colombo Consultancy Package']) {
  sec.testPermissions['Type 11'] = sec.testPermissions['Colombo Consultancy Package'];
  delete sec.testPermissions['Colombo Consultancy Package'];
}
fs.writeFileSync(files.secConfig, JSON.stringify(sec, null, 2), 'utf8');
console.log('✓ security_config.json updated');

// --- 3. Rename in app.js (both copies) ---
[files.appJsPub, files.appJsFront].forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');

  code = code
    .replace(/'Colombo Consultancy Package': \['colombo_pkg', 'Medical Package \(5 Reports\)'\]/g, "'Type 11': ['type11_pkg', 'Medical Package (5 Reports)']")
    .replace(/'Colombo Consultancy Package': ''/g, "'Type 11': ''")
    .replace(/data\.test_name === 'Colombo Consultancy Package'/g, "data.test_name === 'Type 11'")
    .replace(/data\.test_result = 'Colombo Consultancy Package'/g, "data.test_result = 'Type 11'")
    .replace(/record\.package_name === 'Colombo Consultancy Package'/g, "record.package_name === 'Type 11' || record.package_name === 'Colombo Consultancy Package'")
    .replace(/picked = 'Colombo Consultancy Package'/g, "picked = 'Type 11'")
    .replace(/rType\.value = 'Colombo Consultancy Package'/g, "rType.value = 'Type 11'")
    .replace(/const isColomboPkg = name === 'Colombo Consultancy Package'/g, "const isColomboPkg = name === 'Type 11' || name === 'Colombo Consultancy Package'")
    .replace(/toast\('Colombo Consultancy Package reset to defaults'\)/g, "toast('Type 11 Package reset to defaults')")
    .replace(/selectedType === 'Colombo Consultancy Package'/g, "selectedType === 'Type 11'")
    .replace(/<option value="Colombo Consultancy Package" selected>Colombo Consultancy Package - All 5 Reports/g, '<option value="Type 11" selected>Type 11 - All 5 Reports')
    .replace(/testSelect\.value = 'Colombo Consultancy Package'/g, "testSelect.value = 'Type 11'");

  fs.writeFileSync(f, code, 'utf8');
  console.log(`✓ ${path.basename(path.dirname(f))}/${path.basename(f)} updated`);
});

// --- 4. Rename in index.html (both copies) + add to test_name dropdown ---
[files.indexHtmlPub, files.indexHtmlFront].forEach(f => {
  if (!fs.existsSync(f)) return;
  let html = fs.readFileSync(f, 'utf8');

  // Rename report_type option
  html = html.replace(
    'value="Colombo Consultancy Package">Colombo Consultancy Package (5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>',
    'value="Type 11">Type 11 Medical Package (5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>'
  );

  // Add Type 11 to Standard Packages optgroup in report_type dropdown
  if (!html.includes('value="Type 11"')) {
    html = html.replace(
      '<option value="Type 7">Type 7 (Russia Package - 4 Reports)</option>',
      '<option value="Type 7">Type 7 (Russia Package - 4 Reports)</option>\n                    <option value="Type 11">Type 11 Medical Package (5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>'
    );
  }

  // Add Type 11 to test_name dropdown (after Type 7)
  if (!html.includes('<option>Type 11</option>')) {
    html = html.replace(
      '<option>Type 7</option>',
      '<option>Type 7</option>\n                  <option>Type 11</option>'
    );
  }

  // Rename the input card heading
  html = html.replace(
    'Colombo Consultancy Medical Package</h4>',
    'Type 11 Medical Package</h4>'
  );
  html = html.replace(
    '5 Reports: Fasting Blood Sugar, SGPT &amp; SGOT, Urine Full Report, Gamma GT, and Lipid Profile.</p>',
    'Type 11 — 5 Reports: Fasting Blood Sugar, SGPT &amp; SGOT, Urine Full Report, Gamma GT, and Lipid Profile.</p>'
  );

  fs.writeFileSync(f, html, 'utf8');
  console.log(`✓ ${path.basename(path.dirname(f))}/${path.basename(f)} updated`);
});

console.log('\n✅ All files renamed. Run node -c to verify syntax.');
