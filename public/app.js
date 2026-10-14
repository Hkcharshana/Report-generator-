const defaults = {
  'FBS': ['fbs', '74 - 115 mg/dL'],
  'RBS': ['rbs', '< 160 mg/dl'],
  'Total Cholesterol': ['cholesterol', '< 240 mg/dl'],
  'SGPT': ['sgpt', 'Upto 45 iu/l (Men) / Upto 34 iu/l (Women)'],
  'SGOT': ['sgot', 'Upto 35 iu/l (Men) / Upto 31 iu/l (Women)'],
  'SGPT & SGOT': ['sgpt', 'SGPT: Upto 45/34 iu/l | SGOT: Upto 35/31 iu/l'],
  'Lipid Profile': ['lipid_profile', 'See lipid profile reference ranges below'],
  'Total Bilirubine': ['bilirubin_qty', '0.4 - 1.2 mg/dl'],
  'Serum Creatine': ['creatinine', '0.6 - 1.3 mg/dL'],
  'Urine Full Report': ['urine_full_report', 'Standard Normal'],
  'Haemoglobin A1C': ['hba1c_result', 'See reference ranges below']
};

const units = {
  'FBS': 'mg/dL',
  'RBS': 'mg/dL',
  'Total Cholesterol': 'mg/dL',
  'SGPT': 'iu/l',
  'SGOT': 'iu/l',
  'SGPT & SGOT': 'iu/l',
  'Lipid Profile': '',
  'Total Bilirubine': 'mg/dL',
  'Serum Creatine': 'mg/dL',
  'Urine Full Report': '',
  'Haemoglobin A1C': '%'
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let currentPatientRecord = null;

function openApp() {
  const login = $('#loginScreen');
  const app = $('#appShell');
  if (login && app) {
    login.hidden = true;
    app.hidden = false;
  }
}

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function setConnectionStatus(mode, username) {
  const badge = $('#connStatus');
  if (!badge) return;
  if (mode === 'neosys') {
    badge.textContent = `🟢 NeoSys Online (${username || 'User'})`;
    badge.className = 'conn-badge online';
  } else {
    badge.textContent = '🟡 Local Mode';
    badge.className = 'conn-badge offline';
  }
}

async function checkExistingSession() {
  try {
    const s = await fetch('/api/session').then(r => r.json());
    if (s.connected) {
      setConnectionStatus(s.mode, s.username);
    }
  } catch {}
}
checkExistingSession();

// ── Eye button: show / hide password ──────────────────────────────────────
$('#loginEyeBtn')?.addEventListener('click', () => {
  const pw = $('#loginPass');
  const showing = pw.type === 'text';
  pw.type = showing ? 'password' : 'text';
  const showSvg = $('#eyeIconShow');
  const hideSvg = $('#eyeIconHide');
  if (showSvg && hideSvg) {
    showSvg.style.display = showing ? 'block' : 'none';
    hideSvg.style.display = showing ? 'none' : 'block';
  }
  $('#loginEyeBtn').setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
});

// ── Dark / Light theme toggle ──────────────────────────────────────────────
(function () {
  const ls = document.getElementById('loginScreen');
  const btn = document.getElementById('loginThemeBtn');
  const DARK_CLASS = 'dark';
  const PREF_KEY = 'neosys-login-theme';

  function applyTheme(dark) {
    if (dark) {
      ls?.setAttribute('data-theme', 'dark');
      if (btn) btn.textContent = '☀️ Dark / Light';
    } else {
      ls?.removeAttribute('data-theme');
      if (btn) btn.textContent = '🌙 Dark / Light';
    }
    try { localStorage.setItem(PREF_KEY, dark ? 'dark' : 'light'); } catch {}
  }

  // Restore saved preference
  let saved;
  try { saved = localStorage.getItem(PREF_KEY); } catch {}
  if (saved === 'dark') applyTheme(true);
  else if (saved === 'light') applyTheme(false);
  else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) applyTheme(true);

  btn?.addEventListener('click', () => {
    const isDark = ls?.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
  });
})();

