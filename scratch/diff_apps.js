const fs = require('fs');

const f1 = fs.readFileSync('public/app.js', 'utf8');
const f2 = fs.readFileSync('frontend/app.js', 'utf8');

console.log('public/app.js length:', f1.length, 'lines:', f1.split('\n').length);
console.log('frontend/app.js length:', f2.length, 'lines:', f2.split('\n').length);

// Compare line by line differences
const l1 = f1.split('\n');
const l2 = f2.split('\n');

for (let i = 0; i < Math.max(l1.length, l2.length); i++) {
  if (l1[i] !== l2[i]) {
    console.log(`First diff at line ${i+1}:`);
    console.log(`public:   ${l1[i]}`);
    console.log(`frontend: ${l2[i]}`);
    break;
  }
}
