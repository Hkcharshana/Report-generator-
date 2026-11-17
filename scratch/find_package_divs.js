const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('id="type11') || l.includes('id="colombo') || l.includes('id="type10b') || l.includes('id="type7') || l.includes('package-panel') || l.includes('colombo-package-card')) {
    console.log((i+1) + ': ' + l);
  }
});
