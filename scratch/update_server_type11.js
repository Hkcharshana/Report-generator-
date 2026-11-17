const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. In DEFAULT_SECURITY_CONFIG.testPermissions
if (!code.includes("'Fasting Blood Sugar': { enabled: true")) {
  code = code.replace(
    "'FBS': { enabled: true, category: 'Routine Chemistry' },",
    `'FBS': { enabled: true, category: 'Routine Chemistry' },\n      'Fasting Blood Sugar': { enabled: true, category: 'Routine Chemistry' },\n      'Fasting': { enabled: true, category: 'Routine Chemistry' },\n      'Gamma GT': { enabled: true, category: 'Liver Function' },\n      'Type 11': { enabled: true, category: 'Medical Packages' },`
  );
  console.log('✓ Added Fasting Blood Sugar, Fasting, Gamma GT, Type 11 to DEFAULT_SECURITY_CONFIG');
}

// 2. In requestedTests
if (!code.includes("'Fasting Blood Sugar': { key: 'fbs'")) {
  code = code.replace(
    "'FBS': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dL' },",
    `'FBS': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dL' },\n  'Fasting Blood Sugar': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dl' },\n  'Fasting': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dl' },`
  );
  console.log('✓ Added Fasting Blood Sugar to requestedTests');
}

// 3. In testUnits
if (!code.includes("'Fasting Blood Sugar':'mg/dl'")) {
  code = code.replace(
    "FBS:'mg/dL',",
    "FBS:'mg/dL', 'Fasting Blood Sugar':'mg/dl', 'Fasting':'mg/dl',"
  );
  console.log('✓ Added Fasting Blood Sugar to testUnits');
}

// 4. In buildTestData: ensure isType11: true and clean pkg lookup
if (!code.includes('isType11: true,')) {
  code = code.replace(
    "isCustomPackage: true,\n        packageDef: pkg,",
    "isType11: true,\n        isCustomPackage: true,\n        packageDef: pkg,"
  );
  console.log('✓ Added isType11: true in buildTestData');
}

// 5. In Excel export (test.isCustomPackage): ensure clean sheet names
if (!code.includes("if (tName === 'Fasting Blood Sugar' || tName === 'FBS') baseSheetName = 'FBS';")) {
  code = code.replace(
    "let baseSheetName = String(tName).replace(/[*?:/\\[\\]\\\\]/g, '').substring(0, 28) || `Test ${i+1}`;",
    `let baseSheetName = String(tName).replace(/[*?:/\\[\\]\\\\]/g, '').substring(0, 28) || \`Test \${i+1}\`;\n          if (tName === 'Fasting Blood Sugar' || tName === 'FBS') baseSheetName = 'FBS';\n          if (tName === 'Urine Full Report' || tName === 'UFR') baseSheetName = 'UFR';`
  );
  console.log('✓ Added clean sheet name mapping for Type 11 in Excel export');
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('✓ server.js updated successfully');
