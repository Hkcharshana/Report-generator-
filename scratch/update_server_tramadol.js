const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Replace ['Phencyclidine (PCP)', 'pcp'] with ['Tramadol (TML)', 'tml']
code = code.replace("['Phencyclidine (PCP)', 'pcp']", "['Tramadol (TML)', 'tml']");

// If there's any fallback reading 'pcp', allow 'tml' or 'pcp'
code = code.replace("data[`urine_drug_${dKey}`]", "(data[`urine_drug_${dKey}`] || (dKey === 'tml' ? data['urine_drug_pcp'] : null))");

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Updated server.js to use Tramadol (TML)!');
