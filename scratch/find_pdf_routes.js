const fs = require('fs');
const s = fs.readFileSync('backend/server.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes("app.post('/api/export/pdf'") || l.includes('test.isType11') || l.includes('test.isType10B')) {
    console.log((i+1) + ': ' + l);
  }
});
