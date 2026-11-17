const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const badChunk = `    records['5329'] = rec5329;
    records['05329'] = rec5329;
    records['MRD5329'] = rec5329;
    records['MRD05329'] = rec5329;
    recordList.unshift(rec5329);`;

code = code.replace(badChunk, '');

const after5331 = `    referenceRecords['5330'] = rec5330;`;
const with5329 = `    referenceRecords['5329'] = rec5329;
    referenceRecords['05329'] = rec5329;
    referenceRecords['P1010657'] = rec5329;
    referenceRecords['5330'] = rec5330;`;

code = code.replace(after5331, with5329);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Fixed referenceRecords for 5329!');
