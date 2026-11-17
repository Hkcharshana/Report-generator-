const fs = require('fs');
const s = fs.readFileSync('backend/server.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes("app.post('/api/") || l.includes('app.get(\'/api/')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
