const fs = require('fs');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');
const pubAppJs = fs.readFileSync('public/app.js', 'utf8');
const serverJs = fs.readFileSync('backend/server.js', 'utf8');
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
const pubIndexHtml = fs.readFileSync('public/index.html', 'utf8');
const adminJs = fs.readFileSync('frontend/admin.js', 'utf8');
const pubAdminJs = fs.readFileSync('public/admin.js', 'utf8');
const secCfg = JSON.parse(fs.readFileSync('backend/security_config.json', 'utf8'));

const checks = [
  { name: 'app.js defaults has 12 & 5', pass: appJs.includes('Urine Drug Screening (12 Drugs)') && appJs.includes('Urine Drug Screening (5 Drugs)') },
  { name: 'public/app.js equals frontend/app.js', pass: appJs === pubAppJs },
  { name: 'app.js preview Negative not bold (weight normal)', pass: appJs.includes('<span style="color:#059669;font-weight:normal;">Negative</span>') },
  { name: 'app.js methodLine hides UFR', pass: appJs.includes("['Urine Full Report', 'Haemoglobin A1C'") },
  { name: 'index.html has 12 & 5 options', pass: indexHtml.includes('value="Urine Drug Screening (12 Drugs)"') && indexHtml.includes('value="Urine Drug Screening (5 Drugs)"') },
  { name: 'public/index.html equals frontend/index.html', pass: indexHtml === pubIndexHtml },
  { name: 'admin.js has 12 & 5 in standardTests', pass: adminJs.includes('Urine Drug Screening (12 Drugs)') && adminJs.includes('Urine Drug Screening (5 Drugs)') },
  { name: 'public/admin.js equals frontend/admin.js', pass: adminJs === pubAdminJs },
  { name: 'security_config.json permissions has 12 & 5', pass: !!secCfg.testPermissions['Urine Drug Screening (12 Drugs)'] && !!secCfg.testPermissions['Urine Drug Screening (5 Drugs)'] },
  { name: 'server.js selectedTest supports 12 & 5', pass: serverJs.includes("Urine Drug Screening (12 Drugs)") },
  { name: 'server.js PDF Negative not bold', pass: serverJs.includes("pdfText(targetPage, font, res, 340, rowY, 10.5 + fsBonus, false);") },
  { name: 'server.js Excel Negative not bold', pass: serverJs.includes("bold: isPos,") },
  { name: 'server.js UFR Excel removes test method', pass: serverJs.includes("ws.getCell(`D${noteRow+4}`).value='**End of Report**';") },
  { name: 'server.js UFR PDF removes test method', pass: !serverJs.includes("pdfText(page, font, `[Test Method - ${method}]`, 43, curY - 18, 9 + fsBonus, true);") },
  { name: 'server.js custom pkg drug uses template', pass: serverJs.includes("is12 ? 'urine-drug-12-template.xlsx' : 'urine-drug-5-template.xlsx'") }
];

console.log('--- TEST RESULTS ---');
let allPassed = true;
checks.forEach(c => {
  console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
  if (!c.pass) allPassed = false;
});

if (allPassed) {
  console.log('\n🎉 ALL CHECKS PASSED!');
} else {
  console.log('\n⚠️ SOME CHECKS FAILED!');
  process.exit(1);
}
