const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

if (!code.includes("'Gamma GT': { key: 'gamma_gt'")) {
  code = code.replace("'HIV Ag & Ab Test': { key: 'hiv_ag_ab', reference: 'Negative' }", "'HIV Ag & Ab Test': { key: 'hiv_ag_ab', reference: 'Negative' },\n  'Gamma GT': { key: 'gamma_gt', reference: '5 - 40 U/L' },\n  'Colombo Consultancy Package': { key: 'colombo_pkg', reference: '5 Reports' }");
}

if (!code.includes("'Gamma GT':'U/L'")) {
  code = code.replace("'HIV Ag & Ab Test':''", "'HIV Ag & Ab Test':'', 'Gamma GT':'U/L', 'Colombo Consultancy Package':''");
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Added Gamma GT to requestedTests and testUnits');