$('#loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const user = $('#loginUser').value.trim();
  const pass = $('#loginPass').value;
  const btn = $('#loginBtn');
  const errBox = $('#loginError');
  if (errBox) errBox.hidden = true;

  if (!user || !pass) {
    toast('Enter NeoSys username and password');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connecting to NeoSys...';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (data.ok) {
      openApp();
      setConnectionStatus(data.mode, data.username);
      toast(`Connected to NeoSys as ${data.username || user}`);
    } else {
      if (errBox) {
        errBox.textContent = data.error || 'NeoSys login failed. Check username and password.';
        errBox.hidden = false;
      }
      toast(data.error || 'NeoSys login failed');
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Connection error: ' + err.message;
      errBox.hidden = false;
    }
    toast('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login to NeoSys';
  }
});

$('#offlineLoginBtn')?.addEventListener('click', async e => {
  e.preventDefault();
  try {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offline: true })
    });
  } catch {}
  openApp();
  setConnectionStatus('offline');
  toast('Operating in Local / Offline mode');
});

function collect() {
  const data = {};
  $$('#reportForm [name]').forEach(x => data[x.name] = x.value);
  if (data.test_name === 'SGPT & SGOT') {
    const pt = (data.sgpt_result || '').trim();
    const ot = (data.sgot_result || '').trim();
    data.test_result = (pt || ot) ? `${pt} | ${ot}` : '';
  }
  if (data.test_name === 'SGOT') {
    data.test_result = (data.test_result || data.sgot_result || '').trim();
  }
  if (data.test_name === 'SGPT') {
    data.test_result = (data.test_result || data.sgpt_result || '').trim();
  }
  if (data.test_name === 'Lipid Profile') {
    data.test_result = `Total Cholesterol: ${data.lipid_total || ''}\nTriglyceride: ${data.lipid_triglyceride || ''}\nHDL- Cholesterol: ${data.lipid_hdl || ''}`.replace(/: \n/g, '').trim();
  }
  if (data.test_name === 'Urine Full Report') {
    data.test_result = 'URINE FULL REPORT';
    if (!data.specimen || data.specimen === 'Blood') data.specimen = 'Urine';
  }
  if (data.test_name === 'Haemoglobin A1C') {
    const rawVal = $('#hba1c_result_input')?.value.trim() || '5.3%';
    data.hba1c_result = rawVal;
    data.test_result = rawVal;
    if (!data.specimen || data.specimen === 'Urine') data.specimen = 'Blood';
  }
  return data;
}

function reportName(record) {
  const raw = `${record.title || ''} ${record.fname || ''} ${record.lname || ''}`.replace(/\s+/g, ' ').trim().replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i, '').trim();
  if (!raw) return '';
  const words = raw.split(/\s+/);
  const shortName = words.length > 1 && !raw.includes('.') ? `${words.slice(0, -1).map(w => `${w[0].toUpperCase()}.`).join('')} ${words.at(-1)}` : raw;
  return record.gender === 'Male' ? `Mr. ${shortName}` : record.gender === 'Female' ? `Ms. ${shortName}` : shortName;
}

function reportDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value || Date.now());
  return isNaN(d) ? String(value || '') : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function currentReportTime(date, ref = '') {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && m[0] < today) {
    let seed = [...(m[0] + ref)].reduce((n, ch) => n + ch.charCodeAt(0), 0);
    const total = 330 + (seed % 61);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} PM`;
  }
  return now.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit' });
}

function reportAge(value) {
  const age = String(value ?? '').trim();
  return age && !/\byears?\b/i.test(age) ? `${age} Years` : age;
}

function setValue(name, value) {
  const x = $(`#reportForm [name="${name}"]`);
  if (x) x.value = value ?? '';
  $$(`[data-show="${name}"],[data-preview="${name}"]`).forEach(el => el.textContent = value || '—');
}

