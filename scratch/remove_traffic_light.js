const fs = require('fs');

['public/index.html', 'frontend/index.html'].forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<span id="patientDateSearchBadge"[^>]*>.*?<\/span>/g, '');
  fs.writeFileSync(f, s);
  console.log('Cleaned HTML', f);
});

['public/app.js', 'frontend/app.js'].forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/highlightPatientSearchResult\(record\);?/g, '// highlight removed');
  fs.writeFileSync(f, s);
  console.log('Cleaned JS', f);
});
