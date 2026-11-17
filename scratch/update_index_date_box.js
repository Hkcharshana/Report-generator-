const fs = require('fs');
const path = require('path');

['public/index.html', 'frontend/index.html'].forEach(rel => {
  const p = path.join(__dirname, '..', rel);
  let c = fs.readFileSync(p, 'utf8');

  // Replace the opening <div> of the Date box
  const oldSnippet = `          </div>
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label>Date</label>`;
  
  const newSnippet = `          </div>
          <div id="patientDateSummaryBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label>Date <span id="patientDateSearchBadge" class="date-highlight-pill" style="display:none;">Search Date</span></label>`;

  if (c.includes(oldSnippet)) {
    c = c.replace(oldSnippet, newSnippet);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Updated', rel);
  } else {
    console.log('Snippet not matched in', rel);
  }
});