function renderExtraPatientDetails(record) {
  const details = $('#extraPatientDetails');
  const container = $('#extraPatientContent');
  if (!details || !container) return;

  const items = [
    ['Reference No', record.ref_no],
    ['Passport No', record.passport_no],
    ['Full Name', `${record.fname || ''} ${record.lname || ''}`.trim()],
    ['Gender', record.gender],
    ['Age', reportAge(record.age)],
    ['Date of Birth', record.dob],
    ['Marital Status', record.marital_status],
    ['Agency', record.agency_name || record.agency],
    ['Medical Date', reportDate(record.medical_date || record.reg_date)],
    ['Medical Type', record.medical_type_name],
    ['Country', record.country_name || record.country],
    ['Position', record.position],
    ['Telephone', record.telephone],
    ['Agency Ref No', record.agency_refno],
    ['GCC No', record.gcc_no],
    ['Height', record.height ? `${record.height} cm` : ''],
    ['Weight', record.weight ? `${record.weight} kg` : ''],
    ['Valid Days', record.valid_days],
    ['Blood Group', record.blood_group],
    ['Hemoglobin', record.hemoglobin ? `${record.hemoglobin} g/dl` : ''],
    ['ESR', record.esr ? `${record.esr} mm/hr` : ''],
    ['FBS / RBS', record.fbs || record.rbs],
    ['Total Cholesterol', record.cholesterol ? `${record.cholesterol} mg/dl` : ''],
    ['SGPT', record.sgpt ? `${record.sgpt} iu/l` : ''],
    ['SGOT', record.sgot ? `${record.sgot} iu/l` : ''],
    ['Serum Creatinine', record.creatinine ? `${record.creatinine} mg/dl` : ''],
    ['Blood Urea', record.urea ? `${record.urea} mg/dl` : ''],
    ['Bilirubin', record.bilirubin_qty || record.bilirubin],
    ['VDRL', record.vdrl],
    ['TPHA', record.tpha],
    ['HIV 1&2', record.hiv],
    ['HBs Ag.', record.hbc],
    ['HCV', record.hcv],
    ['Pregnancy', record.pregnancy],
    ['Urine Sugar', record.sugar],
    ['Urine Albumin', record.albumin],
    ['Lab Note', record.lab_note],
    ['General Note', record.general_note]
  ];

  const html = items
    .filter(([_, val]) => val && String(val).trim() && !/^(not tested|none|-)$/i.test(String(val).trim()))
    .map(([label, val]) => `<div class="extra-item"><label>${label}</label><span>${val}</span></div>`)
    .join('');

  if (html) {
    container.innerHTML = html;
    details.hidden = false;
  } else {
    details.hidden = true;
  }
}

function autoSelectLabTest(record) {
  if (!record) return;
  const hasVal = v => v && String(v).trim() && !/^(not tested|none|-)$/i.test(String(v).trim());

  let picked = '';
  if (hasVal(record.fbs)) picked = 'FBS';
  else if (hasVal(record.rbs)) picked = 'RBS';
  else if (hasVal(record.cholesterol)) picked = 'Total Cholesterol';
  else if (hasVal(record.sgpt) && hasVal(record.sgot)) picked = 'SGPT & SGOT';
  else if (hasVal(record.sgpt)) picked = 'SGPT';
  else if (hasVal(record.sgot)) picked = 'SGOT';
  else if (hasVal(record.creatinine)) picked = 'Serum Creatine';
  else if (hasVal(record.bilirubin_qty) || hasVal(record.bilirubin)) picked = 'Total Bilirubine';

  if (picked) {
    $('#test_name').value = picked;
    updateTest();
  }
}

function setPatient(record) {
  currentPatientRecord = record;
  const normalized = {
    ...record,
    fname: reportName(record),
    lname: '',
    title: '',
    age: reportAge(record.age),
    medical_date: reportDate(record.medical_date || record.reg_date),
    report_time: currentReportTime(record.medical_date || record.reg_date, record.ref_no),
    passport_no: record.passport_no || '',
    ref_no: record.ref_no || '',
    gender: record.gender || '',
    agency: record.agency_name || record.agency || '',
    specimen: record.specimen || 'Blood'
  };

  Object.entries(normalized).forEach(([k, v]) => setValue(k, v));
  $('#loadedBadge').textContent = 'Patient loaded';
  $('#loadedBadge').classList.add('loaded');
  $('#refSearch').value = record.ref_no || '';
  $('#liveChoices').hidden = true;

  renderExtraPatientDetails(record);
  autoSelectLabTest(record);
  updatePreview();
}

