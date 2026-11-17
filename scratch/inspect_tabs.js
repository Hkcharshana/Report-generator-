const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('class="tab') || l.includes('tab-btn') || l.includes('data-tab') || l.includes('nav-tab') || l.includes('header-tab') || l.includes('<nav')) {
    console.log((i+1) + ': ' + l);
  }
});
