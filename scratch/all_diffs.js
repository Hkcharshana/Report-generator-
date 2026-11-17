const fs = require('fs');

const f1 = fs.readFileSync('public/app.js', 'utf8').split('\n');
const f2 = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 0; i < Math.max(f1.length, f2.length); i++) {
  if (f1[i] !== f2[i]) {
    console.log(`Line ${i+1}:`);
    console.log(`  PUBLIC:   ${(f1[i] || '').slice(0, 100)}`);
    console.log(`  FRONTEND: ${(f2[i] || '').slice(0, 100)}`);
  }
}