function showChoices(records) {
  const box = $('#liveChoices');
  box.innerHTML = '<label class="choice-label">Multiple patients found — select the correct reference</label><div class="choice-row"><select id="liveChoice">' +
    records.map((r, i) => `<option value="${i}">${r.ref_no || 'No Ref'} · ${r.fname || ''} ${r.lname || ''} · ${r.passport_no || ''} · ${r.medical_date || r.reg_date || ''}</option>`).join('') +
    '</select><button class="btn primary" id="useLiveChoice">Use selected</button></div>';
  box.hidden = false;
  $('#useLiveChoice').onclick = () => setPatient(records[Number($('#liveChoice').value)]);
}

async function searchPatient() {
  const query = $('#refSearch').value.trim();
  if (!query) {
    toast('Enter a Reference No or Passport No first');
    $('#refSearch').focus();
    return;
  }
  $('#searchBtn').disabled = true;
  $('#searchBtn').textContent = 'Searching...';
  $('#loadedBadge').textContent = 'Searching NeoSys...';
  $('#loadedBadge').className = 'loaded-badge';

  try {
    // 1. Direct search endpoint: checks NeoSys live session first, then local DB
    const res = await fetch('/api/patient/search?q=' + encodeURIComponent(query));
    if (res.ok) {
      const data = await res.json();
      if (data.records && data.records.length === 1) {
        setPatient(data.records[0]);
        toast(data.source === 'neosys' ? 'Patient loaded from NeoSys' : 'Local patient details loaded');
        $('#test').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      } else if (data.records && data.records.length > 1) {
        showChoices(data.records);
        $('#loadedBadge').textContent = `${data.records.length} patients found`;
        toast(`Found ${data.records.length} patients; choose the matching one.`);
        return;
      }
    }

    // 2. If server has no NeoSys session, fallback to browser bridge if running
    const bridge = await fetch('/api/bridge/status').then(x => x.json()).catch(() => ({ online: false }));
    if (bridge.online) {
      await fetch('/api/bridge/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: query })
      });
      $('#loadedBadge').textContent = 'Waiting for NeoSys bridge...';
      toast('NeoSys tab is searching ' + query + '...');
      for (let i = 0; i < 20; i++) {
        await new Promise(x => setTimeout(x, 700));
        const live = await fetch('/api/bridge/results?query=' + encodeURIComponent(query));
        if (live.ok) {
          const liveData = await live.json();
          if (liveData.records && liveData.records.length === 1) {
            setPatient(liveData.records[0]);
            toast('Live patient loaded via bridge');
            $('#test').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          } else if (liveData.records && liveData.records.length > 1) {
            showChoices(liveData.records);
            $('#loadedBadge').textContent = liveData.records.length + ' patients found';
            return;
          }
        }
      }
    }

    throw new Error('Patient not found. Check the Reference / Passport No or log in to NeoSys.');
  } catch (err) {
    toast(err.message);
    $('#loadedBadge').textContent = 'Patient not found';
    $('#loadedBadge').classList.remove('loaded');
  } finally {
    $('#searchBtn').disabled = false;
    $('#searchBtn').textContent = 'Search patient';
  }
}

