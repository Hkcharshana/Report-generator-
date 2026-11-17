const fs = require('fs');
const s = fs.readFileSync('public/app.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('report_type') || l.includes('colomboResults') || l.includes('type11')) {
    console.log((i+1) + ': ' + l);
  }
});
