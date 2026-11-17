const fs = require('fs');

['public/index.html', 'frontend/index.html'].forEach(rel => {
  let c = fs.readFileSync(rel, 'utf8');
  c = c.replace('<div id="patientDateSummaryBox"\r\n', '<div id="patientDateSummaryBox">\r\n');
  c = c.replace('<div id="patientDateSummaryBox"\n', '<div id="patientDateSummaryBox">\n');
  fs.writeFileSync(rel, c, 'utf8');
  console.log('Fixed bracket in', rel);
});