function updateTest() {
  const name = $('#test_name').value;
  const spec = defaults[name];
  const unit = units[name] || '';
  const isUfr = name === 'Urine Full Report';
  const isHba1c = name === 'Haemoglobin A1C';

  $('#reportForm [name="unit"]').value = unit;
  $('#unit_display').value = unit || '—';
  $('#test_result').value = '';
  $('#test_result').classList.toggle('multi-result', name === 'Lipid Profile');
  $('#splitResults').hidden = name !== 'SGPT & SGOT';
  $('#lipidResults').hidden = name !== 'Lipid Profile';
  $('#test_result').hidden = ['SGPT & SGOT', 'Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C'].includes(name);

  // UFR & HbA1c inputs display toggling
  const ufrBox = $('#urineResults');
  if (ufrBox) ufrBox.hidden = !isUfr;
  const hba1cBox = $('#hba1cResults');
  if (hba1cBox) hba1cBox.hidden = !isHba1c;

  const regField = $('#regularResultField');
  if (regField) regField.hidden = isUfr || isHba1c;
  const unitField = $('#unitField');
  if (unitField) unitField.hidden = isUfr || isHba1c;
  const refField = $('#referenceRangeField');
  if (refField) refField.hidden = isUfr || isHba1c;

  if (isHba1c && !$('#hba1c_result_input')?.value) {
    if ($('#hba1c_result_input')) $('#hba1c_result_input').value = '5.3%';
  }

  // Specimen toggle: Urine for UFR, Blood for others if previously changed to Urine
  if (isUfr) {
    setValue('specimen', 'Urine');
  } else {
    const curSpecimen = $('#reportForm [name="specimen"]')?.value;
    if (curSpecimen === 'Urine') setValue('specimen', 'Blood');
  }

  if (!spec) {
    $('#reference_range').value = '';
    updatePreview();
    return;
  }
  $('#reference_range').value = spec[1];
  $('#test_result').placeholder = name === 'SGPT & SGOT' ? 'SGPT: 22 / SGOT: 20' : name === 'Lipid Profile' ? 'Total Cholesterol: 229\nHDL- Cholesterol: 57.3\nLDL- Cholesterol: 133.8\nVLDL- Cholesterol: 38.0\nTriglyceride: 190\nCHO/HDL ratio: 4.00' : 'Enter result, e.g. 98';

  // AUTO-POPULATE RESULT FROM PATIENT RECORD IF AVAILABLE
  const lab = currentPatientRecord || {};
  const cleanVal = v => (v && !/^(not tested|none|-)$/i.test(String(v).trim())) ? String(v).trim() : '';

  const cleanLabNum = v => {
    const raw = cleanVal(v);
    return raw ? raw.replace(/\s*i?u\/l\b/gi, '').trim() : '';
  };

  if (name === 'FBS') {
    const val = cleanVal(lab.fbs) || cleanVal(lab.rbs);
    if (val) $('#test_result').value = val;
  } else if (name === 'RBS') {
    const val = cleanVal(lab.rbs) || cleanVal(lab.fbs);
    if (val) $('#test_result').value = val;
  } else if (name === 'Total Cholesterol') {
    const val = cleanVal(lab.cholesterol);
    if (val) $('#test_result').value = val;
  } else if (name === 'SGPT') {
    const val = cleanLabNum(lab.sgpt) || $('#sgpt_result')?.value.trim() || ($('#test_name').dataset.prevTest === 'SGOT' ? '' : $('#test_result')?.value.trim()) || '';
    if (val) $('#test_result').value = val;
  } else if (name === 'SGOT') {
    const val = cleanLabNum(lab.sgot) || $('#sgot_result')?.value.trim() || ($('#test_name').dataset.prevTest === 'SGPT' ? '' : $('#test_result')?.value.trim()) || '';
    if (val) $('#test_result').value = val;
  } else if (name === 'SGPT & SGOT') {
    const ptVal = cleanLabNum(lab.sgpt) || ($('#test_name').dataset.prevTest === 'SGPT' ? $('#test_result')?.value.trim() : '') || $('#sgpt_result')?.value.trim() || '';
    const otVal = cleanLabNum(lab.sgot) || ($('#test_name').dataset.prevTest === 'SGOT' ? $('#test_result')?.value.trim() : '') || $('#sgot_result')?.value.trim() || '';
    if ($('#sgpt_result') && ptVal) $('#sgpt_result').value = ptVal;
    if ($('#sgot_result') && otVal) $('#sgot_result').value = otVal;
  } else if (name === 'Total Bilirubine') {
    const val = cleanVal(lab.bilirubin_qty) || cleanVal(lab.bilirubin);
    if (val) $('#test_result').value = val;
  } else if (name === 'Serum Creatine') {
    const val = cleanVal(lab.creatinine);
    if (val) $('#test_result').value = val;
  }
  $('#test_name').dataset.prevTest = name;

  updatePreview();
}

