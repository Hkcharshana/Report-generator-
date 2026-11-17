const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(250, 350).join('\n'));
