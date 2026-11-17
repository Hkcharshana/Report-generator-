const fs = require('fs');
const path = require('path');

['public/app.js', 'frontend/app.js'].forEach(rel => {
  const filePath = path.join(__dirname, '..', rel);
  let c = fs.readFileSync(filePath, 'utf8');

  const startIdx = c.indexOf('function showChoices(records) {');
  const endIdx = c.indexOf('async function searchPatient()', startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const newShowChoices = `function showChoices(records) {
  const box = $('#liveChoices');
  if (!box) return;
  
  let html = '<label class="choice-label" style="font-size:12.5px; font-weight:700; color:#0f766e; margin-bottom:10px; display:block;">' +
    '📋 Multiple Patients Found (' + records.length + ') &mdash; Click a patient to load:' +
    '</label>';

  html += '<div style="display:flex; flex-direction:column; gap:8px; max-width:850px; margin-bottom:10px;">';
  records.forEach((r, i) => {
    const ref = r.ref_no || r.raw_ref_no || 'No Ref';
    const name = (r.fname || '') + ' ' + (r.lname || '');
    const pp = r.passport_no || '-';
    const dt = r.medical_date || r.reg_date || 'No Date';
    const agency = r.agency_name || r.agency || '';
    
    html += '<div class="choice-card-item" data-choice-idx="' + i + '" style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px 14px; cursor:pointer; transition:all 0.2s;">' +
      '<div style="display:flex; align-items:center; gap:12px;">' +
        '<span style="display:inline-block; font-weight:800; font-size:14px; color:#0f766e; background:#f0fdfa; padding:4px 10px; border-radius:6px; border:1px solid #99f6e4;">' + ref + '</span>' +
        '<div>' +
          '<strong style="font-size:13.5px; color:#0f172a; display:block;">' + (name.trim() || 'Unknown Patient') + '</strong>' +
          '<span style="font-size:11.5px; color:#64748b;">PP: ' + pp + (agency ? ' &bull; ' + agency : '') + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:10px;">' +
        '<span class="choice-date-badge" style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; color:#c2410c; background:#ffedd5; border:1px solid #fdba74; padding:4px 10px; border-radius:6px;">' +
          '📅 Date: ' + dt +
        '</span>' +
        '<button type="button" class="btn primary btn-xs" style="padding:5px 12px; font-size:12px;">Select</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  box.innerHTML = html;
  box.hidden = false;

  box.querySelectorAll('.choice-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const idx = Number(card.getAttribute('data-choice-idx'));
      if (records[idx]) {
        setPatient(records[idx]);
        toast('Patient loaded from list');
        $('#patient')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

`;

    c = c.substring(0, startIdx) + newShowChoices + c.substring(endIdx);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Replaced showChoices in', rel);
  }
});