function updatePreview() {
  const data = collect();
  const hasPatient = !!data.ref_no;
  const hasTest = !!data.test_name && !!data.test_result;

  $('#previewEmpty').hidden = hasPatient && hasTest;
  $('#reportPreview').hidden = !(hasPatient && hasTest);

  $$('[data-preview]').forEach(el => {
    const k = el.dataset.preview;
    if (k !== 'test_result' && k !== 'reference_range') el.textContent = data[k] || '—';
  });

  if (data.test_name) {
    $$('[data-preview="test_name"]').forEach(el => {
      if (data.test_name === 'Urine Full Report') {
        el.textContent = 'URINE FULL REPORT';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'Haemoglobin A1C') {
        el.textContent = 'HAEMOGLOBIN A1C';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'FBS') {
        el.textContent = 'FASTING BLOOD SUGAR';
        el.style.textDecoration = 'none';
      } else if (data.test_name === 'RBS') {
        el.textContent = 'RANDOM BLOOD SUGAR';
        el.style.textDecoration = 'none';
      } else {
        el.textContent = data.test_name;
        el.style.textDecoration = 'none';
      }
    });
  }

  const body = $('#previewBody'), refs = $('#previewReference'), confirm = $('#previewConfirm'), refHead = $('#previewRefHead');
  const methodLine = $('.method-line');
  if (confirm) confirm.hidden = ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'SGPT', 'SGOT', 'SGPT & SGOT'].includes(data.test_name);
  if (methodLine) methodLine.hidden = data.test_name === 'Haemoglobin A1C';
  if (!body) return;

  if (data.test_name === 'Urine Full Report') {
    if (refHead) refHead.hidden = true;
    const chemicalRows = [
      ['Colour', data.ufr_colour || 'Pale Yellow'],
      ['Appearance', data.ufr_appearance || 'Clear'],
      ['Specific Gravity', data.ufr_specific_gravity || '1.015'],
      ['pH', data.ufr_ph || '6.0'],
      ['Glucose', data.ufr_glucose || 'Nil'],
      ['Protein (Albumin)', data.ufr_protein || 'Nil'],
      ['Ketone Bodies', data.ufr_ketone || 'Nil'],
      ['Bilirubin', data.ufr_bilirubin || 'Nil'],
      ['Urobilinogen', data.ufr_urobilinogen || '+ Normal']
    ];
    const microscopyRows = [
      ['Pus Cells', data.ufr_pus_cells || '+ 01 - 02 /hpf'],
      ['Red Cells', data.ufr_red_cells || 'Nil'],
      ['Epithelial Cells', data.ufr_epithelial_cells || '+  A Few   /hpf'],
      ['Organisms', data.ufr_organisms || 'Nil'],
      ['Crystals', data.ufr_crystals || 'Nil'],
      ['Casts', data.ufr_casts || 'Nil']
    ];

    let html = chemicalRows.map(([label, res]) =>
      `<tr><td style="font-weight:600; width:45%;">${label}</td><td style="font-weight:600;"><span style="display:inline-block; width:22px;">_</span> ${res}</td></tr>`
    ).join('');

    html += `<tr><td colspan="2" style="font-weight:bold; text-decoration:underline; padding-top:14px; font-size:1.05em; color:var(--text, #0f172a);">Centrifuged Urine Microscopy</td></tr>`;

    html += microscopyRows.map(([label, res]) =>
      `<tr><td style="font-weight:600; width:45%;">${label}</td><td style="font-weight:600;"><span style="display:inline-block; width:22px;">_</span> ${res}</td></tr>`
    ).join('');

    body.innerHTML = html;
    refs.innerHTML = '';
  } else if (data.test_name === 'Haemoglobin A1C') {
    if (refHead) refHead.hidden = true;
    const hba1cVal = data.hba1c_result || '5.3%';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:45%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Result</th>
      </tr>
      <tr>
        <td style="font-weight:600; padding-top:10px;">HbA1c</td>
        <td style="font-weight:bold; padding-top:10px;">${hba1cVal}</td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="font-weight:bold; text-decoration:underline; margin:18px 0 8px; color:var(--text, #0f172a); font-size:1.02em;">Reference Range</div>
      <div style="display:grid; grid-template-columns:120px 14px auto; row-gap:3px; font-size:12.5px; line-height:1.5;">
        <div>Below 6.0%</div><div>-</div><div>Normal</div>
        <div>6.0% to 6.4%</div><div>-</div><div>Prediabetes</div>
        <div>6.5% or above</div><div>-</div><div>Diabetes</div>
        <div>&lt;7.0%</div><div>-</div><div>Goal of Therapy (Adults)</div>
        <div>&gt;8.0%</div><div>-</div><div>Action Suggested (Adults)</div>
      </div>
      <div style="margin-top:18px; font-weight:bold; font-size:12px; line-height:1.5; color:#1e293b;">
        <div>Analyzer -HemoCue® HbA1c 501</div>
        <div>(Test Method - Fluorescence Immunoassay (FIA))</div>
      </div>
    `;
  } else if (data.test_name === 'Lipid Profile') {
    const keys = ['Total Cholesterol', 'HDL- Cholesterol', 'LDL- Cholesterol', 'VLDL- Cholesterol', 'Triglyceride', 'CHO/HDL ratio'];
    const vals = {};
    String(data.test_result).split(/\n|[,;]+/).map(x => x.trim()).filter(Boolean).forEach((line, i) => {
      const m = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (m) vals[m[1].trim()] = m[2].trim();
      else if (keys[i] && !line.includes(':')) vals[keys[i]] = line;
    });
    const num = k => { const v = parseFloat(vals[k]); return Number.isFinite(v) ? v : null; };
    const tc = num('Total Cholesterol'), tg = num('Triglyceride');
    if (!vals['HDL- Cholesterol'] && tc != null) vals['HDL- Cholesterol'] = (tc / 4).toFixed(1);
    const hd = num('HDL- Cholesterol');
    if (!vals['VLDL- Cholesterol'] && tg != null) vals['VLDL- Cholesterol'] = (tg / 5).toFixed(1);
    const vl = num('VLDL- Cholesterol');
    if (!vals['LDL- Cholesterol'] && tc != null && hd != null && vl != null) vals['LDL- Cholesterol'] = (tc - hd - vl).toFixed(1);
    if (!vals['CHO/HDL ratio'] && tc != null && hd) vals['CHO/HDL ratio'] = (tc / hd).toFixed(2);
    if (refHead) refHead.hidden = true;
    body.innerHTML = keys.map((k, i) => `<tr><td>${k}</td><td><b>${vals[k] || 'Not supplied'}${i < 5 && vals[k] ? ' mg/dl' : ''}</b></td></tr>`).join('');
    refs.innerHTML = '<b>Reference Ranges</b><br>Total Cholesterol: &lt;240 mg/dl<br>HDL: &gt;60 mg/dl desirable<br>LDL: &lt;130 mg/dl desirable<br>Triglycerides: &lt;150 mg/dl desirable';
  } else if (data.test_name === 'SGPT & SGOT') {
    if (refHead) refHead.hidden = false;
    let pt = (data.sgpt_result || '').trim();
    let ot = (data.sgot_result || '').trim();
    if (!pt && !ot && data.test_result) {
      const parts = data.test_result.split(/\s*\|\s*|\s*[\/,]\s*/);
      pt = parts[0] || '';
      ot = parts[1] || '';
    }
    const formatLab = val => {
      if (!val || val === '-' || val === '—') return '—';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '—';
    };
    body.innerHTML = `
      <tr><td>SGPT</td><td><b>${formatLab(pt)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>
      <tr style="height:12px;"><td></td><td></td><td></td></tr>
      <tr><td>SGOT</td><td><b>${formatLab(ot)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>
    `;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGOT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgot_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '—') return '—';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '—';
    };
    body.innerHTML = `
      <tr><td>SGOT</td><td><b>${formatLab(res)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>
    `;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGPT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgpt_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '—') return '—';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '—';
    };
    body.innerHTML = `
      <tr><td>SGPT</td><td><b>${formatLab(res)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      <tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>
    `;
    refs.innerHTML = '';
  } else {
    if (refHead) refHead.hidden = false;
    let result = (data.test_result || '').trim();
    if (result && result !== '-' && result !== '—' && data.unit) {
      if (!new RegExp(`\\b${data.unit.replace('/', '\\/')}\\b`, 'i').test(result) && !/\b(i?u\/l|mg\/dl|g\/dl)\b/i.test(result)) {
        result += ' ' + data.unit;
      }
    }
    body.innerHTML = `<tr><td>${data.test_name || '—'}</td><td><b>${result || '—'}</b></td><td>${data.reference_range || '—'}</td></tr>`;
    refs.innerHTML = '';
  }
}

function reportFileName(data, ext, isNoLetterhead = false) {
  const clean = v => String(v || 'Report').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'Report';
  const suffix = isNoLetterhead ? '_No-Letterhead' : '';
  return `${clean(data.ref_no)}_${clean(data.test_name || 'Laboratory-Test')}${suffix}.${ext}`;
}

async function download(url, ext, extraData = {}) {
  const data = { ...collect(), ...extraData };
  if (!data.ref_no) {
    toast('Search a patient first');
    return;
  }
  if (!data.test_name || !data.test_result) {
    toast('Select a test and enter the result first');
    $('#test_result').focus();
    return;
  }
  const isNoLetterhead = !!extraData.noLetterhead;
  const filename = reportFileName(data, ext, isNoLetterhead);
  toast('Generating ' + filename + '...');
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) {
    toast('Export failed');
    return;
  }
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  toast(filename + ' downloaded');
}

$('#searchBtn').onclick = searchPatient;
$('#refSearch').onkeydown = e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchPatient();
  }
};
$('#test_name').onchange = updateTest;
$('#test_result').oninput = updatePreview;
$('#sgpt_result')?.addEventListener('input', updatePreview);
$('#sgot_result')?.addEventListener('input', updatePreview);
['lipid_total', 'lipid_triglyceride', 'lipid_hdl'].forEach(id => $('#' + id)?.addEventListener('input', updatePreview));
$$('#urineResults input').forEach(input => input.addEventListener('input', updatePreview));
$('#hba1c_result_input')?.addEventListener('input', updatePreview);

$('#resetHba1cBtn')?.addEventListener('click', () => {
  const el = $('#hba1c_result_input');
  if (el) el.value = '5.3%';
  updatePreview();
  toast('Reset to standard normal HbA1c (5.3%)');
});

const defaultUfrValues = {
  ufr_colour: 'Pale Yellow',
  ufr_appearance: 'Clear',
  ufr_specific_gravity: '1.015',
  ufr_ph: '6.0',
  ufr_glucose: 'Nil',
  ufr_protein: 'Nil',
  ufr_ketone: 'Nil',
  ufr_bilirubin: 'Nil',
  ufr_urobilinogen: '+ Normal',
  ufr_pus_cells: '+ 01 - 02 /hpf',
  ufr_red_cells: 'Nil',
  ufr_epithelial_cells: '+  A Few   /hpf',
  ufr_organisms: 'Nil',
  ufr_crystals: 'Nil',
  ufr_casts: 'Nil'
};

$('#resetUfrBtn')?.addEventListener('click', () => {
  Object.entries(defaultUfrValues).forEach(([k, v]) => {
    const el = $('#' + k);
    if (el) el.value = v;
  });
  updatePreview();
  toast('Reset to standard normal Urine Report values');
});

$('#reference_range').oninput = updatePreview;
$('#pdfBtn').onclick = () => download('/api/export/pdf', 'pdf');
$('#pdfPlainBtn').onclick = () => download('/api/export/pdf?letterhead=false', 'pdf', { noLetterhead: true });
$('#printPlainBtn').onclick = async () => {
  const data = { ...collect(), noLetterhead: true };
  if (!data.ref_no) { toast('Search a patient first'); return; }
  if (!data.test_name || !data.test_result) { toast('Select a test and enter the result first'); return; }
  try {
    const resp = await fetch('/api/export/pdf?letterhead=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) { const e = await resp.json(); toast('Error: ' + e.error); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) { win.onload = () => { win.focus(); win.print(); }; }
    else { toast('Allow popups to use print'); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch(e) { toast('Print failed: ' + e.message); }
};
$('#excelBtn').onclick = () => download('/api/export/excel', 'xlsx');
$('#clearAll').onclick = () => {
  if (confirm('Clear current patient and report?')) location.reload();
};

$('#copyBridge')?.addEventListener('click', async () => {
  try {
    const script = await fetch('/bridge.js').then(r => r.text());
    await navigator.clipboard.writeText(script);
    $('#copyStatus').textContent = 'Copied';
    setTimeout(() => $('#copyStatus').textContent = '', 2200);
  } catch (e) {
    $('#copyStatus').textContent = 'Copy failed; open /bridge.js manually';
  }
});

updatePreview();
