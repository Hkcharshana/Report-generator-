const fs = require('fs');

['public/index.html', 'frontend/index.html'].forEach(rel => {
  let c = fs.readFileSync(rel, 'utf8');
  const target = '<label>Date</label>';
  const idx = c.indexOf(target);
  if (idx !== -1) {
    const divStart = c.lastIndexOf('<div', idx);
    const parentDivStart = c.lastIndexOf('<div', divStart - 1);
    console.log('Parent div snippet:', JSON.stringify(c.substring(parentDivStart, idx + 25)));
    
    // Replace the parent <div> with <div id="patientDateSummaryBox">
    const before = c.substring(0, parentDivStart);
    const after = c.substring(parentDivStart + 5); // replace '<div' with '<div id="patientDateSummaryBox"'
    c = before + '<div id="patientDateSummaryBox"' + after;

    // And add badge to <label>Date</label>
    c = c.replace('<label>Date</label>', '<label>Date <span id="patientDateSearchBadge" class="date-highlight-pill" style="display:none;">Search Date</span></label>');

    fs.writeFileSync(rel, c, 'utf8');
    console.log('Successfully updated', rel);
  }
});
