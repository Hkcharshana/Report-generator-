const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// 1. Add Shipping to BUILTIN_PACKAGES
const shippingPkgDef = `  {
    id: 'pkg_shipping',
    name: 'Shipping',
    code: 'Shipping',
    category: 'Medical Packages',
    description: 'Shipping Medical Package - Type 12 - 1 (14 Reports: Blood Alcohol, CRP, ESR, FBS, S.Creatinine & eGFR, Syphilis & VDRL, Total Cholesterol, SGPT & SGOT, Urine Full Report, Urine Drug Screening, HbA1c, Hepatitis C, Hepatitis B, HIV)',
    tests: [
      'Blood Alcohol Test',
      'C-reactive protein',
      'ESR',
      'Fasting Blood Sugar',
      'S.Creatinine & eGFR',
      'Syphilis & VDRL',
      'Total Cholesterol',
      'Blood for SGPT & SGOT',
      'Urine Full Report',
      'Urine Drug Screening',
      'Haemoglobin A1C',
      'Hepatitis C [HCV]',
      'Hepatitis B [HBsAg]',
      'HIV Test'
    ],
    isBuiltin: true,
    enabled: true
  },`;

if (!code.includes('pkg_shipping')) {
  code = code.replace("const BUILTIN_PACKAGES = [", `const BUILTIN_PACKAGES = [\n${shippingPkgDef}`);
}

// 2. Add requestedTests and testUnits
if (!code.includes("'Shipping': { key: 'shipping_pkg'")) {
  const reqTestsTarget = "'Type 11': { key: 'type11_pkg', reference: '5 Reports' }";
  const reqTestsRepl = `'Type 11': { key: 'type11_pkg', reference: '5 Reports' },
  'Shipping': { key: 'shipping_pkg', reference: '14 Reports' },
  'Type 12 - 1': { key: 'shipping_pkg', reference: '14 Reports' },
  'Type 12 - 1 (Shipping)': { key: 'shipping_pkg', reference: '14 Reports' },
  'Blood Alcohol Test': { key: 'blood_alcohol', reference: 'Not Detected' },
  'C-reactive protein': { key: 'crp', reference: '< 06 mg/dL' },
  'ESR': { key: 'esr', reference: '03 mm/1hr' },
  'S.Creatinine & eGFR': { key: 'creatinine_egfr', reference: '0.6 - 1.3 mg/dL' },
  'Syphilis & VDRL': { key: 'syphilis_vdrl', reference: 'Negative / Non Reactive' },
  'Hepatitis C [HCV]': { key: 'hcv', reference: 'Negative' },
  'Hepatitis B [HBsAg]': { key: 'hbsag', reference: 'Negative' },
  'HIV Test': { key: 'hiv_test', reference: 'Negative' }`;
  code = code.replace(reqTestsTarget, reqTestsRepl);

  const unitTarget = "'Type 11':''";
  const unitRepl = "'Type 11':'', 'Shipping':'', 'Type 12 - 1':'', 'Type 12 - 1 (Shipping)':'', 'Blood Alcohol Test':'', 'C-reactive protein':'mg/dL', 'ESR':'mm/1hr', 'S.Creatinine & eGFR':'mg/dL', 'Syphilis & VDRL':'', 'Hepatitis C [HCV]':'', 'Hepatitis B [HBsAg]':'', 'HIV Test':''";
  code = code.replace(unitTarget, unitRepl);
}

// 3. In selectedTest(data), handle Shipping
if (!code.includes("matchedPkg.name === 'Shipping'")) {
  const matchTarget = "if (matchedPkg.name === 'Type 11' || matchedPkg.id === 'pkg_type11' || matchedPkg.id === 'pkg_colombo_consultancy') {";
  const matchRepl = `if (matchedPkg.name === 'Shipping' || matchedPkg.id === 'pkg_shipping' || matchedPkg.name === 'Type 12 - 1 (Shipping)' || matchedPkg.name === 'Type 12 - 1') {
        return {
          name: 'Shipping',
          code: 'Shipping',
          isShipping: true,
          packageDef: matchedPkg,
          result: 'Shipping',
          reference: '14 Reports',
          unit: '',
          rows: []
        };
      }
      if (matchedPkg.name === 'Type 11' || matchedPkg.id === 'pkg_type11' || matchedPkg.id === 'pkg_colombo_consultancy') {`;
  code = code.replace(matchTarget, matchRepl);
}

// Also in selectedTest for name check:
if (!code.includes("name.toLowerCase().includes('shipping')")) {
  const nameCheckTarget = "if (name === 'SGPT & SGOT') {";
  const nameCheckRepl = `if (name.toLowerCase().includes('shipping') || name === 'Type 12 - 1' || name === 'Type 12 - 1 (Shipping)') {
    return {
      name: 'Shipping',
      code: 'Shipping',
      isShipping: true,
      result: 'Shipping',
      reference: '14 Reports',
      unit: '',
      rows: []
    };
  }
  if (name === 'SGPT & SGOT') {`;
  code = code.replace(nameCheckTarget, nameCheckRepl);
}

fs.writeFileSync('backend/server.js', code);
console.log('Successfully updated backend/server.js with Shipping package definitions');
