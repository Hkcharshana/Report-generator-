const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Update selectedTest in backend/server.js to unify all packages (standard & custom)
const oldPkgSection = `    // Check custom packages
    const allPkgs = [...BUILTIN_PACKAGES, ...(securityConfig.customPackages || [])];
    
      if (name === 'Type 11' || name === 'Colombo Consultancy Package' || name === 'Colombo Consultancy' || data.package_name === 'Type 11' || data.package_name === 'Colombo Consultancy Package') {
        const pkg = BUILTIN_PACKAGES.find(p => p.id === 'pkg_colombo_consultancy') || {
          name: 'Type 11',
          code: 'Type 11',
          tests: ['Fasting Blood Sugar', 'SGPT & SGOT', 'Urine Full Report', 'Gamma GT', 'Lipid Profile']
        };
        return {
          name: 'Type 11',
          code: 'Type 11',
          isType11: true,
          isCustomPackage: true,
          packageDef: pkg,
          result: 'Type 11',
          reference: '5 Reports (Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
          unit: '',
          rows: []
        };
      }
      if (name === 'Gamma GT') {
        const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'test_result', '18'));
        return {
          name: 'Gamma GT',
          code: 'GGT',
          result: \`\${ggtVal} U/L\`,
          reference: '5 - 40 U/L',
          unit: 'U/L',
          method: '[Test Method - Spectrophotometry - Kinetic ]',
          specimen: 'Blood',
          rows: [
            { test: 'Gamma GT', result: \`\${ggtVal} U/L\`, unit: 'U/L', flag: '', ref: '5 - 40 U/L' }
          ]
        };
      }

      const matchedPkg = allPkgs.find(p => 
      p.name.toLowerCase() === name.toLowerCase() ||
      p.code.toLowerCase() === name.toLowerCase() ||
      (data.package_name && p.name.toLowerCase() === String(data.package_name).toLowerCase()) ||
      (data.package_id && p.id === data.package_id)
    );
    if (matchedPkg && !matchedPkg.isBuiltin) {
      return {
        name: matchedPkg.name,
        code: matchedPkg.code,
        isCustomPackage: true,
        packageDef: matchedPkg,
        result: matchedPkg.name,
        reference: \`\${matchedPkg.tests.length} Reports (\${matchedPkg.tests.join(', ')})\`,
        unit: '',
        rows: []
      };
    }`;

const newPkgSection = `    // Unified Package Resolution (Standard & Custom Packages)
    const allPkgs = [...BUILTIN_PACKAGES, ...(securityConfig.customPackages || [])];
    
    if (name === 'Gamma GT') {
      const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'test_result', '18'));
      return {
        name: 'Gamma GT',
        code: 'GGT',
        result: \`\${ggtVal} U/L\`,
        reference: '5 - 40 U/L',
        unit: 'U/L',
        method: '[Test Method - Spectrophotometry - Kinetic ]',
        specimen: 'Blood',
        rows: [
          { test: 'Gamma GT', result: \`\${ggtVal} U/L\`, unit: 'U/L', flag: '', ref: '5 - 40 U/L' }
        ]
      };
    }

    const matchedPkg = allPkgs.find(p => 
      p.name.toLowerCase() === name.toLowerCase() ||
      p.code.toLowerCase() === name.toLowerCase() ||
      (data.package_name && p.name.toLowerCase() === String(data.package_name).toLowerCase()) ||
      (data.report_type && data.report_type !== 'single' && p.name.toLowerCase() === String(data.report_type).toLowerCase()) ||
      (data.package_id && p.id === data.package_id)
    );

    if (matchedPkg) {
      if (matchedPkg.name === 'Type 10 B' || matchedPkg.id === 'pkg_type10b') {
        return { name: matchedPkg.name, isType10B: true, hasUrineDrug: false, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Type 10 B with urine drug' || matchedPkg.id === 'pkg_type10b_drug') {
        return { name: matchedPkg.name, isType10B: true, hasUrineDrug: true, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Type 7' || matchedPkg.id === 'pkg_type7') {
        return { name: matchedPkg.name, isType7: true, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Type 11' || matchedPkg.id === 'pkg_type11' || matchedPkg.id === 'pkg_colombo_consultancy') {
        return {
          name: 'Type 11',
          code: 'Type 11',
          isType11: true,
          isCustomPackage: true,
          packageDef: matchedPkg,
          result: 'Type 11',
          reference: '5 Reports (Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
          unit: '',
          rows: []
        };
      }
      return {
        name: matchedPkg.name,
        code: matchedPkg.code,
        isCustomPackage: true,
        packageDef: matchedPkg,
        result: matchedPkg.name,
        reference: \`\${matchedPkg.tests.length} Reports (\${matchedPkg.tests.join(', ')})\`,
        unit: '',
        rows: []
      };
    }`;

if (code.includes(oldPkgSection)) {
  code = code.replace(oldPkgSection, newPkgSection);
  console.log('✓ Unified package resolution in server.js');
} else {
  console.log('oldPkgSection not exact match, using fallback search');
  const startIdx = code.indexOf('// Check custom packages');
  const endIdx = code.indexOf('// Check custom tests');
  if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + newPkgSection + '\n\n  ' + code.substring(endIdx);
    console.log('✓ Successfully replaced package section using indices in server.js');
  }
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('✓ server.js updated');
