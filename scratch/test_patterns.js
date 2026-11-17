const fs = require('fs');
const s = fs.readFileSync('frontend/app.js', 'utf8');
const lines = s.split('\n');

lines.forEach((l, i) => {
  if (/^\s*\(['"#]/.test(l)) {
    console.log(`Line ${i+1}: ${l}`);
  }
  if (l.includes('.forEach') && !l.includes('$$') && !l.includes('Array') && !l.includes('Object') && !l.includes('].forEach') && !l.includes(').forEach') && !l.includes('keys.forEach') && !l.includes('lines.forEach') && !l.includes('records.forEach') && !l.includes('tests.forEach') && !l.includes('items.forEach') && !l.includes('inputs.forEach')) {
    // Check if it looks suspicious
    if (l.includes("('") || l.includes('("')) {
      console.log(`Potential bad forEach at line ${i+1}: ${l}`);
    }
  }
});
