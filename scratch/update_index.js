const fs = require('fs');

function updateHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. result_note hidden input
  html = html.replace(
    /<input type="hidden" name="result_note" value="\[Repeated and Confirmed\]">/,
    '<input type="hidden" name="result_note" id="result_note" value="">'
  );

  // 2. Add repeatedConfirmedWrap after splitResults if not already present
  if (!html.includes('id="enable_repeated_confirmed"')) {
    const needle = /<input id="sgot_result" name="sgot_result" placeholder="Enter SGOT result">\r?\n\s*<\/div>\r?\n\s*<\/div>/;
    const match = html.match(needle);
    if (match) {
      const addition = `
              <div id="repeatedConfirmedWrap" style="margin-top:8px;">
                <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:#334155; background:#f8fafc; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; user-select:none;">
                  <input type="checkbox" id="enable_repeated_confirmed" name="enable_repeated_confirmed" style="width:16px; height:16px; cursor:pointer; accent-color:#0d9488;">
                  <span>[Repeated and Confirmed] <small style="color:#64748b; font-weight:normal;">(Auto-checked if result is HIGH, or toggle manually)</small></span>
                </label>
              </div>`;
      html = html.replace(match[0], match[0] + addition);
      console.log(`Added checkbox to ${filePath}`);
    } else {
      console.warn(`Needle not found in ${filePath}`);
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

updateHtml('frontend/index.html');
updateHtml('public/index.html');
console.log('Finished updating HTML files');
