const fs = require('fs');
const path = require('path');

['public/app.js', 'frontend/app.js'].forEach(rel => {
  const filePath = path.join(__dirname, '..', rel);
  let c = fs.readFileSync(filePath, 'utf8');

  // 1. Highlight helper function to inject
  const highlightHelper = `
function highlightPatientSearchResult(record) {
  try {
    const patientCard = document.getElementById('patient');
    const dateBox = document.getElementById('patientDateSummaryBox');
    const dateBadge = document.getElementById('patientDateSearchBadge');

    // 1. Highlight entire patient card
    if (patientCard) {
      patientCard.classList.remove('card-patient-highlight');
      void patientCard.offsetWidth; // Trigger reflow for animation restart
      patientCard.classList.add('card-patient-highlight');
      
      // Auto-remove pulse animation after 10 seconds (keeps clean look)
      setTimeout(() => {
        patientCard.classList.remove('card-patient-highlight');
      }, 10000);
    }

    // 2. Highlight Date Box specifically
    if (dateBox) {
      dateBox.classList.remove('patient-date-highlight');
      void dateBox.offsetWidth;
      dateBox.classList.add('patient-date-highlight');

      if (dateBadge) {
        dateBadge.style.display = 'inline-flex';
        const dText = record?.medical_date || record?.reg_date || '';
        dateBadge.textContent = dText ? 'Search Date: ' + dText : 'Search Date';
      }

      setTimeout(() => {
        dateBox.classList.remove('patient-date-highlight');
        if (dateBadge) dateBadge.style.display = 'none';
      }, 15000);
    }
  } catch (err) {
    console.warn('highlightPatientSearchResult error:', err);
  }
}
`;

  // Inject highlight helper if not present
  if (!c.includes('function highlightPatientSearchResult')) {
    const setPatientMarker = 'function setPatient(record) {';
    c = c.replace(setPatientMarker, highlightHelper + '\n' + setPatientMarker);
  }

  // 2. Call highlightPatientSearchResult inside setPatient(record)
  const autoSelectMarker = 'sendPatientToH360(true);';
  const newCall = 'sendPatientToH360(true);\n  highlightPatientSearchResult(record);';
  if (c.includes(autoSelectMarker) && !c.includes('highlightPatientSearchResult(record);')) {
    c = c.replace(autoSelectMarker, newCall);
  }

  // 3. Improve showChoices to clearly format each choice and display dates prominently
  const oldShowChoices = `function showChoices(records) {
  const box = $('#liveChoices');
  box.innerHTML = '<label class="choice-label">Multiple patients found â€” select the correct reference</label><div class="choice-row"><select id="liveChoice">' +
    records.map((r, i) => \`<option value="\${i}">\${r.ref_no || 'No Ref'} â€¢ \${r.fname || ''} \${r.lname || ''} â€¢ \${r.passport_no || ''} â€¢ \${r.medical_date || r.reg_date || ''}</option>\`).join('') +
    '</select><button class="btn primary" id="useLiveChoice">Use selected</button></div>';
  box.hidden = false;
  $('#useLiveChoice').onclick = () => setPatient(records[Number($('#liveChoice').value)]);
}`;

  // Use a regex to match showChoices regardless of encoding characters
  const showChoicesRegex = /function showChoices\(records\) \{[\s\S]*?box\.hidden = false;\s*\$('#useLiveChoice')\.onclick = \(\) => setPatient\(records\[Number\(\$('#liveChoice')\.value\)\]\);\s*\}/;

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
}`;

  if (showChoicesRegex.test(c)) {
    c = c.replace(showChoicesRegex, newShowChoices);
    console.log('Replaced showChoices in', rel);
  } else {
    console.log('showChoicesRegex not matched in', rel);
  }

  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Successfully updated', rel);
});
