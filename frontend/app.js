
// ==========================================
// Repeated and Confirmed Detection & Control
// ==========================================
function checkIsResultHigh(testName, resultStr, sgptStr, sgotStr) {
  const parseNum = val => {
    if (!val) return null;
    const m = String(val).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : null;
  };
  const t = String(testName || '').trim();
  const num = parseNum(resultStr);

  if (/^(FBS|Fasting Blood Sugar)$/i.test(t)) {
    return num !== null && num > 115;
  }
  if (/^(RBS|Random Blood Sugar)$/i.test(t)) {
    return num !== null && num > 160;
  }
  if (/^(Total Cholesterol)$/i.test(t)) {
    return num !== null && num > 200;
  }
  if (/^(Serum Creatine|Serum Creatinine|Creatinine)$/i.test(t)) {
    return num !== null && num > 1.3;
  }
  if (/^(Total Bilirubin|Total Bilirubine)$/i.test(t)) {
    return num !== null && num > 1.2;
  }
  if (/^(Gamma GT|GGT)$/i.test(t)) {
    return num !== null && num > 40;
  }
  if (/^(SGPT)$/i.test(t)) {
    const val = parseNum(resultStr || sgptStr);
    return val !== null && val > 45;
  }
  if (/^(SGOT)$/i.test(t)) {
    const val = parseNum(resultStr || sgotStr);
    return val !== null && val > 35;
  }
  if (/^(SGPT & SGOT|SGPT &amp; SGOT)$/i.test(t)) {
    const pt = parseNum(sgptStr || (resultStr && resultStr.split('|')[0]));
    const ot = parseNum(sgotStr || (resultStr && resultStr.split('|')[1]));
    return (pt !== null && pt > 45) || (ot !== null && ot > 35);
  }
  if (/^(Haemoglobin A1C|HbA1c)$/i.test(t)) {
    return num !== null && num > 6.0;
  }
  return false;
}

let isManualConfirmToggled = false;
function autoEvaluateRepeatedConfirmed() {
  const confirmCheckbox = document.getElementById('enable_repeated_confirmed');
  const noteHidden = document.getElementById('result_note');
  const tName = $('#test_name')?.value || '';
  const rVal = $('#test_result')?.value || '';
  const ptVal = $('#sgpt_result')?.value || '';
  const otVal = $('#sgot_result')?.value || '';
  const isHigh = checkIsResultHigh(tName, rVal, ptVal, otVal);

  if (confirmCheckbox && !isManualConfirmToggled) {
    confirmCheckbox.checked = isHigh;
  }
  if (noteHidden) {
    noteHidden.value = (confirmCheckbox && confirmCheckbox.checked) ? '[Repeated and Confirmed]' : '';
  }
}

function syncDrugGrid() {
  const panelSelect = document.getElementById('drugPanelTypeSelect');
  const is12 = panelSelect ? panelSelect.value === '12' : false;
  const g12 = document.getElementById('drug12Grid');
  const opiField = document.getElementById('field_urine_drug_opi');
  if (g12) g12.style.display = is12 ? 'grid' : 'none';
  if (opiField) opiField.style.display = is12 ? 'none' : '';
}
window.syncDrugGrid = syncDrugGrid;

function handleDrugSelectChange(sel) {
  if (!sel) return;
  if (sel.value === 'Positive') {
    sel.style.backgroundColor = '#fee2e2';
    sel.style.color = '#dc2626';
    sel.style.borderColor = '#ef4444';
    sel.style.fontWeight = '700';
  } else {
    sel.style.backgroundColor = '#ffffff';
    sel.style.color = '#1e293b';
    sel.style.borderColor = '#cbd5e1';
    sel.style.fontWeight = '600';
  }
  if (typeof updatePreview === 'function') updatePreview();
}
window.handleDrugSelectChange = handleDrugSelectChange;
const defaults = {
  'FBS': ['fbs', '74 - 115 mg/dL'],
  'Fasting Blood Sugar': ['fbs', '74 - 115 mg/dL'],
  'Fasting': ['fbs', '74 - 115 mg/dL'],
  'RBS': ['rbs', '< 160 mg/dl'],
  'Total Cholesterol': ['cholesterol', '< 240 mg/dl'],
  'SGPT': ['sgpt', 'Upto 45 iu/l (Men) / Upto 34 iu/l (Women)'],
  'SGOT': ['sgot', 'Upto 35 iu/l (Men) / Upto 31 iu/l (Women)'],
  'SGPT & SGOT': ['sgpt', 'SGPT: Upto 45/34 iu/l | SGOT: Upto 35/31 iu/l'],
  'Lipid Profile': ['lipid_profile', 'See lipid profile reference ranges below'],
  'Total Bilirubine': ['bilirubin_qty', '0.4 - 1.2 mg/dl'],
  'Serum Creatine': ['creatinine', '0.6 - 1.3 mg/dL'],
  'Urine Full Report': ['urine_full_report', 'Standard Normal'],
  'Haemoglobin A1C': ['hba1c_result', 'See reference ranges below'],
  'Full Blood Count': ['fbc', 'See FBC reference ranges below'],
  'Total β - HCG Concentration': ['beta_hcg_fia', '< 5.00 mIU/mL'],
  'Total ? - HCG Concentration': ['beta_hcg_fia', '< 5.00 mIU/mL'],
  'BETA H.C.G.': ['beta_hcg_rapid', 'Negative'],
  'Type 10 B': ['type_10b', 'Medical Package (4 Reports)'],
  'Type 10 B with urine drug': ['type_10b_drug', 'Medical Package (5 Reports)'],
  'Urine Drug Screening': ['urine_drug', '12 Drugs (All Negative)'],
  'Urine Drug Screening (12 Drugs)': ['urine_drug_12', '12 Drugs (All Negative)'],
  'Urine Drug Screening (5 Drugs)': ['urine_drug_5', '5 Drugs (All Negative)'],
  'Type 7': ['type_7', 'Medical Package - Russia (4 Reports)'],
  'Tuberculosis Rapid Test': ['tb_test', 'Negative'],
  'Brucellosis Test': ['brucellosis_test', 'Negative'],
  'Gamma GT': ['gamma_gt', '5 - 40 U/L'],
  'Type 11': ['type11_pkg', 'Medical Package (5 Reports)'],
  'Shipping': ['shipping_pkg', 'Shipping Medical Package (14 Reports)'],
  'HIV Ag & Ab Test': ['hiv_test', 'Negative']
};

const units = {
  'FBS': 'mg/dL',
  'Fasting Blood Sugar': 'mg/dL',
  'Fasting': 'mg/dL',
  'RBS': 'mg/dL',
  'Total Cholesterol': 'mg/dL',
  'SGPT': 'iu/l',
  'SGOT': 'iu/l',
  'SGPT & SGOT': 'iu/l',
  'Lipid Profile': '',
  'Total Bilirubine': 'mg/dL',
  'Serum Creatine': 'mg/dL',
  'Urine Full Report': '',
  'Haemoglobin A1C': '%',
  'Full Blood Count': '',
  'Total β - HCG Concentration': 'mIU/mL',
  'Total ? - HCG Concentration': 'mIU/mL',
  'BETA H.C.G.': '',
  'Type 10 B': '',
  'Type 10 B with urine drug': '',
  'Urine Drug Screening': '',
  'Urine Drug Screening (12 Drugs)': '',
  'Urine Drug Screening (5 Drugs)': '',
  'Type 7': '',
  'Tuberculosis Rapid Test': '',
  'Brucellosis Test': '',
  'Gamma GT': 'U/L',
  'Type 11': '',
  'HIV Ag & Ab Test': ''
};

function getRandomSG() {
  const sgList = ['1.005', '1.010', '1.015', '1.020'];
  return sgList[Math.floor(Math.random() * sgList.length)];
}

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function cleanRefNo(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).trim();
  if (!s) return '';
  if (s.includes('/')) {
    const parts = s.split('/');
    s = parts[parts.length - 1].trim();
  } else if (s.includes('-')) {
    const parts = s.split('-');
    s = parts[parts.length - 1].trim();
  }
  const m = s.match(/^(?:MRD|PET|SYS)\s*(?:2\d)?[\/_\s-]*(\d+)/i);
  if (m && m[1]) return m[1];
  const digits = s.replace(/\D/g, '');
  return digits || s;
}

let currentPatientRecord = null;
let loadedCustomTests = [];
let loadedPackages = [];
let adminAuthToken = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : '') || '';
let cachedSecurityStatus = null;
let fullSecurityConfig = null;

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

let currentBranch = 'pettah'; // 'pettah' or 'colombo'

function getBranchMeta(branch) {
  const b = String(branch || '').toLowerCase();
  if (b === 'colombo' || b === 'sys') {
    return { id: 'colombo', label: 'Colombo', name: 'Colombo Branch', prefix: 'MRD' };
  }
  return { id: 'pettah', label: 'Pettah', name: 'Pettah Branch', prefix: 'PET' };
}

function updateAppBranchUI(branch, username, mode) {
  const meta = getBranchMeta(branch);
  currentBranch = meta.id;

  // 1. Topbar branch buttons
  const btnPettah = $('#tbBranchPettah');
  const btnColombo = $('#tbBranchColombo');
  if (btnPettah && btnColombo) {
    btnPettah.classList.toggle('active', currentBranch === 'pettah');
    btnColombo.classList.toggle('active', currentBranch === 'colombo');
  }

  // 2. Topbar eyebrow
  const eb = $('#topbarEyebrow');
  if (eb) eb.textContent = 'NEOSYS MEDICARE ? ' + meta.label.toUpperCase() + ' LABORATORY';

  // 3. Connection status badge - NO LOCAL MODE
  const badge = $('#connStatus');
  if (badge) {
    badge.innerHTML = '<span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:6px;"></span>' + meta.label + ' Online (' + (username || 'User') + ')';
    badge.className = 'conn-badge online';
  }

  // 4. Search card tags & hints
  const searchTag = $('#searchBranchTag');
  if (searchTag) searchTag.textContent = 'Live NeoSys ' + meta.label + ' Auto-Fetch';

  const searchHint = $('#searchHint');
  if (searchHint) searchHint.textContent = 'Patient summary fields and lab results (FBS, RBS, Cholesterol, SGPT, SGOT, Creatinine, etc.) are fetched automatically from ' + meta.label + ' branch.';

  const refInput = $('#refSearch');
  if (refInput) {
    refInput.placeholder = meta.id === 'colombo'
      ? 'Enter Reference No or Passport No (e.g. 04451)'
      : 'Enter Reference No or Passport No (e.g. 04444 or PET/04444)';
  }
}

function selectBranch(branch) {
  const meta = getBranchMeta(branch);
  currentBranch = meta.id;

  // Update tabs
  const tabPettah = $('#branchPettah');
  const tabColombo = $('#branchColombo');
  if (tabPettah && tabColombo) {
    tabPettah.classList.toggle('active', currentBranch === 'pettah');
    tabColombo.classList.toggle('active', currentBranch === 'colombo');
  }

  // Update login card labels & text
  const title = $('#loginTitle');
  const sub = $('#loginSubText');
  const userLabel = $('#loginUserLabel');
  const btnText = $('#loginBtnText');
  const loginForm = $('#loginForm');

  if (loginForm) loginForm.style.display = '';

  if (title) title.textContent = 'Sign In to ' + meta.label;
  if (sub) sub.textContent = 'Sign in to sync ' + meta.label + ' patient records and generate automated laboratory reports.';
  if (userLabel) userLabel.textContent = meta.label + ' NeoSys Username';
  if (btnText) btnText.textContent = 'Sign In to ' + meta.label + ' Branch';

  // Restore saved credentials for this branch
  const savedUser = localStorage.getItem('neosys-user-' + currentBranch) || '';
  const savedPass = localStorage.getItem('neosys-pass-' + currentBranch) || '';
  const uInput = $('#loginUser');
  const pInput = $('#loginPass');
  if (uInput) uInput.value = savedUser;
  if (pInput) pInput.value = savedPass;

  const errBox = $('#loginError');
  if (errBox) errBox.hidden = true;

  try { localStorage.setItem('neosys-branch', currentBranch); } catch {}
}

function switchBranch(targetBranch) {
  const meta = getBranchMeta(targetBranch);
  const targetId = meta.id;
  const login = $('#loginScreen');
  const app = $('#appShell');
  if (login && app) {
    app.hidden = true;
    login.hidden = false;
    selectBranch(targetId);
    toast('Please sign in to ' + meta.label + ' Branch');
  }
}
window.selectBranch = selectBranch;
window.switchBranch = switchBranch;

async function checkExistingSession() {
  try {
    const s = await fetch('/api/session').then(r => r.json());
    if (s.connected && s.username) {
      if (s.branch) currentBranch = s.branch;
      updateAppBranchUI(s.branch || currentBranch, s.username, 'neosys');
      openApp();
    } else {
      const login = $('#loginScreen');
      const app = $('#appShell');
      if (login && app) {
        login.hidden = false;
        app.hidden = true;
      }
      selectBranch(currentBranch);
    }
  } catch {}
}
checkExistingSession();

// ?? Eye button: show / hide password ??????????????????????????????????????
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

// ?? Dark / Light theme toggle ??????????????????????????????????????????????
(function () {
  const ls = document.getElementById('loginScreen');
  const btn = document.getElementById('loginThemeBtn');
  const DARK_CLASS = 'dark';
  const PREF_KEY = 'neosys-login-theme';

  function applyTheme(dark) {
    if (dark) {
      ls?.setAttribute('data-theme', 'dark');
      if (btn) btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span>Light Mode</span>';
    } else {
      ls?.removeAttribute('data-theme');
      if (btn) btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark Mode</span>';
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

// Restore saved branch on load
(function () {
  let saved;
  try { saved = localStorage.getItem('neosys-branch'); } catch {}
  selectBranch(saved === 'colombo' ? 'colombo' : 'pettah');
})();

$('#loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const user = $('#loginUser').value.trim();
  const pass = $('#loginPass').value;
  const remember = $('#loginRemember')?.checked ?? true;
  const btn = $('#loginBtn');
  const btnText = $('#loginBtnText');
  const errBox = $('#loginError');
  if (errBox) errBox.hidden = true;

  if (!user || !pass) {
    toast(`Enter NeoSys username and password for ${getBranchMeta(currentBranch).label}`);
    return;
  }

  btn.disabled = true;
  if (btnText) btnText.textContent = `Connecting to ${getBranchMeta(currentBranch).label}...`;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass, branch: currentBranch })
    });
    const data = await res.json();
    if (data.ok) {
      if (remember) {
        localStorage.setItem('neosys-user-' + currentBranch, user);
        localStorage.setItem('neosys-pass-' + currentBranch, pass);
      }
      openApp();
      updateAppBranchUI(data.branch || currentBranch, data.username, data.mode);
      toast(`Connected to NeoSys ${data.branchLabel || getBranchMeta(currentBranch).label} as ${data.username || user}`);
    } else {
      if (errBox) {
        if (data.locked) {
          errBox.innerHTML = `<strong>🔒 SYSTEM LOCKDOWN ACTIVE:</strong> ${data.error || 'System login is disabled by Administrator.'}`;
        } else {
          errBox.textContent = data.error || `NeoSys ${getBranchMeta(currentBranch).label} login failed. Check username and password.`;
        }
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
    if (btnText) btnText.textContent = `Sign In to ${getBranchMeta(currentBranch).label} Branch`;
  }
});

$('#logoutBtn')?.addEventListener('click', async () => {
  try { await fetch('/api/logout', { method: 'POST' }); } catch {}
  const login = $('#loginScreen');
  const app = $('#appShell');
  if (login && app) {
    app.hidden = true;
    login.hidden = false;
    selectBranch(currentBranch);
    toast('Logged out successfully');
  }
});

function collect() {
  const data = {};
  $$('#reportForm [name]').forEach(x => data[x.name] = x.value);
  const activeUser = localStorage.getItem('neosys-user-' + currentBranch) || 'Chathura';
  data.generatedBy = activeUser;
  data.branch = currentBranch;
  if (!data.full_name && currentPatientRecord) {
    const rawFull = (currentPatientRecord.full_name || currentPatientRecord.patient_name || `${currentPatientRecord.fname || ''} ${currentPatientRecord.lname || ''}`.trim()).replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i, '').trim();
    const gender = (currentPatientRecord.gender || data.gender || '').toLowerCase();
    const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
    data.full_name = prefix ? `${prefix} ${rawFull}` : rawFull;
  }
  if ((data.test_name === 'HIV Ag & Ab Test' || data.test_name === 'HIV') && data.full_name) {
    data.fname = data.full_name;
  }
  if (data.ref_no) data.ref_no = cleanRefNo(data.ref_no);
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
  if (data.test_name === 'Full Blood Count') {
    data.test_result = 'FULL BLOOD COUNT';
    if (!data.specimen || data.specimen === 'Urine') data.specimen = 'Blood';
    // Include differential count flag from checkbox
    const diffChk = $('#fbc_include_diff');
    data.fbc_include_diff = diffChk && diffChk.checked ? '1' : '0';
    if (window.h360RunTime) {
      data.run_time = window.h360RunTime;
    }
    if (window.h360TestTime) {
      data.test_time = window.h360TestTime;
    }
  }
  const nowGen = new Date();
  const currentGenTime = nowGen.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit' });
  if (!data.report_time || data.report_time === '11:08' || data.report_time.includes('undefined')) {
    data.report_time = currentGenTime;
  }
  if (data.test_name === 'Total ? - HCG Concentration' || data.test_name === 'Total β - HCG Concentration') {
    const conc = ($('#beta_hcg_conc_input')?.value || '< 5.00').trim();
    const status = $('#beta_hcg_status_select')?.value || 'Negative';
    const comment = ($('#beta_hcg_comment_input')?.value || 'Total β - HCG Level <5.00 - Negative for Pregnancy').trim();
    data.beta_hcg_conc = conc;
    data.beta_hcg_status = status;
    data.beta_hcg_comment = comment;
    data.test_result = `${conc} mIU/mL (${status})`;
    if (!data.specimen || data.specimen === 'Urine') data.specimen = 'Blood';
  }
  if (data.test_name === 'BETA H.C.G.') {
    const rapidRes = $('#beta_hcg_rapid_select')?.value || 'Negative';
    data.beta_hcg_rapid_result = rapidRes;
    data.test_result = rapidRes;
    if (!data.specimen || data.specimen === 'Urine') data.specimen = 'Blood';
  }
  if (data.test_name === 'Urine Drug Screening' || data.test_name.startsWith('Urine Drug Screening') || data.test_name === 'Type 10 B with urine drug') {
    data.specimen = 'Urine';
    const panelType = $('#drugPanelTypeSelect')?.value || '5';
    data.drug_panel_type = panelType;
    const drugs5 = ['amp', 'bzo', 'met', 'opi', 'thc'];
    const drugs12 = ['amp', 'bar', 'bzo', 'bup', 'coc', 'thc', 'mtd', 'met', 'mdma', 'mop', 'tml', 'tca'];
    const list = panelType === '12' ? drugs12 : drugs5;
    const drugMap = {};
    list.forEach(k => {
      const val = $(`#urine_drug_${k}`)?.value || 'Negative';
      data[`urine_drug_${k}`] = val;
      drugMap[k.toUpperCase()] = val;
    });
    const hasPos = Object.values(data).some(v => v === 'Positive');
    data.test_result = hasPos ? 'Positive' : 'Negative';
  }
  if (data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug') {
    data.test_result = data.test_name;
    data.diff_neutrophil = $('#type10b_diff_neutrophil')?.value.trim() || '45';
    data.diff_lymphocyte = $('#type10b_diff_lymphocyte')?.value.trim() || '46';
    data.diff_monocyte = $('#type10b_diff_monocyte')?.value.trim() || '06';
    data.diff_eosinophil = $('#type10b_diff_eosinophil')?.value.trim() || '03';
    data.diff_basophil = $('#type10b_diff_basophil')?.value.trim() || '00';
    data.gonorrhea_result = 'Negative';
    data.serology_hiv = $('#serology_hiv')?.value || 'Negative';
    data.serology_hba = $('#serology_hba')?.value || 'Negative';
    data.serology_hcv = $('#serology_hcv')?.value || 'Negative';
    data.serology_vdrl = $('#serology_vdrl')?.value || 'Non Reactive';
    data.serology_syphilis = $('#serology_syphilis')?.value || 'Negative';
  }
      
  if (data.test_name === 'Shipping' || data.report_type === 'Shipping') {
    data.test_name = 'Shipping';
    data.blood_alcohol = $('#shipping_blood_alcohol')?.value || 'Not Detected';
    data.crp = $('#shipping_crp')?.value || '< 06 mg/dL';
    data.esr = $('#shipping_esr')?.value || '03 mm/1hr';
    data.fbs = $('#shipping_fbs')?.value || '76 mg/dl';
    data.creatinine = $('#shipping_creatinine')?.value || '1.2 mg/dL';
    data.egfr = $('#shipping_egfr')?.value || '83 ml/min/1.73m2';
    data.syphilis = $('#shipping_syphilis')?.value || 'Negative';
    data.vdrl = $('#shipping_vdrl')?.value || 'Non Reactive';
    data.cholesterol = $('#shipping_cholesterol')?.value || '228 mg/dl';
    data.sgpt = $('#shipping_sgpt')?.value || '26 iu/l';
    data.sgot = $('#shipping_sgot')?.value || '30 iu/l';
    data.hba1c_result = $('#shipping_hba1c')?.value || '5.1%';
    data.hba1c = data.hba1c_result;
    data.hcv = $('#shipping_hcv')?.value || 'Negative';
    data.hbsag = $('#shipping_hbsag')?.value || 'Negative';
    data.hiv = $('#shipping_hiv')?.value || 'Negative';
  }

  if (data.test_name === 'Type 11') {
      data.specimen = 'Blood';
      data.fbs = $('#colombo_fbs')?.value || '75';
      data.sgpt = $('#colombo_sgpt')?.value || '10';
      data.sgot = $('#colombo_sgot')?.value || '13';
      data.gamma_gt = $('#colombo_gamma_gt')?.value || '18';
      data.cholesterol = $('#colombo_cholesterol')?.value || '176';
      data.hdl = $('#colombo_hdl')?.value || '44';
      data.ldl = $('#colombo_ldl')?.value || '112.4';
      data.vldl = $('#colombo_vldl')?.value || '19.6';
      data.triglyceride = $('#colombo_triglyceride')?.value || '98';
      data.cho_hdl = $('#colombo_cho_hdl')?.value || '4';
      data.test_result = 'Type 11';
    }

    if (data.test_name === 'Type 7') {
    data.test_result = 'Type 7 (Russia) Package';
    data.tb_result = $('#tb_result')?.value.trim() || 'Negative';
    data.brucellosis_result = $('#brucellosis_result')?.value.trim() || 'Negative';
    data.hiv_result = $('#hiv_result')?.value.trim() || 'Negative';
    if (!data.ufr_specific_gravity) {
      data.ufr_specific_gravity = getRandomSG();
    }
  }
  if (data.test_name === 'Tuberculosis Rapid Test') {
    const tbRes = $('#tb_result')?.value.trim() || data.test_result || 'Negative';
    data.tb_result = tbRes;
    data.test_result = tbRes;
    if (!data.specimen) data.specimen = 'Serum';
  }
  if (data.test_name === 'Brucellosis Test') {
    const bruRes = $('#brucellosis_result')?.value.trim() || data.test_result || 'Negative';
    data.brucellosis_result = bruRes;
    data.test_result = bruRes;
    if (!data.specimen) data.specimen = 'Serum';
  }
  if (data.test_name === 'HIV Ag & Ab Test') {
    const hivRes = $('#hiv_result')?.value.trim() || data.test_result || 'Negative';
    data.hiv_result = hivRes;
    data.test_result = hivRes;
    if (!data.specimen) data.specimen = 'Serum';
  }
  const customDef = loadedCustomTests.find(t => t.name === data.test_name);
  if (customDef) {
    let customVal = '';
    if (customDef.resultType === 'numeric') {
      customVal = $('#custom_test_result_input')?.value.trim() || '';
    } else {
      customVal = $('#custom_test_result_select')?.value.trim() || '';
    }
    if (!customVal && customDef.resultOptions && customDef.resultOptions[0]) {
      customVal = customDef.resultOptions[0];
    }
    data.custom_test_id = customDef.id;
    data.custom_test_result = customVal;
    data.test_result = customVal;
    if (customDef.specimen && !data.specimen) data.specimen = customDef.specimen;
    if (customDef.unit && !data.unit) data.unit = customDef.unit;
    if (customDef.referenceRange && !data.reference_range) data.reference_range = customDef.referenceRange;
  }

  // Package bundle data
  const selectedPkg = $('#report_type')?.value;
  if (selectedPkg && selectedPkg !== 'single') {
    const pkgObj = loadedPackages.find(p => p.name === selectedPkg || p.code === selectedPkg);
    if (pkgObj) {
      data.package_name = pkgObj.name;
      data.package_id = pkgObj.id;
      data.package_code = pkgObj.code;
      data.is_package = true;
      if (!data.test_name || data.test_name.startsWith('All Reports in')) {
        data.test_name = pkgObj.name;
      }
    }
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
    ['Reference No', cleanRefNo(record.ref_no) || record.ref_no],
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
  const mType = String(record.medical_type_name || record.medical_type || '').toLowerCase();
  const is10B = /\b10\s*b\b/i.test(mType) || mType.includes('type 10 b') || mType.includes('type 10b') || mType.includes('10b');
  const hasDrug = /drug|u\/drug/i.test(mType);

      if (record.package_name === 'Type 11' || record.package_name === 'Colombo Consultancy Package' || (record.ref_no && (record.ref_no.includes('5330') || record.ref_no.includes('5331')))) {
      picked = 'Type 11';
      const rType = $('#report_type');
      if (rType) {
        rType.value = 'Type 11';
        rType.dispatchEvent(new Event('change'));
      }
      if ($('#colombo_fbs')) $('#colombo_fbs').value = record.fbs || '75';
      if ($('#colombo_sgpt')) $('#colombo_sgpt').value = record.sgpt || '10';
      if ($('#colombo_sgot')) $('#colombo_sgot').value = record.sgot || '13';
      if ($('#colombo_gamma_gt')) $('#colombo_gamma_gt').value = record.gamma_gt || '18';
      if ($('#colombo_cholesterol')) $('#colombo_cholesterol').value = record.cholesterol || '176';
      if ($('#colombo_hdl')) $('#colombo_hdl').value = record.hdl || '44';
      if ($('#colombo_ldl')) $('#colombo_ldl').value = record.ldl || '112.4';
      if ($('#colombo_vldl')) $('#colombo_vldl').value = record.vldl || '19.6';
      if ($('#colombo_triglyceride')) $('#colombo_triglyceride').value = record.triglyceride || '98';
      if ($('#colombo_cho_hdl')) $('#colombo_cho_hdl').value = record.cho_hdl || '4';
      return;
    }

    if (record.panel_type || record.drugs) {
    if (is10B) {
      picked = 'Type 10 B with urine drug';
    } else {
      picked = 'Urine Drug Screening';
    }
    const pType = record.panel_type || '5';
    if ($('#drugPanelTypeSelect')) {
      $('#drugPanelTypeSelect').value = pType;
      $('#drugPanelTypeSelect').dispatchEvent(new Event('change'));
    }
    if (record.drugs) {
      Object.entries(record.drugs).forEach(([dName, dRes]) => {
        const shortKey = dName.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
        if (shortKey && $(`#urine_drug_${shortKey}`)) {
          $(`#urine_drug_${shortKey}`).value = String(dRes).trim() === 'Positive' ? 'Positive' : 'Negative';
        }
      });
    }
  } else if (is10B && hasDrug) picked = 'Type 10 B with urine drug';
  else if (is10B) picked = 'Type 10 B';
  else if (hasDrug) picked = 'Urine Drug Screening';
  else if (hasVal(record.fbs)) picked = 'FBS';
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
  setupUrineDrugListeners();
  }
}

function formatMrdDisplay(ref, rawRef) {
  const r = String(rawRef || ref || '').trim();
  if (!r) return '—';
  if (/^[A-Za-z]{3,4}\s*[\/_]/i.test(r)) return r;
  const clean = cleanRefNo(r) || r;
  return `MRD/${clean}`;
}


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

function setPatient(record) {
  currentPatientRecord = record;
  const cleanedRef = cleanRefNo(record.ref_no);
  const rawFullName = (record.full_name || record.patient_name || `${record.fname || ''} ${record.lname || ''}`.trim()).replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i, '').trim();
  const gender = (record.gender || '').toLowerCase();
  const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
  const formattedFullName = prefix ? `${prefix} ${rawFullName}` : rawFullName;

  const normalized = {
    ...record,
    fname: reportName(record),
    full_name: formattedFullName,
    lname: '',
    title: '',
    age: reportAge(record.age),
    medical_date: (window.isManualDateActive && window.manualSelectedDateFormatted)
      ? window.manualSelectedDateFormatted
      : (window.originalPatientDate = reportDate(record.medical_date || record.reg_date)),
    report_time: currentReportTime(record.medical_date || record.reg_date, cleanedRef || record.ref_no),
    passport_no: record.passport_no || '',
    ref_no: cleanedRef || record.ref_no || '',
    gender: record.gender || '',
    agency: record.agency_name || record.agency || '',
    specimen: record.specimen || 'Blood'
  };

  Object.entries(normalized).forEach(([k, v]) => setValue(k, v));
  const displayRefNo = formatMrdDisplay(cleanedRef || record.ref_no, record.raw_ref_no || record.ref_no);
  const refDisplayEl = document.querySelector('[data-show="ref_no"]');
  if (refDisplayEl) refDisplayEl.textContent = displayRefNo;

  $('#loadedBadge').textContent = 'Patient loaded';
  $('#loadedBadge').classList.add('loaded');
  $('#refSearch').value = cleanedRef || record.ref_no || '';
  if ($('#fbc_sync_sample_id')) {
    $('#fbc_sync_sample_id').value = cleanedRef || record.ref_no || record.sample_id || '';
  }
  $('#liveChoices').hidden = true;

  renderExtraPatientDetails(record);
  autoSelectLabTest(record);
  updatePreview();
  sendPatientToH360(true);
  // highlight removed
}

function showChoices(records) {
  const box = $('#liveChoices');
  box.innerHTML = '<label class="choice-label">Multiple patients found — select the correct reference</label><div class="choice-row"><select id="liveChoice">' +
    records.map((r, i) => `<option value="${i}">${r.ref_no || 'No Ref'} • ${r.fname || ''} ${r.lname || ''} • ${r.passport_no || ''} • ${r.medical_date || r.reg_date || ''}</option>`).join('') +
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
    // 1. Direct search endpoint: checks NeoSys live session for active branch first, then local DB
    const res = await fetch(`/api/patient/search?q=${encodeURIComponent(query)}&branch=${encodeURIComponent(currentBranch)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.records && data.records.length === 1) {
        setPatient(data.records[0]);
        toast(data.source === 'neosys' ? `Patient loaded from NeoSys (${getBranchMeta(currentBranch).label})` : 'Local patient details loaded');
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
  const isFbc = name === 'Full Blood Count';
  const isBetaHcgFia = name === 'Total ? - HCG Concentration' || name === 'Total β - HCG Concentration';
  const isBetaHcgRapid = name === 'BETA H.C.G.';
  const isType10B = name === 'Type 10 B' || name === 'Type 10 B with urine drug';
  const hasUrineDrug = name === 'Type 10 B with urine drug';
  const isUrineDrugOnly = name === 'Urine Drug Screening' || name === 'Urine Drug Screening (12 Drugs)' || name === 'Urine Drug Screening (5 Drugs)' || name.startsWith('Urine Drug');
  const isType7 = name === 'Type 7';
  const isType11 = name === 'Type 11' || name === 'Type 11 Medical Package' || name === 'Colombo Consultancy Package';
  const isColomboPkg = name === 'Type 11' || name === 'Colombo Consultancy Package';
  const selectedPkg = $('#report_type')?.value;
  const isShipping = name === 'Shipping' || name === 'Type 12 - 1 (Shipping)' || name === 'Type 12 - 1' || (selectedPkg === 'Shipping');
  const isTbOnly = name === 'Tuberculosis Rapid Test';
  const isBrucellosisOnly = name === 'Brucellosis Test';
  const isHivOnly = name === 'HIV Ag & Ab Test';
  const customAdminDef = loadedCustomTests.find(t => t.name === name);
  const isCustomAdminTest = !!customAdminDef;

  $('#reportForm [name="unit"]').value = unit;
  $('#unit_display').value = unit || '';
  $('#test_result').value = (isUrineDrugOnly ? 'All Negative' : (isTbOnly || isBrucellosisOnly || isHivOnly ? 'Negative' : ''));
  $('#test_result').classList.toggle('multi-result', name === 'Lipid Profile');
  $('#splitResults').hidden = name !== 'SGPT & SGOT';
  $('#lipidResults').hidden = name !== 'Lipid Profile';
  const repeatedWrap = $('#repeatedConfirmedWrap');
  if (repeatedWrap) {
    repeatedWrap.hidden = ['Urine Full Report', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)', 'Type 7', 'Type 11', 'Shipping'].includes(name);
  }
  isManualConfirmToggled = false; // reset manual override when test changes
  autoEvaluateRepeatedConfirmed();
  $('#test_result').hidden = ['SGPT & SGOT', 'Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)', 'Type 7', 'Type 11', 'Shipping'].includes(name) || isCustomAdminTest;

  // UFR, HbA1c, FBC, HCG, Type 7 & Custom Admin test inputs display toggling
  const ufrBox = $('#urineResults');
  if (ufrBox) ufrBox.hidden = !isUfr;
  const hba1cBox = $('#hba1cResults');
  if (hba1cBox) hba1cBox.hidden = !isHba1c;
  const fbcBox = $('#fbcResults');
  if (fbcBox) fbcBox.hidden = !isFbc;
  const fiaBox = $('#betaHcgFiaResults');
  if (fiaBox) fiaBox.hidden = !isBetaHcgFia;
  const rapidBox = $('#betaHcgRapidResults');
  if (rapidBox) rapidBox.hidden = !isBetaHcgRapid;
  const type10bBox = $('#type10bResults');
  if (type10bBox) type10bBox.hidden = !isType10B;
  const type7Box = $('#type7Results');
  if (type7Box) type7Box.hidden = !isType7;
  const colomboBox = $('#colomboResults');
  if (colomboBox) colomboBox.hidden = !isColomboPkg;
  const shippingBox = $('#shippingResults');
  if (shippingBox) shippingBox.hidden = !isShipping;
  const customBox = $('#customTestResults');
  if (customBox) customBox.hidden = !isCustomAdminTest;
  const pkgDrugPill = $('#pkgDrugPill');
  if (pkgDrugPill) pkgDrugPill.hidden = !hasUrineDrug;
  const type10bDrugCard = $('#type10bDrugCard');
  if (type10bDrugCard) type10bDrugCard.hidden = !hasUrineDrug;
  const prevDrugCard = $('#type10bPrevDrugCard');
  if (prevDrugCard) prevDrugCard.hidden = !hasUrineDrug;

  if (isCustomAdminTest) {
    if ($('#customTestTitleDisplay')) $('#customTestTitleDisplay').textContent = (customAdminDef.testLabel || customAdminDef.name).toUpperCase();
    if ($('#customTestCategoryBadge')) $('#customTestCategoryBadge').textContent = `Category: ${customAdminDef.category || 'Custom'} | Method: ${customAdminDef.method || 'Rapid Test'}`;
    if (customAdminDef.resultType === 'numeric') {
      if ($('#customTestSelectWrap')) $('#customTestSelectWrap').hidden = true;
      if ($('#customTestInputWrap')) $('#customTestInputWrap').hidden = false;
    } else {
      if ($('#customTestInputWrap')) $('#customTestInputWrap').hidden = true;
      if ($('#customTestSelectWrap')) $('#customTestSelectWrap').hidden = false;
      const selectEl = $('#custom_test_result_select');
      if (selectEl) {
        const opts = (customAdminDef.resultOptions && customAdminDef.resultOptions.length) ? customAdminDef.resultOptions : ['Negative', 'Positive'];
        selectEl.innerHTML = opts.map((opt, i) => `<option value="${opt}" ${i === 0 ? 'selected' : ''}>${opt}</option>`).join('');
      }
    }
    if ($('#customTestMethodText')) $('#customTestMethodText').innerHTML = `<strong>Method:</strong> ${customAdminDef.method || 'Immunochromatography'}`;
    if ($('#customTestRefText')) $('#customTestRefText').innerHTML = customAdminDef.referenceRange ? `<strong>Ref:</strong> ${customAdminDef.referenceRange}` : '';
    if ($('#customTestSpecimenText')) $('#customTestSpecimenText').innerHTML = `<strong>Specimen:</strong> ${customAdminDef.specimen || 'Blood'}`;
    if (customAdminDef.specimen && $('#specimen')) $('#specimen').value = customAdminDef.specimen;
    if (customAdminDef.unit && $('#unit_display')) $('#unit_display').value = customAdminDef.unit;
    if (customAdminDef.referenceRange && $('#reference_range')) $('#reference_range').value = customAdminDef.referenceRange;
  }

  if (isType7 || isUfr) {
    if ($('#ufr_specific_gravity')) $('#ufr_specific_gravity').value = getRandomSG();
  }

  if (isType10B) {
    if ($('#type10bTitle')) $('#type10bTitle').textContent = hasUrineDrug ? 'Type 10 B with Urine Drug Medical Package' : 'Type 10 B Medical Package';
    if ($('#type10bDesc')) $('#type10bDesc').textContent = hasUrineDrug
      ? 'Auto-generates 5-sheet Excel report: Gonorrhea, Urine Full Report, Differential Count, Serology, and Urine Drug Screening (12 Drugs).'
      : 'Auto-generates 4-sheet Excel report: Gonorrhea, Urine Full Report, Differential Count, and Serology.';
  }

  const showDrugInputs = isUrineDrugOnly || (isType10B && hasUrineDrug);
  if (showDrugInputs) {
    const spec = $('#specimen');
    if (spec) spec.value = 'Urine';
    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = false;
    syncDrugGrid();
  } else {
    if ($('#urineDrugResults')) $('#urineDrugResults').hidden = true;
  }

  const isCustomPkgTest = !!(loadedPackages.find(p => !p.isBuiltin && (p.name === name || p.code === name)));
  const isCustomTest = isUfr || isHba1c || isFbc || isBetaHcgFia || isBetaHcgRapid || isType10B || isType7 || isType11 || isUrineDrugOnly || isCustomAdminTest || isCustomPkgTest;
  const regField = $('#regularResultField');
  if (regField) regField.hidden = isCustomTest;
  const unitField = $('#unitField');
  if (unitField) unitField.hidden = isCustomTest;
  const refField = $('#referenceRangeField');
  if (refField) refField.hidden = isCustomTest;

  if (isHba1c && !$('#hba1c_result_input')?.value) {
    if ($('#hba1c_result_input')) $('#hba1c_result_input').value = '5.3%';
  }

  if (isBetaHcgFia && !$('#beta_hcg_conc_input')?.value) {
    if ($('#beta_hcg_conc_input')) $('#beta_hcg_conc_input').value = '< 5.00';
    if ($('#beta_hcg_status_select')) $('#beta_hcg_status_select').value = 'Negative';
    if ($('#beta_hcg_comment_input')) $('#beta_hcg_comment_input').value = 'Total ? - HCG Level <5.00 - Negative for Pregnancy';
  }

  if (isBetaHcgRapid && !$('#beta_hcg_rapid_select')?.value) {
    if ($('#beta_hcg_rapid_select')) $('#beta_hcg_rapid_select').value = 'Negative';
  }

  if (isFbc) {
    syncFromH360(false);
  }

  // Specimen toggle: Urine only for UFR, Blood for all others (including both HCG tests)
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

let previewDebounceTimer = null;
function debouncedUpdatePreview(delay = 60) {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    updatePreview();
  }, delay);
}

function updatePreview() {
  const data = collect();
  const hasPatient = !!(data.ref_no || data.fname || data.passport_no);
  const hasTest = !!data.test_name;
  const shouldShow = hasTest || hasPatient;

  const emptyEl = $('#previewEmpty');
  const previewEl = $('#reportPreview');
  if (emptyEl) emptyEl.hidden = shouldShow;
  if (previewEl) previewEl.hidden = !shouldShow;

  $$('[data-preview]').forEach(el => {
    const k = el.dataset.preview;
    if (k !== 'test_result' && k !== 'reference_range') el.textContent = data[k] || '—';
  });

  // Always format Ref. No in preview with MRD/ prefix for clear clinic verification
  $$('[data-preview="ref_no"]').forEach(el => {
    const rawR = currentPatientRecord?.raw_ref_no || currentPatientRecord?.ref_no;
    const r = data.ref_no || rawR;
    el.textContent = r ? formatMrdDisplay(r, rawR) : '—';
  });

  const isHivTest = (data.test_name === 'HIV Ag & Ab Test' || data.test_name === 'HIV');
  const resolvedHivFullName = data.full_name || (currentPatientRecord && (currentPatientRecord.full_name || currentPatientRecord.patient_name)) || data.fname;
  $$('[data-preview="fname"]').forEach(el => {
    el.textContent = isHivTest ? (resolvedHivFullName || '—') : (data.fname || '—');
  });

  if (data.test_name) {
    $$('[data-preview="test_name"]').forEach(el => {
      if (data.test_name === 'Urine Full Report') {
        el.textContent = 'URINE FULL REPORT';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'Haemoglobin A1C') {
        el.textContent = 'HAEMOGLOBIN A1C';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'Full Blood Count') {
        el.textContent = 'FULL BLOOD COUNT';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'Total ? - HCG Concentration' || data.test_name === 'Total β - HCG Concentration') {
        el.textContent = 'TOTAL β - HCG CONCENTRATION';
        el.style.textDecoration = 'underline';
      } else if (data.test_name === 'BETA H.C.G.') {
        el.textContent = 'BETA H.C.G.';
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
  const _isCustomPkgCheck = !!(loadedPackages.find(p => !p.isBuiltin && (p.name === data.test_name || p.code === data.test_name)));
  const hasNote = !!(data.result_note && String(data.result_note).trim() !== '');
  if (confirm) confirm.hidden = !hasNote || _isCustomPkgCheck || ['Lipid Profile', 'Urine Full Report', 'Haemoglobin A1C', 'Full Blood Count', 'SGPT', 'SGOT', 'SGPT & SGOT', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);
  if (methodLine) methodLine.hidden = _isCustomPkgCheck || ['Urine Full Report', 'Haemoglobin A1C', 'Total ? - HCG Concentration', 'Total β - HCG Concentration', 'BETA H.C.G.', 'Type 10 B', 'Type 10 B with urine drug', 'Urine Drug Screening', 'Urine Drug Screening (12 Drugs)', 'Urine Drug Screening (5 Drugs)'].includes(data.test_name);
  if (!body) return;

  const regTableWrap = $('#regularTableWrap');
  const fbcWrap = $('#fbcPreviewContainer');
  const type10bWrap = $('#type10bPreviewContainer');
  const paperTitle = $('#paperTitle');
  const fbcPaperMeta = $('#fbcPaperMeta');
  const fbcHeaderDivider = $('#fbcHeaderDivider');
  const stdPaperMeta = $('#standardPaperMeta');
  const stdTestTitle = $('#standardTestTitle');
  const endReport = $('.end-report');

  // Detect custom packages
  const matchedCustomPkg = loadedPackages.find(p => !p.isBuiltin && (p.name === data.test_name || p.code === data.test_name));
  const isCustomPkg = !!matchedCustomPkg;

  const isType10B = data.test_name === 'Type 10 B' || data.test_name === 'Type 10 B with urine drug';
  const isType7 = data.test_name === 'Type 7';
  const isType11Preview = data.test_name === 'Type 11' || data.test_name === 'Colombo Consultancy Package';
  const isShippingPreview = data.test_name === 'Shipping' || data.report_type === 'Shipping' || data.test_name === 'Type 12 - 1 (Shipping)' || data.test_name === 'Type 12 - 1';
  const isAnyPkg = isType10B || isType7 || isType11Preview || isShippingPreview || isCustomPkg;
  if (type10bWrap) type10bWrap.hidden = !isType10B;
  const type7Wrap = $('#type7PreviewContainer');
  if (type7Wrap) type7Wrap.hidden = !isType7;
  const type11Wrap = $('#type11PreviewContainer');
  if (type11Wrap) type11Wrap.hidden = !isType11Preview;
  const shippingWrap = $('#shippingPreviewContainer');
  if (shippingWrap) shippingWrap.hidden = !isShippingPreview;
  const customPkgWrap = $('#customPackagePreviewContainer');
  if (customPkgWrap) customPkgWrap.hidden = !isCustomPkg;

  if (data.test_name !== 'Full Blood Count') {
    if (paperTitle) {
      paperTitle.textContent = 'Laboratory Report';
      paperTitle.classList.remove('fbc-title');
    }
    if (fbcPaperMeta) fbcPaperMeta.hidden = true;
    if (fbcHeaderDivider) fbcHeaderDivider.hidden = true;
    if (stdPaperMeta) stdPaperMeta.hidden = false;
    if (stdTestTitle) {
      if (data.test_name === 'Urine Drug Screening') {
        stdTestTitle.textContent = 'URINE DRUG SCREENING TEST';
      } else if (isType7) {
        stdTestTitle.textContent = 'TYPE 7 (RUSSIA) MEDICAL PACKAGE';
      } else if (isCustomPkg) {
        stdTestTitle.textContent = (matchedCustomPkg.name || data.test_name).toUpperCase();
      } else if (!isType10B) {
        const customDef = loadedCustomTests.find(t => t.name === data.test_name);
        stdTestTitle.textContent = (customDef ? (customDef.testLabel || customDef.name) : (data.test_name || '')).toUpperCase();
      }
    }
    if (regTableWrap) regTableWrap.hidden = isAnyPkg;
    if (fbcWrap) fbcWrap.hidden = true;
    if (methodLine && !methodLine.hidden) {
      const customDef = loadedCustomTests.find(t => t.name === data.test_name);
      methodLine.textContent = customDef ? (customDef.method ? `(Test Method - ${customDef.method})` : '') : '[Test Method - Erba Mannheim Fully Auto Analyzer]';
      if (customDef && !customDef.method) methodLine.hidden = true;
    }
    if (endReport) endReport.hidden = isAnyPkg;
  }

  
  // ── Shipping Preview Cards ───────────────────────────────────────────
  if (isShippingPreview) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setT('shipPrevAlcohol', $('#shipping_blood_alcohol')?.value || data.blood_alcohol || 'Not Detected');
    setT('shipPrevCrp', $('#shipping_crp')?.value || data.crp || '< 06 mg/dL');
    setT('shipPrevEsr', $('#shipping_esr')?.value || data.esr || '03 mm/1hr');
    setT('shipPrevFbs', $('#shipping_fbs')?.value || data.fbs || '76 mg/dl');
    setT('shipPrevCreatinine', $('#shipping_creatinine')?.value || data.creatinine || '1.2 mg/dL');
    setT('shipPrevEgfr', $('#shipping_egfr')?.value || data.egfr || '83 ml/min/1.73m2');
    setT('shipPrevSyphilis', $('#shipping_syphilis')?.value || data.syphilis || 'Negative');
    setT('shipPrevVdrl', $('#shipping_vdrl')?.value || data.vdrl || 'Non Reactive');
    setT('shipPrevChol', $('#shipping_cholesterol')?.value || data.cholesterol || '228 mg/dl');
    setT('shipPrevSgpt', $('#shipping_sgpt')?.value || data.sgpt || '26 iu/l');
    setT('shipPrevSgot', $('#shipping_sgot')?.value || data.sgot || '30 iu/l');
    setT('shipPrevHba1c', $('#shipping_hba1c')?.value || data.hba1c || '5.1%');
    setT('shipPrevHcv', $('#shipping_hcv')?.value || data.hcv || 'Negative');
    setT('shipPrevHbsag', $('#shipping_hbsag')?.value || data.hbsag || 'Negative');
    setT('shipPrevHiv', $('#shipping_hiv')?.value || data.hiv || 'Negative');
  }

  // ── Type 11 / Colombo Consultancy Preview Cards ───────────────────────────
  if (isType11Preview) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setT('type11PrevFbs', data.colombo_fbs ? data.colombo_fbs + ' mg/dL' : '');
    setT('type11PrevSgpt', data.colombo_sgpt ? 'SGPT: ' + data.colombo_sgpt + ' iu/l' : '');
    setT('type11PrevSgot', data.colombo_sgot ? 'SGOT: ' + data.colombo_sgot + ' iu/l' : '');
    setT('type11PrevGgt', data.colombo_gamma_gt ? data.colombo_gamma_gt + ' U/L' : '');
    setT('type11PrevChol', data.colombo_cholesterol ? data.colombo_cholesterol + ' mg/dL' : '');
    setT('type11PrevHdl', data.colombo_hdl ? data.colombo_hdl + ' mg/dL' : '');
    setT('type11PrevLdl', data.colombo_ldl ? data.colombo_ldl + ' mg/dL' : '');
    setT('type11PrevTrig', data.colombo_triglyceride ? data.colombo_triglyceride + ' mg/dL' : '');
  }

  // ── Custom Package Preview Cards ──────────────────────────────────────────
  if (isCustomPkg && matchedCustomPkg) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;

    const titleEl = document.getElementById('customPkgPrevTitle');
    const countEl = document.getElementById('customPkgPrevCount');
    const grid = document.getElementById('customPkgPrevGrid');
    if (titleEl) titleEl.textContent = matchedCustomPkg.name;
    if (countEl) countEl.textContent = (matchedCustomPkg.tests || []).length;

    if (grid) {
      const pkgTests = matchedCustomPkg.tests || [];
      // Helper: build simple card html for each test in the package
      const cardIconMap = {
        'Urine Full Report': { sheet: 'UFR', icon: '🧪', color: '#0ea5e9' },
        'Full Blood Count': { sheet: 'FBC', icon: '🩸', color: '#dc2626' },
        'Differential Count': { sheet: 'FBC Diff', icon: '🩸', color: '#be185d' },
        'Serology': { sheet: 'Serology', icon: '🔬', color: '#7c3aed' },
        'Gonorrhea': { sheet: 'Gonorrhea', icon: '🔬', color: '#d97706' },
        'Urine Drug Screening': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },
        'Urine Drug Screening (12 Drugs)': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },
        'Urine Drug Screening (5 Drugs)': { sheet: 'Urine Drug', icon: '💊', color: '#dc2626' },
        'Tuberculosis Rapid Test': { sheet: 'TB', icon: '🫁', color: '#b45309' },
        'Brucellosis Test': { sheet: 'Brucellosis', icon: '🧫', color: '#1d4ed8' },
        'HIV Ag & Ab Test': { sheet: 'HIV', icon: '🔴', color: '#dc2626' },
        'FBS': { sheet: 'Lab Report', icon: '🩺', color: '#059669' },
        'RBS': { sheet: 'Lab Report', icon: '🩺', color: '#059669' },
        'Lipid Profile': { sheet: 'Lab Report', icon: '🩺', color: '#0891b2' },
        'Total Cholesterol': { sheet: 'Lab Report', icon: '🩺', color: '#0891b2' },
        'SGPT': { sheet: 'Lab Report', icon: '🩺', color: '#16a34a' },
        'SGOT': { sheet: 'Lab Report', icon: '🩺', color: '#16a34a' },
        'SGPT & SGOT': { sheet: 'Lab Report', icon: '🩺', color: '#16a34a' },
        'Serum Creatine': { sheet: 'Lab Report', icon: '🩺', color: '#7c3aed' },
        'Total Bilirubine': { sheet: 'Lab Report', icon: '🩺', color: '#ca8a04' },
        'Haemoglobin A1C': { sheet: 'Lab Report', icon: '🩺', color: '#be185d' },
        'Total β - HCG Concentration': { sheet: 'Lab Report', icon: '🤰', color: '#db2777' },
        'BETA H.C.G.': { sheet: 'Lab Report', icon: '🤰', color: '#db2777' },
      };

      const fullName = data.full_name || (currentPatientRecord && (currentPatientRecord.full_name || currentPatientRecord.patient_name)) || data.fname || '';
      const sgVal = data.ufr_specific_gravity || '1.015';
      const tbVal = data.tb_result || 'Negative';
      const bruVal = data.brucellosis_result || 'Negative';
      const hivVal = data.hiv_result || 'Negative';

      let medDate = data.medical_date || '';
      let bruDate = medDate;
      try {
        const parts = String(medDate).split(/[-/]/);
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          d.setDate(d.getDate() + 1);
          bruDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
      } catch {}

      const cardsHtml = pkgTests.map((testName, sheetIdx) => {
        const info = cardIconMap[testName] || { sheet: 'Lab Report', icon: '🧬', color: '#6366f1' };
        let detailsHtml = '';

        if (testName === 'Urine Full Report') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Specific Gravity:</b><span style="color:#2563eb;font-weight:700;">${sgVal}</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Glucose / Protein:</b><span>Nil / Nil</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Pus Cells:</b><span>+ 01-02/hpf</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Specimen: Urine</div>`;
        } else if (testName === 'Tuberculosis Rapid Test') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">${tbVal}</b></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">(Immunochromatography)</div>`;
        } else if (testName === 'Brucellosis Test') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">${bruVal}</b></div>
            <div style="display:flex;justify-content:space-between;"><b>Date:</b><span style="color:#2563eb;font-weight:700;">${bruDate || 'Date+1 Day'}</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">(Immunochromatography)</div>`;
        } else if (testName === 'HIV Ag & Ab Test') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">${hivVal}</b></div>
            <div style="display:flex;justify-content:space-between;"><b>Name:</b><span style="color:#1e40af;font-weight:700;">${fullName || '—'}</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">(Ag-Ab Immunochromatography)</div>`;
        } else if (testName === 'FBS' || testName === 'RBS') {
          const fbsVal = data.test_result || (currentPatientRecord && (currentPatientRecord.fbs || currentPatientRecord.rbs)) || '';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Blood Sugar:</b><b style="color:#059669;">${fbsVal || '—'} mg/dL</b></div>
            <div style="display:flex;justify-content:space-between;"><b>Ref Range:</b><span>${testName==='FBS'?'74-115':'&lt;160'} mg/dL</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Specimen: Blood</div>`;
        } else if (testName === 'Lipid Profile') {
          const tc = data.lipid_total || '';
          const tg = data.lipid_triglyceride || '';
          const hdl = data.lipid_hdl || '';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Total Cholesterol:</b><span>${tc || '—'} mg/dL</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Triglyceride:</b><span>${tg || '—'} mg/dL</span></div>
            <div style="display:flex;justify-content:space-between;"><b>HDL-C:</b><span>${hdl || '—'} mg/dL</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Full Lipid Panel in Excel</div>`;
        } else if (testName === 'SGPT' || testName === 'SGOT' || testName === 'SGPT & SGOT') {
          const sgptVal = data.sgpt_result || data.test_result || (currentPatientRecord && currentPatientRecord.sgpt) || '';
          const sgotVal = data.sgot_result || (currentPatientRecord && currentPatientRecord.sgot) || '';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>SGPT:</b><span>${sgptVal || '—'} iu/l</span></div>
            <div style="display:flex;justify-content:space-between;"><b>SGOT:</b><span>${sgotVal || '—'} iu/l</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Liver Function Test</div>`;
        } else if (testName === 'Serum Creatine') {
          const crVal = currentPatientRecord && currentPatientRecord.creatinine || data.test_result || '';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Creatinine:</b><span>${crVal || '—'} mg/dL</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Ref Range:</b><span>0.6-1.3 mg/dL</span></div>`;
        } else if (testName === 'Gonorrhea') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Organism:</b><span>Neisseria Gonorrhoeae</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Specimen:</b><span>HVS</span></div>`;
        } else if (testName === 'Serology') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>VDRL:</b><span>Non Reactive</span></div>
            <div style="display:flex;justify-content:space-between;"><b>TPHA:</b><span>Negative</span></div>
            <div style="display:flex;justify-content:space-between;"><b>HBsAg:</b><span>Negative</span></div>
            <div style="display:flex;justify-content:space-between;"><b>HCV:</b><span>Negative</span></div>`;
        } else if (testName === 'Differential Count') {
          const neut = data.type10b_diff_neutrophil || data.diff_neutrophil || '45';
          const lymp = data.type10b_diff_lymphocyte || data.diff_lymphocyte || '46';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Neutrophil:</b><span>${neut}%</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Lymphocyte:</b><span>${lymp}%</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">See Excel for full count</div>`;
        } else if (testName === 'Urine Drug Screening') {
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Panel:</b><span>12 Drugs</span></div>
            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">All Negative</b></div>`;
        } else {
          // Generic custom test
          const resVal = data.test_result || '';
          detailsHtml = `
            <div style="display:flex;justify-content:space-between;"><b>Result:</b><b style="color:#059669;">${resVal || '—'}</b></div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">See Excel for full report</div>`;
        }

        return `
          <div class="type10b-preview-card">
            <div class="type10b-preview-card-head">
              <h5>${testName.toUpperCase()}</h5>
              <span class="sheet-tag">Sheet ${sheetIdx+1}: ${info.sheet}</span>
            </div>
            <div style="font-size:12.5px; line-height:1.6;">
              ${detailsHtml}
            </div>
          </div>`;
      }).join('');

      grid.innerHTML = cardsHtml;
    }
  }

  if (isType7) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    if (type10bWrap) type10bWrap.hidden = true;

    // Calculate Brucellosis Date = medical_date + 1 day
    let bruDateStr = data.medical_date || '2026-10-29';
    try {
      const parts = String(data.medical_date || '').split(/[-/]/);
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + 1);
        bruDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {}

    const bruDateEl = $('#type7BrucellosisDate') || $('#type7PrevBruDate');
    if (bruDateEl) bruDateEl.textContent = bruDateStr;

    // Full Name for HIV
    const hivNameEl = $('#type7HivFullName') || $('#type7PrevHivName');
    if (hivNameEl) {
      const rawFull = data.full_name || (currentPatientRecord && (currentPatientRecord.full_name || currentPatientRecord.patient_name)) || data.fname;
      hivNameEl.textContent = rawFull || '—';
    }

    const sgVal = data.ufr_specific_gravity || '1.015';
    const tbVal = data.tb_result || 'Negative';
    const bruVal = data.brucellosis_result || 'Negative';
    const hivVal = data.hiv_result || 'Negative';

    if ($('#type7_prev_sg')) $('#type7_prev_sg').textContent = sgVal;
    if ($('#type7PrevSG')) $('#type7PrevSG').textContent = sgVal;
    if ($('#type7_prev_tb')) $('#type7_prev_tb').textContent = tbVal;
    if ($('#type7PrevTb')) $('#type7PrevTb').textContent = tbVal;
    if ($('#type7_prev_bru')) $('#type7_prev_bru').textContent = bruVal;
    if ($('#type7PrevBru')) $('#type7PrevBru').textContent = bruVal;
    if ($('#type7_prev_hiv')) $('#type7_prev_hiv').textContent = hivVal;
    if ($('#type7PrevHiv')) $('#type7PrevHiv').textContent = hivVal;
  }

  if (isType10B) {
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = true;
    if (stdTestTitle) stdTestTitle.textContent = data.test_name.toUpperCase();
    if ($('#type10bPrevNeut')) $('#type10bPrevNeut').textContent = (data.diff_neutrophil || '45') + ' %';
    if ($('#type10bPrevLym')) $('#type10bPrevLym').textContent = (data.diff_lymphocyte || '46') + ' %';
    if ($('#type10bPrevMono')) $('#type10bPrevMono').textContent = (data.diff_monocyte || '06') + ' %';
    if ($('#type10bPrevEos')) $('#type10bPrevEos').textContent = (data.diff_eosinophil || '03') + ' %';
    if ($('#type10bPrevBaso')) $('#type10bPrevBaso').textContent = (data.diff_basophil || '00') + ' %';
    const prevDrugCard = $('#type10bPrevDrugCard');
    if (prevDrugCard) prevDrugCard.hidden = data.test_name !== 'Type 10 B with urine drug';
  }

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
      `<tr><td style="font-weight:normal; width:45%;">${label}</td><td style="font-weight:normal;"><span style="display:inline-block; width:22px;">_</span> ${res}</td></tr>`
    ).join('');

    html += `<tr><td colspan="2" style="font-weight:bold; text-decoration:underline; padding-top:14px; font-size:1.05em; color:var(--text, #0f172a);">Centrifuged Urine Microscopy</td></tr>`;

    html += microscopyRows.map(([label, res]) =>
      `<tr><td style="font-weight:normal; width:45%;">${label}</td><td style="font-weight:normal;"><span style="display:inline-block; width:22px;">_</span> ${res}</td></tr>`
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
        <div>Analyzer -HemoCue? HbA1c 501</div>
        <div>(Test Method - Fluorescence Immunoassay (FIA))</div>
      </div>
    `;
  } else if (data.test_name === 'Full Blood Count') {
    if (paperTitle) {
      paperTitle.textContent = 'Hematology Analysis Report';
      paperTitle.classList.add('fbc-title');
    }
    if (fbcPaperMeta) fbcPaperMeta.hidden = false;
    if (fbcHeaderDivider) fbcHeaderDivider.hidden = false;
    if (stdPaperMeta) stdPaperMeta.hidden = true;
    if (stdTestTitle) stdTestTitle.hidden = true;
    if (regTableWrap) regTableWrap.hidden = true;
    if (fbcWrap) fbcWrap.hidden = false;
    if (confirm) confirm.hidden = true;
    if (methodLine) methodLine.hidden = true;
    if (endReport) endReport.hidden = true;

    // Split patient name into First Name / Last Name
    const rawName = data.fname || (currentPatientRecord ? `${currentPatientRecord.fname || ''} ${currentPatientRecord.lname || ''}`.trim() : '');
    const genderStr = data.gender || 'Male';
    let cleanName = rawName.replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i, '').trim();
    let title = (/^(mrs|ms|miss)/i.test(rawName) || genderStr.toLowerCase().startsWith('f')) ? 'Ms.' : 'Mr.';
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    let fName = title;
    let lName = '';
    if (nameParts.length === 1) {
      lName = nameParts[0];
    } else if (nameParts.length > 1) {
      fName = `${title} ${nameParts.slice(0, -1).map(p => p.length === 1 ? p.toUpperCase() + '.' : p).join(' ')}`.trim();
      lName = nameParts[nameParts.length - 1];
    }

    if ($('#fbcPrevFirstName')) $('#fbcPrevFirstName').textContent = fName || title;
    if ($('#fbcPrevLastName')) $('#fbcPrevLastName').textContent = lName || '—';
    if ($('#fbcPrevGender')) $('#fbcPrevGender').textContent = genderStr;
    if ($('#fbcPrevDiagnosis')) $('#fbcPrevDiagnosis').textContent = data.diagnosis || '';
    if ($('#fbcPrevPatientId')) $('#fbcPrevPatientId').textContent = data.passport_no || '—';
    if ($('#fbcPrevSampleId')) {
      const sId = data.ref_no || data.sample_id || currentPatientRecord?.raw_ref_no || currentPatientRecord?.ref_no || '';
      $('#fbcPrevSampleId').textContent = sId ? formatMrdDisplay(sId, currentPatientRecord?.raw_ref_no) : '—';
    }
    const nowGenTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit' });
    const effectiveTime = (data.test_time || data.report_time || nowGenTime);
    const cleanEffectiveTime = (effectiveTime !== '11:08' && !effectiveTime.includes('undefined')) ? effectiveTime : nowGenTime;
    const fbcRunTimeDisplay = data.run_time || window.h360RunTime || `${data.medical_date || reportDate(new Date())} ${cleanEffectiveTime}`;
    if ($('#fbcPrevRunTime')) $('#fbcPrevRunTime').textContent = fbcRunTimeDisplay;
    const cleanAge = String(data.age || '').replace(/\s*years?/i, '').trim();
    if ($('#fbcPrevAge')) $('#fbcPrevAge').textContent = `${cleanAge || '—'}   Year`;

    const isFemale = String(data.gender || '').toLowerCase().startsWith('f');
    const calcFlag = (valStr, refStr) => {
      const num = parseFloat(valStr);
      if (isNaN(num)) return '';
      const m = String(refStr).match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (m) {
        const low = parseFloat(m[1]), high = parseFloat(m[2]);
        if (!isNaN(low) && num < low) return 'L';
        if (!isNaN(high) && num > high) return 'H';
      }
      return '';
    };

    const formatFbcVal = (code, v) => {
      if (v === undefined || v === null) return '';
      const s = String(v).trim();
      if (!s) return '';
      const n = parseFloat(s);
      if (isNaN(n)) return s;
      const c = String(code || '').toUpperCase();
      if (c === 'PLT' || c === 'P-LCC') {
        return String(Math.round(n));
      }
      if (c === 'PCT') {
        return n.toFixed(3);
      }
      if (['LYM%', 'GRAN%', 'MID%', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'RDW-CV', 'RDW-SD', 'MPV', 'PDW-SD', 'PDW-CV', 'P-LCR'].includes(c)) {
        return n.toFixed(1);
      }
      return n.toFixed(2);
    };

    const mainParamCodes = ['WBC', 'RBC', 'HGB', 'PLT'];

    const params = [
      { code: 'WBC', val: data.fbc_wbc || '8.88', unit: '10?/?L', ref: '4.00-11.00' },
      { code: 'Lym%', val: data.fbc_lym_percent || data.fbc_lymphocyte || '32.8', unit: '%', ref: '20.0-50.0' },
      { code: 'Gran%', val: data.fbc_gran_percent || data.fbc_neutrophil || '58.7', unit: '%', ref: '50.0-70.0' },
      { code: 'Mid%', val: data.fbc_mid_percent || data.fbc_monocyte || '8.5', unit: '%', ref: '3.0-9.0' },
      { code: 'Lym#', val: data.fbc_lym_num || '2.91', unit: '10?/?L', ref: '1.10-3.20' },
      { code: 'Gran#', val: data.fbc_gran_num || '5.22', unit: '10?/?L', ref: '2.00-7.00' },
      { code: 'Mid#', val: data.fbc_mid_num || '0.75', unit: '10?/?L', ref: '0.10-0.90' },
      { code: 'RBC', val: data.fbc_rbc || (isFemale ? '4.20' : '4.85'), unit: '10?/?L', ref: isFemale ? '3.80-5.00' : '4.30-5.80' },
      { code: 'HGB', val: data.fbc_hemoglobin || (isFemale ? '12.5' : '13.5'), unit: 'g/dL', ref: isFemale ? '11.5-15.5' : '12.5-18.0' },
      { code: 'HCT', val: data.fbc_pcv || (isFemale ? '38.0' : '42.0'), unit: '%', ref: isFemale ? '35.0-45.0' : '40.0-50.0' },
      { code: 'MCV', val: data.fbc_mcv || '88.0', unit: 'fL', ref: '82.0-100.0' },
      { code: 'MCH', val: data.fbc_mch || '29.0', unit: 'pg', ref: '27.0-34.0' },
      { code: 'MCHC', val: data.fbc_mchc || '33.0', unit: 'g/dL', ref: '31.6-35.4' },
      { code: 'RDW-CV', val: data.fbc_rdw_cv || '12.5', unit: '%', ref: '11.5-14.5' },
      { code: 'RDW-SD', val: data.fbc_rdw_sd || '42.0', unit: 'fL', ref: '35.0-56.0' },
      { code: 'PLT', val: data.fbc_platelets || '280', unit: '10?/?L', ref: '140-350' },
      { code: 'MPV', val: data.fbc_mpv || '8.5', unit: 'fL', ref: '7.0-11.0' },
      { code: 'PDW-SD', val: data.fbc_pdw_sd || data.fbc_pdw || '11.1', unit: 'fL', ref: '9.0-17.0' },
      { code: 'PDW-CV', val: data.fbc_pdw_cv || '15.0', unit: '%', ref: '10.0-17.9' },
      { code: 'PCT', val: data.fbc_pct || '0.25', unit: '%', ref: '0.108-0.282' },
      { code: 'P-LCR', val: data.fbc_p_lcr || '15.3', unit: '%', ref: '11.0-45.0' },
      { code: 'P-LCC', val: data.fbc_p_lcc || '50', unit: '10?/?L', ref: '30-90' }
    ];

    const fbcTbody = $('#fbcPreviewBody');
    if (fbcTbody) {
      fbcTbody.innerHTML = params.map(p => {
        const flag = calcFlag(p.val, p.ref);
        const flagSymbol = flag === 'H' ? '<span class="fbc-arrow-high">?</span>' : flag === 'L' ? '<span class="fbc-arrow-low">?</span>' : '';
        const isMain = mainParamCodes.includes(p.code);
        const displayVal = formatFbcVal(p.code, p.val);
        return `
          <tr class="${isMain ? 'fbc-main-param' : ''}">
            <td class="fbc-code">${p.code}</td>
            <td class="fbc-res">${displayVal} ${flagSymbol}</td>
            <td class="fbc-ref">${p.ref}</td>
            <td class="fbc-unit">${p.unit}</td>
          </tr>
        `;
      }).join('');
    }

    // Right message boxes
    if ($('#fbcPrevWbcMsg')) $('#fbcPrevWbcMsg').textContent = data.fbc_wbc_message || '';
    if ($('#fbcPrevRbcMsg')) $('#fbcPrevRbcMsg').textContent = data.fbc_rbc_message || '';
    if ($('#fbcPrevPltMsg')) $('#fbcPrevPltMsg').textContent = data.fbc_plt_message || '';

    // Differential counts (two digits padded without decimals: 65, 30, 03, 02, 00)
    const padDiff = v => {
      if (v === undefined || v === null || v === '') return '00';
      const n = Math.round(parseFloat(v));
      if (isNaN(n)) return String(v).trim();
      return (n < 10 && n >= 0) ? '0' + n : String(n);
    };
    if ($('#fbcPrevDiffNeut')) $('#fbcPrevDiffNeut').textContent = padDiff(data.fbc_diff_neutrophil || '65');
    if ($('#fbcPrevDiffLym')) $('#fbcPrevDiffLym').textContent = padDiff(data.fbc_diff_lymphocyte || '30');
    if ($('#fbcPrevDiffMono')) $('#fbcPrevDiffMono').textContent = padDiff(data.fbc_diff_monocyte || '03');
    if ($('#fbcPrevDiffEos')) $('#fbcPrevDiffEos').textContent = padDiff(data.fbc_diff_eosinophil || '02');
    if ($('#fbcPrevDiffBaso')) $('#fbcPrevDiffBaso').textContent = padDiff(data.fbc_diff_basophil || '00');

    // Histograms
    const wbcImg = $('#fbcPrevWbcImg');
    const rbcImg = $('#fbcPrevRbcImg');
    const pltImg = $('#fbcPrevPltImg');
    if (wbcImg) wbcImg.src = data.fbc_wbc_histogram ? `data:image/png;base64,${data.fbc_wbc_histogram}` : '/assets/h360-wbc.png';
    if (rbcImg) rbcImg.src = data.fbc_rbc_histogram ? `data:image/png;base64,${data.fbc_rbc_histogram}` : '/assets/h360-rbc.png';
    if (pltImg) pltImg.src = data.fbc_plt_histogram ? `data:image/png;base64,${data.fbc_plt_histogram}` : '/assets/h360-plt.png';

    // Bottom-right printed notice
    const printKey = getReportPrintKey(data);
    let printInfo = null;
    try {
      const raw = printKey ? localStorage.getItem(printKey) : null;
      if (raw) printInfo = JSON.parse(raw);
    } catch (e) {}
    const fbcPrinted = $('#fbcPrintedNotice');
    if (fbcPrinted) {
      if (printInfo) {
        fbcPrinted.hidden = false;
        fbcPrinted.textContent = `PRINTED ? ${printInfo.date} ${printInfo.time}`;
      } else {
        fbcPrinted.hidden = true;
      }
    }
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
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '?';
    };
    const _hasRc = !!(data.result_note && String(data.result_note).trim() !== '');
    body.innerHTML = `
      <tr><td>SGPT</td><td><b>${formatLab(pt)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      ${_hasRc ? '<tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>' : ''}
      <tr style="height:12px;"><td></td><td></td><td></td></tr>
      <tr><td>SGOT</td><td><b>${formatLab(ot)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      ${_hasRc ? '<tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>' : ''}
    `;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGOT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgot_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '?';
    };
    const _hasRc2 = !!(data.result_note && String(data.result_note).trim() !== '');
    body.innerHTML = `
      <tr><td>SGOT</td><td><b>${formatLab(res)}</b></td><td>Upto 35 iu/l (Men)</td></tr>
      ${_hasRc2 ? '<tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 31 iu/l (Women)</td></tr>' : ''}
    `;
    refs.innerHTML = '';
  } else if (data.test_name === 'SGPT') {
    if (refHead) refHead.hidden = false;
    let res = (data.test_result || data.sgpt_result || '').trim();
    const formatLab = val => {
      if (!val || val === '-' || val === '?') return '?';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '?';
    };
    const _hasRc3 = !!(data.result_note && String(data.result_note).trim() !== '');
    body.innerHTML = `
      <tr><td>SGPT</td><td><b>${formatLab(res)}</b></td><td>Upto 45 iu/l (Men)</td></tr>
      ${_hasRc3 ? '<tr><td></td><td><b>[Repeated and Confirmed]</b></td><td>Upto 34 iu/l (Women)</td></tr>' : ''}
    `;
    refs.innerHTML = '';
  } else if (data.test_name === 'Total ? - HCG Concentration') {
    if (refHead) refHead.hidden = true;
    const conc = data.beta_hcg_conc || '< 5.00';
    const status = data.beta_hcg_status || 'Negative';
    const comment = data.beta_hcg_comment || 'Total ? - HCG Level <5.00 - Negative for Pregnancy';

    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:38%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; width:34%; border-bottom:1px solid #333; padding-bottom:6px;">Results</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Units</th>
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:12px;">Total ? - HCG Concentration</td>
        <td style="font-weight:bold; padding-top:12px;">${conc}</td>
        <td style="font-weight:bold; padding-top:12px;">mIU/mL</td>
      </tr>
      <tr>
        <td></td>
        <td style="font-weight:bold; padding-top:6px;">${status}</td>
        <td></td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="margin-top:14px; font-weight:bold; font-size:12px; color:#0f172a;">Reference Ranges</div>
      <div style="font-weight:bold; text-decoration:underline; font-size:11.5px; margin:4px 0 6px; color:#0f172a;">Pregnant</div>
      <table style="width:100%; max-width:380px; font-size:11px; line-height:1.45; border-collapse:collapse; margin-bottom:12px;">
        <tr><td style="width:110px; font-weight:600;">3</td><td style="width:20px; font-weight:600;">:</td><td>5 - 50</td></tr>
        <tr><td style="font-weight:600;">4</td><td style="font-weight:600;">:</td><td>5 - 426</td></tr>
        <tr><td style="font-weight:600;">5</td><td style="font-weight:600;">:</td><td>18 - 7,340</td></tr>
        <tr><td style="font-weight:600;">6</td><td style="font-weight:600;">:</td><td>1,080 - 56,500</td></tr>
        <tr><td style="font-weight:600;">7 - 8</td><td style="font-weight:600;">:</td><td>7,650 - 229,000</td></tr>
        <tr><td style="font-weight:600;">9 - 12</td><td style="font-weight:600;">:</td><td>25,700 - 288,000</td></tr>
        <tr><td style="font-weight:600;">13 - 16</td><td style="font-weight:600;">:</td><td>13,300 - 254,000</td></tr>
        <tr><td style="font-weight:600;">17 - 24</td><td style="font-weight:600;">:</td><td>4,060 - 165,400</td></tr>
        <tr><td style="font-weight:600;">25 - 40</td><td style="font-weight:600;">:</td><td>3,640 - 117,000</td></tr>
      </table>
      <div style="margin-top:8px; font-weight:bold; font-size:11.5px; line-height:1.4; color:#1e293b;">(Comments: ${comment})</div>
      <div style="margin-top:6px; font-weight:bold; font-size:11px; color:#1e293b;">(Test Method - Fluorescence Immunoassay (FIA))</div>
    `;
  } else if (data.test_name === 'BETA H.C.G.') {
    if (refHead) refHead.hidden = true;
    const rapidRes = data.beta_hcg_rapid_result || 'Negative';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:50%; border-bottom:1px solid #333; padding-bottom:6px;">TEST</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">RESULTS</th>
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:16px;">BETA H.C.G.</td>
        <td style="font-weight:bold; padding-top:16px; white-space:pre-line;">${rapidRes}</td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="margin-top:20px; font-weight:bold; font-size:12px; color:#1e293b;">(Test Method - Immunochromatographic assay-Rapid)</div>
    `;
  } else if (data.test_name === 'Urine Drug Screening') {
    if (refHead) refHead.hidden = true;
    const is12 = data.drug_panel_type === '12';
    const drugs = is12 ? [
      ['Amphetamine (AMP)', 'amp'],
      ['Barbiturates (BAR)', 'bar'],
      ['Benzodiazepine (BZO)', 'bzo'],
      ['Buprenorphine (BUP)', 'bup'],
      ['Cocaine (COC)', 'coc'],
      ['Marijuana (THC)', 'thc'],
      ['Methadone (MTD)', 'mtd'],
      ['Methamphetamine (MET)', 'met'],
      ['Methylenedioxymethamphetamine (MDMA)', 'mdma'],
      ['Morphine (MOP)', 'mop'],
      ['Phencyclidine (PCP)', 'pcp'],
      ['Tricyclic Antidepressants (TCA)', 'tca']
    ] : [
      ['Amphetamine (AMP)', 'amp'],
      ['Benzodiazepine (BZO)', 'bzo'],
      ['Methamphetamine (MET)', 'met'],
      ['Opioid (OPI)', 'opi'],
      ['Marijuana (THC)', 'thc']
    ];
    let html = `
      <tr>
        <th style="font-weight:bold; width:60%; border-bottom:1px solid #333; padding-bottom:6px; text-align:left;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px; text-align:left;">Result</th>
      </tr>
    `;
    html += drugs.map(([label, key]) => {
      const res = data[`urine_drug_${key}`] || 'Negative';
      const isPos = res === 'Positive';
      const badge = isPos
        ? `<span style="color:#dc2626;font-weight:700;background:#fee2e2;padding:2px 8px;border-radius:4px;border:1px solid #fca5a5;">Positive</span>`
        : `<span style="color:#059669;font-weight:normal;">Negative</span>`;
      return `<tr><td style="font-weight:600;padding:6px 0;border-bottom:1px solid #f1f5f9;">${label}</td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">${badge}</td></tr>`;
    }).join('');
    body.innerHTML = html;
    refs.innerHTML = `
      <div style="margin-top:16px; font-weight:bold; font-size:12px; color:#1e293b;">[Test Method - Immnochromatography]</div>
    `;
  } else if (data.test_name === 'Tuberculosis Rapid Test') {
    if (refHead) refHead.hidden = true;
    const tbRes = data.test_result || data.tb_result || 'Negative';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:50%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Results</th>
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:16px;">TB Test</td>
        <td style="font-weight:bold; padding-top:16px; color:#059669;">${tbRes}</td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="margin-top:20px; font-weight:bold; font-size:12px; color:#1e293b;">(Test Method - Immunochromatography)</div>
    `;
  } else if (data.test_name === 'Brucellosis Test') {
    if (refHead) refHead.hidden = true;
    const bruRes = data.test_result || data.brucellosis_result || 'Negative';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:50%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Results</th>
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:16px;">BRUCELLA Test</td>
        <td style="font-weight:bold; padding-top:16px; color:#059669;">${bruRes}</td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="margin-top:20px; font-weight:bold; font-size:12px; color:#1e293b;">(Test Method - Immunochromatography)</div>
    `;
  } else if (data.test_name === 'HIV Ag & Ab Test') {
    if (refHead) refHead.hidden = true;
    const hivRes = data.test_result || data.hiv_result || 'Negative';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:50%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Result</th>
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:16px;">HIV I &amp; II</td>
        <td style="font-weight:bold; padding-top:16px; color:#059669;">${hivRes}</td>
      </tr>
    `;
    refs.innerHTML = `
      <div style="margin-top:20px; font-weight:bold; font-size:12px; color:#1e293b;">[Test Method - Antigen Antibody Immunochromatography - Rapid Test]</div>
    `;
  } else if (loadedCustomTests.some(t => t.name === data.test_name)) {
    const customDef = loadedCustomTests.find(t => t.name === data.test_name);
    const hasRef = !!(customDef.referenceRange || data.reference_range);
    if (refHead) refHead.hidden = !hasRef;
    const testLabel = customDef.testLabel || customDef.name;
    const resVal = data.custom_test_result || data.test_result || 'Negative';
    body.innerHTML = `
      <tr>
        <th style="font-weight:bold; width:50%; border-bottom:1px solid #333; padding-bottom:6px;">Test</th>
        <th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Result</th>
        ${hasRef ? '<th style="font-weight:bold; border-bottom:1px solid #333; padding-bottom:6px;">Reference Range</th>' : ''}
      </tr>
      <tr>
        <td style="font-weight:bold; padding-top:16px;">${testLabel}</td>
        <td style="font-weight:bold; padding-top:16px; color:#059669;">${resVal} ${customDef.unit ? ' ' + customDef.unit : ''}</td>
        ${hasRef ? `<td style="padding-top:16px; font-size:12px;">${customDef.referenceRange || data.reference_range}</td>` : ''}
      </tr>
    `;
    refs.innerHTML = customDef.method ? `
      <div style="margin-top:20px; font-weight:bold; font-size:12px; color:#1e293b;">(Test Method - ${customDef.method})</div>
    ` : '';
  } else if (loadedPackages.some(p => (p.name === data.test_name || p.name === data.package_name) && !p.isBuiltin)) {
    const pkg = loadedPackages.find(p => (p.name === data.test_name || p.name === data.package_name) && !p.isBuiltin);
    if (refHead) refHead.hidden = false;
    const pkgTests = pkg.tests || [];
    const rowsHtml = pkgTests.map((t, idx) => {
      let rVal = data[`${t.toLowerCase().replace(/[^a-z0-9]/g, '_')}_result`] || (defaults[t] ? 'Normal' : 'Negative');
      if (t === 'Urine Full Report') rVal = 'Standard Normal';
      if (t === 'Full Blood Count') rVal = 'Normal Hematology';
      const rRef = defaults[t] ? defaults[t][1] : 'Negative';
      return `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="font-weight:600; padding:8px 4px;">${idx + 1}. ${t}</td>
          <td style="font-weight:bold; color:#059669; padding:8px 4px;">${rVal}</td>
          <td style="font-size:12px; color:#64748b; padding:8px 4px;">${rRef}</td>
        </tr>
      `;
    }).join('');

    body.innerHTML = `
      <tr style="background:#f8fafc; border-bottom:1.5px solid #334155;">
        <th style="font-weight:bold; width:45%; padding:6px 4px;">Included Report / Test</th>
        <th style="font-weight:bold; width:30%; padding:6px 4px;">Result</th>
        <th style="font-weight:bold; width:25%; padding:6px 4px;">Reference Range</th>
      </tr>
      ${rowsHtml}
    `;
    refs.innerHTML = `
      <div style="margin-top:16px; padding:10px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:12px; color:#166534;">
        <strong>Multi-Page Package (${pkgTests.length} Reports):</strong> Official export / print includes all <strong>${pkgTests.length} separate A4 report pages</strong> with full letterhead and signatures.
      </div>
    `;
  } else {
    if (refHead) refHead.hidden = false;
    let result = (data.test_result || '').trim();
    if (result && result !== '-' && result !== '?' && data.unit) {
      if (!new RegExp(`\\b${data.unit.replace('/', '\\/')}\\b`, 'i').test(result) && !/\b(i?u\/l|mg\/dl|g\/dl)\b/i.test(result)) {
        result += ' ' + data.unit;
      }
    }
    body.innerHTML = `<tr><td>${data.test_name || '—'}</td><td><b>${result || '—'}</b></td><td>${data.reference_range || '—'}</td></tr>`;
    refs.innerHTML = '';
  }

  updatePrintStatus(data);
}

function getReportPrintKey(data = collect()) {
  if (!data.ref_no || !data.test_name) return null;
  return `printed_${String(data.ref_no).trim().toUpperCase()}_${String(data.test_name).trim().toUpperCase()}`;
}

function markReportAsPrinted() {
  const data = collect();
  const key = getReportPrintKey(data);
  if (!key) return;
  const now = new Date();
  const printInfo = {
    date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    timestamp: now.getTime(),
    ref_no: data.ref_no,
    test_name: data.test_name,
    patient: data.fname || ''
  };
  try {
    localStorage.setItem(key, JSON.stringify(printInfo));
  } catch (e) {}
  updatePrintStatus(data);
}

function updatePrintStatus(data = collect()) {
  const bar = $('#printStatusBar');
  const stamp = $('#paperPrintedStamp');
  const text = $('#printStatusText');
  const tag = $('#printTimeTag');
  if (!bar || !stamp) return;

  const key = getReportPrintKey(data);
  if (!key) {
    bar.hidden = true;
    stamp.hidden = true;
    return;
  }

  let info = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) info = JSON.parse(raw);
  } catch (e) {}

  const fbcPrinted = $('#fbcPrintedNotice');
  if (info) {
    bar.hidden = false;
    stamp.hidden = false;
    if (fbcPrinted) {
      fbcPrinted.hidden = false;
      fbcPrinted.textContent = `PRINTED ? ${info.date} ${info.time}`;
    }
    if (text) text.textContent = `Report was printed on ${info.date} at ${info.time}`;
    if (tag) tag.textContent = `Printed at ${info.time}`;
  } else {
    bar.hidden = true;
    stamp.hidden = true;
    if (fbcPrinted) fbcPrinted.hidden = true;
  }
}

function reportFileName(data, ext, isNoLetterhead = false) {
  const clean = v => String(v || 'Report').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'Report';
  const suffix = isNoLetterhead ? '_No-Letterhead' : '';
  return `${clean(data.ref_no)}_${clean(data.test_name || 'Laboratory-Test')}${suffix}.${ext}`;
}

async function download(url, ext, extraData = {}) {
  const data = { ...collect(), ...extraData };
  if (!data.ref_no && !data.fname && !data.passport_no) {
    toast('Please enter at least a patient name or ref number');
    return;
  }
  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) {
    toast('Select a test first');
    return;
  }
  // Auto-fill test_result if empty (use default for the selected test)
  if (!data.test_result) {
    if (defaults[data.test_name]) {
      data.test_result = data.test_name;
    } else {
      data.test_result = 'Negative';
    }
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
    let errMsg = 'Export failed';
    try {
      const errJson = await r.json();
      if (errJson && errJson.error) errMsg = errJson.error;
    } catch {}
    toast(errMsg);
    return;
  }
  const blob = await r.blob();

  // File type map for Save As dialog
  const fileTypeMap = {
    pdf:  { description: 'PDF Document',        accept: { 'application/pdf': ['.pdf'] } },
    xlsx: { description: 'Excel Workbook',       accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
    docx: { description: 'Word Document',        accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } },
  };

  if (window.showSaveFilePicker) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: fileTypeMap[ext] ? [fileTypeMap[ext]] : [],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      toast(filename + ' saved');
      markReportAsPrinted();
    } catch (err) {
      if (err.name === 'AbortError') {
        toast('Save cancelled');
      } else {
        toast('Save failed: ' + err.message);
      }
    }
  } else {
    // Fallback: auto-download (older browsers)
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    toast(filename + ' downloaded');
    markReportAsPrinted();
  }
}

$('#searchBtn').onclick = searchPatient;
$('#refSearch').onkeydown = e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchPatient();
  }
};
$('#test_name').onchange = updateTest;
$('#test_result').oninput = () => { autoEvaluateRepeatedConfirmed(); debouncedUpdatePreview(); };
$('#sgpt_result')?.addEventListener('input', () => { autoEvaluateRepeatedConfirmed(); debouncedUpdatePreview(); });
$('#sgot_result')?.addEventListener('input', () => { autoEvaluateRepeatedConfirmed(); debouncedUpdatePreview(); });

// Repeated & Confirmed checkbox — manual override tracking
(function() {
  const cb = document.getElementById('enable_repeated_confirmed');
  if (cb) {
    cb.addEventListener('change', () => {
      isManualConfirmToggled = true;
      const noteHidden = document.getElementById('result_note');
      if (noteHidden) {
        noteHidden.value = cb.checked ? '[Repeated and Confirmed]' : '';
      }
      debouncedUpdatePreview();
    });
  }
})();

// Patient detail fields — preview updates as user types (no search needed)
['[name="fname"]','[name="ref_no"]','[name="age"]','[name="gender"]','[name="passport_no"]','[name="medical_date"]'].forEach(sel => {
  const el = $(sel);
  if (el) {
    el.addEventListener('input', () => debouncedUpdatePreview());
    el.addEventListener('change', () => debouncedUpdatePreview());
  }
});
$$('#urineResults input').forEach(input => input.addEventListener('input', () => debouncedUpdatePreview()));
$('#hba1c_result_input')?.addEventListener('input', () => debouncedUpdatePreview());
$$('#fbcResults input').forEach(input => input.addEventListener('input', () => {
  input.dataset.manualEdited = 'true';
  debouncedUpdatePreview();
}));

// Differential Count toggle ? enable/disable inputs and update preview+badge
function applyDiffToggle() {
  const chk = $('#fbc_include_diff');
  const inputs = $('#fbcDiffInputs');
  const badge = $('#fbcDiffBadge');
  const diffBlock = $('.fbc-diff-block');
  if (!chk) return;
  const on = chk.checked;
  if (inputs) {
    inputs.style.opacity = on ? '1' : '0.5';
    inputs.style.pointerEvents = on ? '' : 'none';
  }
  if (badge) {
    if (on) {
      badge.textContent = 'Included (On)';
      badge.style.background = '#ccfbf1';
      badge.style.color = '#065f46';
    } else {
      badge.textContent = 'Excluded (Off)';
      badge.style.background = '#e2e8f0';
      badge.style.color = '#475569';
    }
  }
  if (diffBlock) diffBlock.hidden = !on;
  updatePreview();
}
$('#fbc_include_diff')?.addEventListener('change', applyDiffToggle);
// Run once on load to set initial state (unchecked = hidden)
applyDiffToggle();

$('#resetHba1cBtn')?.addEventListener('click', () => {
  const el = $('#hba1c_result_input');
  if (el) el.value = '5.3%';
  updatePreview();
  toast('Reset to standard normal HbA1c (5.3%)');
});

$('#resetFbcBtn')?.addEventListener('click', resetFbcDefaults);
$('#syncH360Btn')?.addEventListener('click', () => syncFromH360(true));
$('#applyLatestH360Btn')?.addEventListener('click', () => {
  if (latestH360Cache) {
    applyFbcValues(latestH360Cache, true);
    const b = $('#fbcStatusBanner');
    if (b) b.hidden = true;
  }
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
    if (el) el.value = (k === 'ufr_specific_gravity' ? getRandomSG() : v);
  });
  updatePreview();
  toast('Reset to standard normal Urine Report values');
});

$('#resetType11Btn')?.addEventListener('click', () => {
      if ($('#colombo_fbs')) $('#colombo_fbs').value = '75';
      if ($('#colombo_sgpt')) $('#colombo_sgpt').value = '10';
      if ($('#colombo_sgot')) $('#colombo_sgot').value = '13';
      if ($('#colombo_gamma_gt')) $('#colombo_gamma_gt').value = '18';
      if ($('#colombo_cholesterol')) $('#colombo_cholesterol').value = '176';
      if ($('#colombo_hdl')) $('#colombo_hdl').value = '44';
      if ($('#colombo_ldl')) $('#colombo_ldl').value = '112.4';
      if ($('#colombo_vldl')) $('#colombo_vldl').value = '19.6';
      if ($('#colombo_triglyceride')) $('#colombo_triglyceride').value = '98';
      if ($('#colombo_cho_hdl')) $('#colombo_cho_hdl').value = '4';
      updatePreview();
      toast('Type 11 Multi-Sheet Package reset to defaults');
    });
  $('#resetColomboBtn')?.addEventListener('click', () => {
      if ($('#colombo_fbs')) $('#colombo_fbs').value = '75';
      if ($('#colombo_sgpt')) $('#colombo_sgpt').value = '10';
      if ($('#colombo_sgot')) $('#colombo_sgot').value = '13';
      if ($('#colombo_gamma_gt')) $('#colombo_gamma_gt').value = '18';
      if ($('#colombo_cholesterol')) $('#colombo_cholesterol').value = '176';
      if ($('#colombo_hdl')) $('#colombo_hdl').value = '44';
      if ($('#colombo_ldl')) $('#colombo_ldl').value = '112.4';
      if ($('#colombo_vldl')) $('#colombo_vldl').value = '19.6';
      if ($('#colombo_triglyceride')) $('#colombo_triglyceride').value = '98';
      if ($('#colombo_cho_hdl')) $('#colombo_cho_hdl').value = '4';
      updatePreview();
      toast('Type 11 Package reset to defaults');
    });
  $('#resetType7Btn')?.addEventListener('click', () => {
  if ($('#tb_result')) $('#tb_result').value = 'Negative';
  if ($('#brucellosis_result')) $('#brucellosis_result').value = 'Negative';
  if ($('#hiv_result')) $('#hiv_result').value = 'Negative';
  if ($('#ufr_specific_gravity')) $('#ufr_specific_gravity').value = getRandomSG();
  updatePreview();
  toast('Reset to standard Type 7 Russia package defaults');
});
$$('#type7Results input, #type7Results select').forEach(el => el.addEventListener('change', () => debouncedUpdatePreview()));
$$('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('input', () => debouncedUpdatePreview()));
$$('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('change', () => debouncedUpdatePreview()));

// Custom Test Input Listeners & Reset Handler
$('#custom_test_result_select')?.addEventListener('change', () => debouncedUpdatePreview());
$('#custom_test_result_input')?.addEventListener('input', () => debouncedUpdatePreview());
$('#resetCustomTestBtn')?.addEventListener('click', () => {
  const currentTest = $('#test_name')?.value;
  const def = loadedCustomTests.find(t => t.name === currentTest);
  if (def) {
    if (def.resultType === 'numeric') {
      if ($('#custom_test_result_input')) $('#custom_test_result_input').value = '';
    } else {
      if ($('#custom_test_result_select') && def.resultOptions && def.resultOptions[0]) {
        $('#custom_test_result_select').value = def.resultOptions[0];
      }
    }
  }
  updatePreview();
  toast('Reset custom test to default');
});

// HCG Input Listeners & Reset Handlers
$('#beta_hcg_conc_input')?.addEventListener('input', () => debouncedUpdatePreview());
$('#beta_hcg_status_select')?.addEventListener('change', e => {
  const status = e.target.value;
  const commentInput = $('#beta_hcg_comment_input');
  if (commentInput) {
    if (status === 'Negative') {
      commentInput.value = 'Total ? - HCG Level <5.00 - Negative for Pregnancy';
    } else if (status === 'Positive') {
      commentInput.value = 'Positive for Pregnancy';
    } else if (status === 'Weakly Positive') {
      commentInput.value = 'Weakly Positive for Pregnancy (Advised repeat test after 48-72 hours)';
    } else if (status.includes('Today Negative')) {
      commentInput.value = 'Negative for Pregnancy (Come with next period date)';
    }
  }
  debouncedUpdatePreview();
});
$('#beta_hcg_comment_input')?.addEventListener('input', () => debouncedUpdatePreview());
$('#beta_hcg_rapid_select')?.addEventListener('change', () => debouncedUpdatePreview());

$('#resetBetaHcgFiaBtn')?.addEventListener('click', () => {
  if ($('#beta_hcg_conc_input')) $('#beta_hcg_conc_input').value = '< 5.00';
  if ($('#beta_hcg_status_select')) $('#beta_hcg_status_select').value = 'Negative';
  if ($('#beta_hcg_comment_input')) $('#beta_hcg_comment_input').value = 'Total ? - HCG Level <5.00 - Negative for Pregnancy';
  updatePreview();
  toast('Reset Total ? - HCG Concentration to defaults');
});

$('#resetBetaHcgRapidBtn')?.addEventListener('click', () => {
  if ($('#beta_hcg_rapid_select')) $('#beta_hcg_rapid_select').value = 'Negative';
  updatePreview();
  toast('Reset BETA H.C.G. to Negative');
});

$('#reference_range').oninput = () => debouncedUpdatePreview();
$('#pdfBtn').onclick = () => download('/api/export/pdf', 'pdf');
$('#pdfPlainBtn').onclick = () => download('/api/export/pdf?letterhead=false', 'pdf', { noLetterhead: true });
$('#printPlainBtn').onclick = async () => {
  const data = { ...collect(), noLetterhead: true };
  if (!data.ref_no && !data.fname && !data.passport_no) { toast('Please enter at least a patient name or ref number'); return; }
  // Fallback: if test_name is empty but report_type is a package, use report_type
  if (!data.test_name && data.report_type && data.report_type !== 'single') {
    data.test_name = data.report_type;
  }
  if (!data.test_name) { toast('Select a test first'); return; }
  // Auto-fill test_result if empty
  if (!data.test_result) {
    data.test_result = defaults[data.test_name] ? data.test_name : 'Negative';
  }
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
    if (win) {
      win.onload = () => { win.focus(); win.print(); };
      markReportAsPrinted();
    } else { toast('Allow popups to use print'); }
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

// ==========================================
// Erba H360 Machine Send Integration
// ==========================================
async function sendPatientToH360(silent = false) {
  if (!currentPatientRecord) {
    if (!silent) toast('Please find and load a patient first');
    return;
  }
  const btn = $('#sendH360Btn');
  const statusEl = $('#h360Status');
  const sampleId = currentPatientRecord.ref_no;
  const name = reportName(currentPatientRecord) || currentPatientRecord.fname || '';
  const passport = currentPatientRecord.passport_no || '';
  const age = currentPatientRecord.age || '';
  const gender = currentPatientRecord.gender || 'Male';

  if (btn && !silent) {
    btn.disabled = true;
    btn.innerHTML = '<span>Sending to H360...</span>';
  }

  try {
    const res = await fetch('/api/h360/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sample_id: sampleId,
        ref_no: sampleId,
        fname: name,
        passport_no: passport,
        age,
        gender,
        dob: currentPatientRecord.dob || '',
        agency: currentPatientRecord.agency || currentPatientRecord.agency_name || ''
      })
    });
    const data = await res.json();
    if (data.ok) {
      if (statusEl) {
        statusEl.textContent = `Ready on H360: ${data.first_name || ''} ${data.last_name || ''} • PID: ${data.patient_id} • Dept: ${data.department}`;
        statusEl.className = 'h360-status-text success';
      }
      if (!silent) toast(`Sent to H360: ${data.first_name} ${data.last_name} (${sampleId})`);
    } else {
      if (statusEl) {
        statusEl.textContent = `H360 notice: ${data.error || 'Failed'}`;
        statusEl.className = 'h360-status-text error';
      }
      if (!silent) toast(data.error || 'Failed to send to H360');
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `Error communicating with H360 interface`;
      statusEl.className = 'h360-status-text error';
    }
    if (!silent) toast('H360 communication error: ' + err.message);
  } finally {
    if (btn && !silent) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Send to H360 Machine</span>`;
    }
  }
}

let latestH360Cache = null;

function applyFbcValues(result, notify = true) {
  if (!result) return;
  const to2Dec = v => {
    if (v === undefined || v === null) return '';
    const s = String(v).trim();
    if (!s) return '';
    const n = parseFloat(s);
    if (isNaN(n)) return s;
    return n.toFixed(2);
  };

  if ($('#fbc_sync_sample_id') && result.sample_id) {
    $('#fbc_sync_sample_id').value = result.sample_id;
  }

  // Parameters with 2 decimals
  if ($('#fbc_wbc') && result.wbc) $('#fbc_wbc').value = to2Dec(result.wbc);
  if ($('#fbc_lym_percent') && (result.lym_percent || result.lymphocyte)) $('#fbc_lym_percent').value = to2Dec(result.lym_percent || result.lymphocyte);
  if ($('#fbc_mid_percent') && (result.mid_percent || result.monocyte)) $('#fbc_mid_percent').value = to2Dec(result.mid_percent || result.monocyte);
  if ($('#fbc_gran_percent') && (result.gran_percent || result.neutrophil)) $('#fbc_gran_percent').value = to2Dec(result.gran_percent || result.neutrophil);
  if ($('#fbc_lym_num') && result.lym_num) $('#fbc_lym_num').value = to2Dec(result.lym_num);
  if ($('#fbc_mid_num') && result.mid_num) $('#fbc_mid_num').value = to2Dec(result.mid_num);
  if ($('#fbc_gran_num') && result.gran_num) $('#fbc_gran_num').value = to2Dec(result.gran_num);

  if ($('#fbc_rbc') && result.rbc) $('#fbc_rbc').value = to2Dec(result.rbc);
  if ($('#fbc_hemoglobin') && (result.hgb || result.hemoglobin)) $('#fbc_hemoglobin').value = to2Dec(result.hgb || result.hemoglobin);
  if ($('#fbc_pcv') && (result.hct || result.pcv)) $('#fbc_pcv').value = to2Dec(result.hct || result.pcv);
  if ($('#fbc_mcv') && result.mcv) $('#fbc_mcv').value = to2Dec(result.mcv);
  if ($('#fbc_mch') && result.mch) $('#fbc_mch').value = to2Dec(result.mch);
  if ($('#fbc_mchc') && result.mchc) $('#fbc_mchc').value = to2Dec(result.mchc);
  if ($('#fbc_rdw_cv') && result.rdw_cv) $('#fbc_rdw_cv').value = to2Dec(result.rdw_cv);
  if ($('#fbc_rdw_sd') && result.rdw_sd) $('#fbc_rdw_sd').value = to2Dec(result.rdw_sd);

  if ($('#fbc_platelets') && (result.plt || result.platelets)) $('#fbc_platelets').value = Math.round(parseFloat(result.plt || result.platelets));
  if ($('#fbc_mpv') && result.mpv) $('#fbc_mpv').value = to2Dec(result.mpv);
  if ($('#fbc_pdw') && result.pdw) $('#fbc_pdw').value = to2Dec(result.pdw);
  if ($('#fbc_pdw_sd') && (result.pdw_sd || result.pdw)) $('#fbc_pdw_sd').value = to2Dec(result.pdw_sd || result.pdw);
  if ($('#fbc_pdw_cv') && result.pdw_cv) $('#fbc_pdw_cv').value = to2Dec(result.pdw_cv);
  if ($('#fbc_pct') && result.pct) $('#fbc_pct').value = to2Dec(result.pct);
  if ($('#fbc_p_lcr') && result.p_lcr) $('#fbc_p_lcr').value = to2Dec(result.p_lcr);
  if ($('#fbc_p_lcc') && result.p_lcc) $('#fbc_p_lcc').value = Math.round(parseFloat(result.p_lcc));

  // Differential count (%) - always formatted as 2 digits without decimals (e.g. 02, 00, 03, 30, 65)
  const formatDiffVal = (v) => {
    if (v === undefined || v === null || v === '') return '';
    const n = Math.round(parseFloat(v));
    if (isNaN(n)) return String(v).trim();
    return (n < 10 && n >= 0) ? '0' + n : String(n);
  };

  if ($('#fbc_diff_neutrophil') && (result.neutrophil || result.gran_percent)) {
    $('#fbc_diff_neutrophil').value = formatDiffVal(result.neutrophil || result.gran_percent);
  }
  if ($('#fbc_diff_lymphocyte') && (result.lymphocyte || result.lym_percent)) {
    $('#fbc_diff_lymphocyte').value = formatDiffVal(result.lymphocyte || result.lym_percent);
  }
  if ($('#fbc_diff_monocyte') && (result.monocyte || result.mid_percent)) {
    $('#fbc_diff_monocyte').value = formatDiffVal(result.monocyte || result.mid_percent);
  }
  if ($('#fbc_diff_eosinophil') && (result.eosinophil !== undefined && result.eosinophil !== '')) {
    $('#fbc_diff_eosinophil').value = formatDiffVal(result.eosinophil);
  }
  if ($('#fbc_diff_basophil') && (result.basophil !== undefined && result.basophil !== '')) {
    $('#fbc_diff_basophil').value = formatDiffVal(result.basophil);
  }

  // Analyzer message boxes
  if ($('#fbc_wbc_message') && result.wbc_message) $('#fbc_wbc_message').value = result.wbc_message;
  if ($('#fbc_rbc_message') && result.rbc_message) $('#fbc_rbc_message').value = result.rbc_message;
  if ($('#fbc_plt_message') && result.plt_message) $('#fbc_plt_message').value = result.plt_message;

  // Comments / Flags
  if ($('#fbc_comments') && result.comments) {
    $('#fbc_comments').value = result.comments;
  }

  // Histograms
  if (result.wbc_histogram) {
    if ($('#fbc_wbc_histogram')) $('#fbc_wbc_histogram').value = result.wbc_histogram;
    if ($('#fbcWbcHistoImg')) $('#fbcWbcHistoImg').src = `data:image/png;base64,${result.wbc_histogram}`;
    if ($('#fbcPrevWbcImg')) $('#fbcPrevWbcImg').src = `data:image/png;base64,${result.wbc_histogram}`;
  }
  if (result.rbc_histogram) {
    if ($('#fbc_rbc_histogram')) $('#fbc_rbc_histogram').value = result.rbc_histogram;
    if ($('#fbcRbcHistoImg')) $('#fbcRbcHistoImg').src = `data:image/png;base64,${result.rbc_histogram}`;
    if ($('#fbcPrevRbcImg')) $('#fbcPrevRbcImg').src = `data:image/png;base64,${result.rbc_histogram}`;
  }
  if (result.plt_histogram) {
    if ($('#fbc_plt_histogram')) $('#fbc_plt_histogram').value = result.plt_histogram;
    if ($('#fbcPltHistoImg')) $('#fbcPltHistoImg').src = `data:image/png;base64,${result.plt_histogram}`;
    if ($('#fbcPrevPltImg')) $('#fbcPrevPltImg').src = `data:image/png;base64,${result.plt_histogram}`;
  }

  const histoBadge = $('#fbcHistoBadge');
  if (histoBadge) {
    histoBadge.textContent = (result.wbc_histogram || result.rbc_histogram || result.plt_histogram) ? 'H360 Machine Graphs' : 'Standard Graphs';
  }

  if (result.run_time) {
    window.h360RunTime = result.run_time;
  }
  if (result.test_time) {
    window.h360TestTime = result.test_time;
    setValue('report_time', result.test_time);
  }

  updatePreview();
  if (notify) {
    toast(`H360 results loaded (Sample: ${result.sample_id || 'Latest'}) with Histograms & Comments`);
  }
}

async function syncFromH360(manual = true) {
  const btn = $('#syncH360Btn');
  if (btn && manual) {
    btn.disabled = true;
    btn.innerHTML = '<span>Syncing...</span>';
  }
  const typedSample = $('#fbc_sync_sample_id')?.value?.trim();
  const sample = typedSample || (currentPatientRecord ? currentPatientRecord.ref_no : '') || $('#ref_no')?.value?.trim() || 'latest';
  try {
    const res = await fetch(`/api/h360/results/${encodeURIComponent(sample)}`);
    const data = await res.json();
    if (data.ok && data.result) {
      applyFbcValues(data.result, manual);
    } else if (data.latest) {
      latestH360Cache = data.latest;
      if (manual) {
        applyFbcValues(data.latest, true);
        toast(`Loaded latest H360 result (Sample: ${data.latest.sample_id || 'Machine'})`);
      } else {
        showH360Banner(data.latest);
      }
    } else {
      if (manual) toast(`No results found for '${sample}'. Please run sample on H360 first.`);
    }
  } catch (err) {
    if (manual) toast('Failed to connect to H360 service: ' + err.message);
  } finally {
    if (btn && manual) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:5px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>Sync from H360`;
    }
  }
}

function showH360Banner(result) {
  const banner = $('#fbcStatusBanner');
  const msg = $('#fbcStatusMsg');
  if (!banner || !msg) return;
  banner.hidden = false;
  msg.textContent = `H360 test result ready (Sample: ${result.sample_id || 'Latest'} ? WBC: ${result.wbc}, Hb: ${result.hgb}, PLT: ${result.plt})`;
}

function resetFbcDefaults() {
  const isFemale = String(currentPatientRecord?.gender || '').toLowerCase().startsWith('f');
  if ($('#fbc_wbc')) $('#fbc_wbc').value = '8.88';
  if ($('#fbc_lym_percent')) $('#fbc_lym_percent').value = '32.8';
  if ($('#fbc_mid_percent')) $('#fbc_mid_percent').value = '8.5';
  if ($('#fbc_gran_percent')) $('#fbc_gran_percent').value = '58.7';
  if ($('#fbc_lym_num')) $('#fbc_lym_num').value = '2.91';
  if ($('#fbc_mid_num')) $('#fbc_mid_num').value = '0.75';
  if ($('#fbc_gran_num')) $('#fbc_gran_num').value = '5.22';

  if ($('#fbc_rbc')) $('#fbc_rbc').value = isFemale ? '4.20' : '4.85';
  if ($('#fbc_hemoglobin')) $('#fbc_hemoglobin').value = isFemale ? '12.5' : '13.5';
  if ($('#fbc_pcv')) $('#fbc_pcv').value = isFemale ? '38.0' : '42.0';
  if ($('#fbc_mcv')) $('#fbc_mcv').value = '88.0';
  if ($('#fbc_mch')) $('#fbc_mch').value = '29.0';
  if ($('#fbc_mchc')) $('#fbc_mchc').value = '33.0';
  if ($('#fbc_rdw_cv')) $('#fbc_rdw_cv').value = '12.5';
  if ($('#fbc_rdw_sd')) $('#fbc_rdw_sd').value = '42.0';

  if ($('#fbc_platelets')) $('#fbc_platelets').value = '280';
  if ($('#fbc_mpv')) $('#fbc_mpv').value = '8.5';
  if ($('#fbc_pdw')) $('#fbc_pdw').value = '15.0';
  if ($('#fbc_pdw_sd')) $('#fbc_pdw_sd').value = '11.1';
  if ($('#fbc_pdw_cv')) $('#fbc_pdw_cv').value = '15.0';
  if ($('#fbc_pct')) $('#fbc_pct').value = '0.25';
  if ($('#fbc_p_lcr')) $('#fbc_p_lcr').value = '15.3';
  if ($('#fbc_p_lcc')) $('#fbc_p_lcc').value = '50';

  if ($('#fbc_diff_neutrophil')) $('#fbc_diff_neutrophil').value = '65';
  if ($('#fbc_diff_lymphocyte')) $('#fbc_diff_lymphocyte').value = '30';
  if ($('#fbc_diff_monocyte')) $('#fbc_diff_monocyte').value = '03';
  if ($('#fbc_diff_eosinophil')) $('#fbc_diff_eosinophil').value = '02';
  if ($('#fbc_diff_basophil')) $('#fbc_diff_basophil').value = '00';

  if ($('#fbc_wbc_message')) $('#fbc_wbc_message').value = '';
  if ($('#fbc_rbc_message')) $('#fbc_rbc_message').value = '';
  if ($('#fbc_plt_message')) $('#fbc_plt_message').value = '';

  if ($('#fbc_comments')) $('#fbc_comments').value = 'Normal cell morphology and count distribution';
  if ($('#fbc_wbc_histogram')) $('#fbc_wbc_histogram').value = '';
  if ($('#fbc_rbc_histogram')) $('#fbc_rbc_histogram').value = '';
  if ($('#fbc_plt_histogram')) $('#fbc_plt_histogram').value = '';

  if ($('#fbcWbcHistoImg')) $('#fbcWbcHistoImg').src = '/assets/h360-wbc.png';
  if ($('#fbcRbcHistoImg')) $('#fbcRbcHistoImg').src = '/assets/h360-rbc.png';
  if ($('#fbcPltHistoImg')) $('#fbcPltHistoImg').src = '/assets/h360-plt.png';
  if ($('#fbcPrevWbcImg')) $('#fbcPrevWbcImg').src = '/assets/h360-wbc.png';
  if ($('#fbcPrevRbcImg')) $('#fbcPrevRbcImg').src = '/assets/h360-rbc.png';
  if ($('#fbcPrevPltImg')) $('#fbcPrevPltImg').src = '/assets/h360-plt.png';

  const histoBadge = $('#fbcHistoBadge');
  if (histoBadge) histoBadge.textContent = 'Standard Graphs';

  window.h360RunTime = null;
  window.h360TestTime = null;

  updatePreview();
  toast('Reset to standard healthy adult normal values');
}

async function checkH360Status() {
  try {
    const res = await fetch('/api/h360/status');
    if (!res.ok) return;
    const s = await res.json();
    const statusEl = $('#h360Status');

    if (s.latestResult) {
      latestH360Cache = s.latestResult;
      const isFbc = $('#test_name')?.value === 'Full Blood Count';
      const sample = currentPatientRecord ? currentPatientRecord.ref_no : '';
      const rId = String(s.latestResult.sample_id || '').toUpperCase();
      const sId = String(sample || '').toUpperCase();
      const matchesCurrent = sample && (rId === sId || rId.endsWith(sId) || sId.endsWith(rId));

      if (isFbc && matchesCurrent && $('#fbc_wbc') && !$('#fbc_wbc').dataset.manualEdited) {
        applyFbcValues(s.latestResult, false);
      } else if (isFbc && $('#fbcStatusBanner')) {
        showH360Banner(s.latestResult);
      }
    }

    if (!statusEl) return;

    if (s.lastSent && (!currentPatientRecord || currentPatientRecord.ref_no === s.lastSent.sample_id)) {
      statusEl.textContent = `Ready on H360: ${s.lastSent.firstName || s.lastSent.fname || ''} ${s.lastSent.lastName || s.lastSent.lname || ''} • PID: ${s.lastSent.passport} • Sent at ${s.lastSent.time}`;
      statusEl.className = 'h360-status-text success';
    } else if (s.activeConnections > 0) {
      if (!statusEl.textContent.startsWith('Ready')) {
        statusEl.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:5px;"></span> H360 Machine Connected (' + s.activeConnections + ' active) • Ready to send';
        statusEl.className = 'h360-status-text success';
      }
    } else {
      if (!statusEl.textContent.startsWith('Ready')) {
        statusEl.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ca8a04;margin-right:5px;"></span> Waiting for H360 connection on Port 5600...';
        statusEl.className = 'h360-status-text';
      }
    }
  } catch {}
}

checkH360Status();
setInterval(checkH360Status, 8000);

$('#sendH360Btn')?.addEventListener('click', () => sendPatientToH360(false));

$('#resetType10bBtn')?.addEventListener('click', () => {
  if ($('#type10b_diff_neutrophil')) $('#type10b_diff_neutrophil').value = '45';
  if ($('#type10b_diff_lymphocyte')) $('#type10b_diff_lymphocyte').value = '46';
  if ($('#type10b_diff_monocyte')) $('#type10b_diff_monocyte').value = '06';
  if ($('#type10b_diff_eosinophil')) $('#type10b_diff_eosinophil').value = '03';
  if ($('#type10b_diff_basophil')) $('#type10b_diff_basophil').value = '00';
  updatePreview();
  toast('Differential count reset to defaults');
});

['type10b_diff_neutrophil', 'type10b_diff_lymphocyte', 'type10b_diff_monocyte', 'type10b_diff_eosinophil', 'type10b_diff_basophil'].forEach(id => {
  $(`#${id}`)?.addEventListener('input', () => updatePreview());
});

updatePreview();

// ==========================================
// SUPER ADMIN & LAB SECURITY CONTROLLER
// ==========================================

async function fetchSecurityStatus() {
  try {
    const res = await fetch('/api/security/status');
    if (!res.ok) return;
    const status = await res.json();
    cachedSecurityStatus = status;
    applySecurityStatusToUI(status);
  } catch (err) {
    console.warn('Security status fetch failed:', err);
  }
}

function applySecurityStatusToUI(status) {
  if (!status) return;

  // 1. Emergency lockdown banner & Login Screen lockdown
  const banner = $('#systemLockBanner');
  const bannerReason = $('#systemLockBannerReason');
  if (banner) {
    if (status.lockAllReports) {
      banner.hidden = false;
      if (bannerReason) {
        bannerReason.textContent = status.lockReason || 'Report generation and logins are currently restricted by Super Admin.';
      }
    } else {
      banner.hidden = true;
    }
  }

  // Update login screen if lockdown is active
  const loginBtn = $('#loginBtn');
  const loginBtnText = $('#loginBtnText');
  let loginLockStrip = $('#loginLockdownAlert');

  if (status.lockAllReports) {
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.style.opacity = '0.6';
      loginBtn.style.cursor = 'not-allowed';
    }
    if (loginBtnText) {
      loginBtnText.textContent = '🔒 System Locked Down (Access Blocked)';
    }
    const loginForm = $('#loginForm');
    if (!loginLockStrip && loginForm) {
      loginLockStrip = document.createElement('div');
      loginLockStrip.id = 'loginLockdownAlert';
      loginLockStrip.style.cssText = 'background:#fef2f2; border:1.5px solid #ef4444; border-radius:10px; padding:12px 14px; margin-bottom:16px; color:#991b1b; font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:10px;';
      loginLockStrip.innerHTML = '<span style="font-size:18px;">🚨</span><div><div>SYSTEM LOCKDOWN ACTIVE</div><div style="font-size:11px; font-weight:400; color:#b91c1c; margin-top:2px;">System login is disabled by Administrator (' + (status.lockReason || 'Maintenance') + ').</div></div>';
      loginForm.prepend(loginLockStrip);
    } else if (loginLockStrip) {
      loginLockStrip.style.display = 'flex';
    }
  } else {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.style.opacity = '1';
      loginBtn.style.cursor = 'pointer';
    }
    if (loginBtnText) {
      loginBtnText.textContent = `Sign In to ${getBranchMeta(currentBranch).label} Branch`;
    }
    if (loginLockStrip) {
      loginLockStrip.style.display = 'none';
    }
  }

  // 2. Navigation Status Dot
  const rawAllowed = Array.isArray(status.allowedTests)
    ? status.allowedTests
    : (status.allowedTests ? Object.keys(status.allowedTests).filter(k => !!status.allowedTests[k]) : []);
  const totalCount = status.totalTests || Object.keys(status.testPermissions || {}).length || 21;

  const dot = $('#superAdminDot');
  if (dot) {
    dot.className = 'admin-status-dot';
    if (status.lockAllReports) {
      dot.classList.add('locked');
      dot.title = 'System Lockdown Active';
    } else if (totalCount && rawAllowed.length < totalCount) {
      dot.classList.add('warning');
      dot.title = `${rawAllowed.length} of ${totalCount} tests enabled`;
    } else {
      dot.classList.add('active');
      dot.title = 'Normal security status - all permitted';
    }
  }

  // 3. Export Buttons (PDF, Excel, Word)
  const isLocked = !!status.lockAllReports;
  const allowPdf = !isLocked && (status.allowedExportFormats ? status.allowedExportFormats.pdf !== false : true);
  const allowExcel = !isLocked && (status.allowedExportFormats ? status.allowedExportFormats.excel !== false : true);
  const allowWord = !isLocked && (status.allowedExportFormats ? status.allowedExportFormats.word !== false : true);

  const pdfBtn = $('#pdfBtn');
  const pdfPlainBtn = $('#pdfPlainBtn');
  const printPlainBtn = $('#printPlainBtn');
  const excelBtn = $('#excelBtn');
  const wordBtn = $('#wordBtn');

  if (pdfBtn) {
    pdfBtn.disabled = !allowPdf;
    pdfBtn.title = allowPdf ? 'Export PDF' : (isLocked ? 'Locked by Super Admin' : 'PDF export disabled by Super Admin');
  }
  if (pdfPlainBtn) {
    pdfPlainBtn.disabled = !allowPdf;
  }
  if (printPlainBtn) {
    printPlainBtn.disabled = !allowPdf;
  }
  if (excelBtn) {
    excelBtn.disabled = !allowExcel;
    excelBtn.title = allowExcel ? 'Export Excel' : (isLocked ? 'Locked by Super Admin' : 'Excel export disabled by Super Admin');
  }
  if (wordBtn) {
    wordBtn.disabled = !allowWord;
    wordBtn.title = allowWord ? 'Export Word' : (isLocked ? 'Locked by Super Admin' : 'Word export disabled by Super Admin');
  }

  // 4. Test dropdown permissions
  const testSelect = $('#test_name');
  if (testSelect) {
    const allowedSet = new Set(rawAllowed.map(s => String(s).trim().toLowerCase()));
    Array.from(testSelect.options).forEach(opt => {
      const val = opt.value.trim().toLowerCase();
      if (!val || val.includes('-- select')) return;
      const isAllowed = allowedSet.has(val);
      opt.disabled = !isAllowed;
      const baseName = opt.getAttribute('data-base-name') || opt.textContent.replace(/\s*\(Disabled\)$/, '');
      opt.setAttribute('data-base-name', baseName);
      opt.textContent = isAllowed ? baseName : `${baseName} (Disabled)`;
    });
  }
}

// Open / Close modal
function openSuperAdminModal() {
  const modal = $('#superAdminModal');
  if (!modal) return;
  modal.hidden = false;
  if (adminAuthToken) {
    loadAdminConsole();
  } else {
    showAdminLoginView();
  }
}

function closeSuperAdminModal() {
  const modal = $('#superAdminModal');
  if (modal) modal.hidden = true;
}

function showAdminLoginView() {
  if ($('#superAdminLoginView')) $('#superAdminLoginView').hidden = false;
  if ($('#superAdminConsoleView')) $('#superAdminConsoleView').hidden = true;
  if ($('#superAdminLoginErr')) $('#superAdminLoginErr').hidden = true;
  if ($('#adminUsernameInput')) {
    $('#adminUsernameInput').value = '';
    $('#adminUsernameInput').focus();
  }
  if ($('#adminPassInput')) $('#adminPassInput').value = '';
}

async function loadAdminConsole() {
  try {
    const res = await fetch('/api/admin/config', {
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (!res.ok) {
      sessionStorage.removeItem('adminAuthToken');
      adminAuthToken = '';
      showAdminLoginView();
      return;
    }
    const data = await res.json();
    fullSecurityConfig = data.config;
    if ($('#superAdminLoginView')) $('#superAdminLoginView').hidden = true;
    if ($('#superAdminConsoleView')) $('#superAdminConsoleView').hidden = false;
    renderAdminConsole(fullSecurityConfig);
  } catch (err) {
    console.error('Failed to load admin console:', err);
    toast('Error loading admin configuration');
  }
}

function renderAdminConsole(config) {
  if (!config) return;

  // Emergency lockdown toggle
  const lockToggle = $('#adminLockAllToggle');
  const reasonInput = $('#adminLockReasonInput');

  if (lockToggle) {
    lockToggle.checked = !!config.lockAllReports;
    updateLockdownVisuals(config.lockAllReports);
  }
  if (reasonInput) {
    reasonInput.value = config.lockReason || '';
  }

  // Export format switches
  if ($('#adminAllowPdfToggle')) $('#adminAllowPdfToggle').checked = config.allowedExportFormats?.pdf !== false;
  if ($('#adminAllowExcelToggle')) $('#adminAllowExcelToggle').checked = config.allowedExportFormats?.excel !== false;
  if ($('#adminAllowWordToggle')) $('#adminAllowWordToggle').checked = config.allowedExportFormats?.word !== false;
  if ($('#adminAllowNoLetterheadToggle')) $('#adminAllowNoLetterheadToggle').checked = config.allowNoLetterhead !== false;

  // Categorized test permissions
  renderCategorizedTests(config.testPermissions || {});

  // Custom Tests Table
  renderCustomTestsTable(config.customTests || []);

  // Audit Log Table
  renderAuditTable(config.auditLog || []);
}

function updateLockdownVisuals(isLocked) {
  const lockLabel = $('#adminLockLabel');
  const lockBadge = $('#adminLockIndicatorBadge');
  const reasonBox = $('#adminLockReasonBox');
  if (lockLabel) {
    lockLabel.textContent = isLocked ? 'Emergency System Lockdown: ACTIVE' : 'Emergency System Lockdown: OFF';
    lockLabel.style.color = isLocked ? '#b91c1c' : '#0f172a';
  }
  if (lockBadge) {
    lockBadge.textContent = isLocked ? 'LOCKDOWN ACTIVE' : 'SYSTEM UNLOCKED';
    lockBadge.style.background = isLocked ? '#fee2e2' : '#e2e8f0';
    lockBadge.style.color = isLocked ? '#991b1b' : '#475569';
  }
  if (reasonBox) {
    reasonBox.style.display = isLocked ? 'block' : 'none';
  }
}

function renderCategorizedTests(testPermissions) {
  const container = $('#adminTestsContainer');
  if (!container) return;

  const categories = {};
  let totalCount = 0;
  let enabledCount = 0;

  Object.entries(testPermissions).forEach(([testName, perm]) => {
    const cat = perm.category || 'General Tests';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ name: testName, enabled: !!perm.enabled });
    totalCount++;
    if (perm.enabled) enabledCount++;
  });

  const countBadge = $('#enabledTestsCount');
  if (countBadge) countBadge.textContent = `${enabledCount} of ${totalCount}`;

  let html = '';
  Object.keys(categories).sort().forEach(cat => {
    const tests = categories[cat];
    const catEnabledCount = tests.filter(t => t.enabled).length;
    html += `
      <div class="admin-category-card">
        <div class="admin-category-header">
          <span class="admin-category-title">${cat}</span>
          <span class="admin-category-count">${catEnabledCount}/${tests.length} Allowed</span>
        </div>
        <div class="admin-test-items">
          ${tests.map(t => `
            <div class="admin-test-row">
              <span class="admin-test-title" title="${t.name}">${t.name}</span>
              <label class="switch-control">
                <input type="checkbox" class="admin-test-toggle" data-test-name="${t.name}" ${t.enabled ? 'checked' : ''}>
                <span class="switch-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Live change listeners
  container.querySelectorAll('.admin-test-toggle').forEach(input => {
    input.addEventListener('change', () => {
      const all = container.querySelectorAll('.admin-test-toggle');
      const active = container.querySelectorAll('.admin-test-toggle:checked');
      if (countBadge) countBadge.textContent = `${active.length} of ${all.length}`;
    });
  });
}

function renderAuditTable(auditLog) {
  const tbody = $('#adminAuditTableBody');
  if (!tbody) return;

  if (!Array.isArray(auditLog) || auditLog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:#94a3b8; font-style:italic;">No security audit events recorded yet.</td></tr>`;
    return;
  }

  const reversed = [...auditLog].reverse();
  tbody.innerHTML = reversed.slice(0, 50).map(entry => {
    const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-GB', { hour12: false }) : '-';
    const isSuccess = entry.status === 'ALLOWED' || entry.status === 'SUCCESS';
    const statusBadge = isSuccess
      ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 8px; border-radius:4px; font-size:11px;">ALLOWED</span>`
      : `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700; padding:2px 8px; border-radius:4px; font-size:11px;">BLOCKED</span>`;
    
    return `
      <tr>
        <td style="white-space:nowrap; font-size:11.5px; color:#475569;">${timeStr}</td>
        <td><strong style="font-size:12px; color:#0f172a;">${entry.action || '-'}</strong></td>
        <td style="font-size:12px;">${entry.test || '-'}</td>
        <td style="font-size:12px; color:#334155;">${entry.ref_no ? `Ref #${entry.ref_no}` : (entry.details || '-')}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// Admin Tab Buttons
$$('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    $$('.admin-tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = $(`#${btn.dataset.tab}`);
    if (target) target.classList.add('active');
  });
});

// Lockdown toggle event
$('#adminLockAllToggle')?.addEventListener('change', e => {
  updateLockdownVisuals(e.target.checked);
});

// Enable / Disable All
$('#adminEnableAllTestsBtn')?.addEventListener('click', () => {
  $$('#adminTestsContainer .admin-test-toggle').forEach(t => t.checked = true);
  const countBadge = $('#enabledTestsCount');
  const all = $$('#adminTestsContainer .admin-test-toggle').length;
  if (countBadge) countBadge.textContent = `${all} of ${all}`;
});
$('#adminDisableAllTestsBtn')?.addEventListener('click', () => {
  $$('#adminTestsContainer .admin-test-toggle').forEach(t => t.checked = false);
  const countBadge = $('#enabledTestsCount');
  const all = $$('#adminTestsContainer .admin-test-toggle').length;
  if (countBadge) countBadge.textContent = `0 of ${all}`;
});

// Login Form Submit
$('#superAdminLoginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('#adminUsernameInput')?.value?.trim();
  const pass = $('#adminPassInput')?.value?.trim();
  const errEl = $('#superAdminLoginErr');
  if (!username || !pass) return;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = data.error || 'Invalid Super Admin username or password';
        errEl.hidden = false;
      }
      return;
    }
    adminAuthToken = data.token;
    sessionStorage.setItem('adminAuthToken', adminAuthToken);
    if (errEl) errEl.hidden = true;
    await loadAdminConsole();
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Server connection error';
      errEl.hidden = false;
    }
  }
});

// Save Security Policy
$('#adminSaveConfigBtn')?.addEventListener('click', async () => {
  if (!adminAuthToken || !fullSecurityConfig) return;

  const updatedTestPermissions = { ...fullSecurityConfig.testPermissions };
  $$('#adminTestsContainer .admin-test-toggle').forEach(input => {
    const name = input.getAttribute('data-test-name');
    if (updatedTestPermissions[name]) {
      updatedTestPermissions[name].enabled = input.checked;
    }
  });

  const payload = {
    lockAllReports: $('#adminLockAllToggle')?.checked ?? false,
    lockReason: $('#adminLockReasonInput')?.value?.trim() || 'Routine Maintenance / Security Review',
    allowedExportFormats: {
      pdf: $('#adminAllowPdfToggle')?.checked ?? true,
      excel: $('#adminAllowExcelToggle')?.checked ?? true,
      word: $('#adminAllowWordToggle')?.checked ?? true
    },
    allowNoLetterhead: $('#adminAllowNoLetterheadToggle')?.checked ?? true,
    testPermissions: updatedTestPermissions
  };

  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify(payload)
    });
    const resData = await res.json();
    if (!res.ok) {
      toast(resData.error || 'Failed to save configuration');
      return;
    }
    fullSecurityConfig = resData.config;
    const saveNotice = $('#adminSaveNotice');
    if (saveNotice) {
      saveNotice.style.display = 'inline';
      setTimeout(() => { saveNotice.style.display = 'none'; }, 3000);
    }
    toast('Security policy updated and enforced!');
    fetchSecurityStatus();
  } catch (err) {
    toast('Error saving configuration');
  }
});

// Password & PIN Change
$('#adminPasswordChangeForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const noticeEl = $('#adminPassChangeNotice');
  const currentPassword = $('#adminCurrentPass')?.value;
  const newPassword = $('#adminNewPass')?.value;
  const newPin = $('#adminNewPin')?.value;

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword, newPin })
    });
    const data = await res.json();
    if (!res.ok) {
      if (noticeEl) {
        noticeEl.textContent = data.error || 'Password update failed';
        noticeEl.hidden = false;
        noticeEl.style.background = '#fee2e2';
        noticeEl.style.color = '#b91c1c';
      }
      return;
    }
    if (noticeEl) {
      noticeEl.textContent = 'Password and PIN updated successfully!';
      noticeEl.hidden = false;
      noticeEl.style.background = '#dcfce7';
      noticeEl.style.color = '#15803d';
    }
    $('#adminCurrentPass').value = '';
    $('#adminNewPass').value = '';
    $('#adminNewPin').value = '';
    toast('Credentials updated successfully');
  } catch (err) {
    if (noticeEl) {
      noticeEl.textContent = 'Connection error';
      noticeEl.hidden = false;
    }
  }
});

// Clear Audit Log
$('#adminClearAuditBtn')?.addEventListener('click', async () => {
  if (!confirm('Clear the entire security audit log?')) return;
  try {
    const res = await fetch('/api/admin/clear-audit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (res.ok) {
      if (fullSecurityConfig) fullSecurityConfig.auditLog = [];
      renderAuditTable([]);
      toast('Audit log cleared');
    }
  } catch {}
});

// Logout
$('#adminLogoutBtn')?.addEventListener('click', () => {
  adminAuthToken = '';
  sessionStorage.removeItem('adminAuthToken');
  showAdminLoginView();
  toast('Super Admin logged out');
});

// Triggers
$('#superAdminBtn')?.addEventListener('click', openSuperAdminModal);
$('#lockBannerAdminBtn')?.addEventListener('click', openSuperAdminModal);
$('#closeSuperAdminModalBtn')?.addEventListener('click', closeSuperAdminModal);
$('#superAdminModal')?.addEventListener('click', e => {
  if (e.target === $('#superAdminModal')) closeSuperAdminModal();
});

// ==============================================================================
// CUSTOM TEST REPORTS MANAGEMENT (SUPER ADMIN & LAB STAFF)
// ==============================================================================

async function loadCustomTests() {
  try {
    const res = await fetch('/api/custom-tests');
    if (!res.ok) return;
    const json = await res.json();
    if (json.ok && Array.isArray(json.tests)) {
      loadedCustomTests = json.tests;
      syncCustomTestsToDropdown(loadedCustomTests);
    }
  } catch (err) {
    console.warn('Failed to load custom tests:', err);
  }
}

function syncCustomTestsToDropdown(tests) {
  const testSelect = $('#test_name');
  if (!testSelect) return;

  let group = testSelect.querySelector('#customTestsOptgroup');
  if (!group) {
    group = document.createElement('optgroup');
    group.id = 'customTestsOptgroup';
    group.label = 'Custom Test Reports / පාරිභෝගික වාර්තා';
    testSelect.appendChild(group);
  }
  group.innerHTML = '';
  (tests || []).filter(t => t.enabled !== false).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.testLabel ? `${t.testLabel} (${t.name})` : t.name;
    opt.setAttribute('data-custom-test', 'true');
    group.appendChild(opt);
  });

  if (cachedSecurityStatus) applySecurityStatusToUI(cachedSecurityStatus);

  // Check URL query param for test selection (e.g. from Admin console "Print / Test")
  try {
    const params = new URLSearchParams(window.location.search);
    const testParam = params.get('test');
    if (testParam && testSelect) {
      testSelect.value = testParam;
      updateTest();
      updatePreview();
    }
  } catch {}
}

function renderCustomTestsTable(tests) {
  const tbody = $('#adminCustomTestsTableBody');
  const countBadge = $('#customTestsTabCount');
  if (countBadge) countBadge.textContent = String((tests || []).length);
  if (!tbody) return;

  if (!Array.isArray(tests) || tests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:#94a3b8; font-style:italic;">No custom test reports created yet. Create one above!</td></tr>`;
    return;
  }

  tbody.innerHTML = tests.map(t => {
    const isEnabled = t.enabled !== false;
    const typeLabel = t.resultType === 'numeric' ? 'Numeric Value'
      : t.resultType === 'reactive_nonreactive' ? 'Non-Reactive / Reactive'
      : t.resultType === 'normal_abnormal' ? 'Normal / Abnormal'
      : (t.resultOptions ? t.resultOptions.join(', ') : 'Negative / Positive');

    return `
      <tr>
        <td>
          <strong style="color:#0f172a; font-size:12.5px;">${t.testLabel || t.name}</strong>
          ${t.testLabel && t.testLabel !== t.name ? `<div style="font-size:11px; color:#64748b;">ID: ${t.name}</div>` : ''}
        </td>
        <td><span class="badge" style="background:#eff6ff; color:#1e40af; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600;">${t.category || 'General'}</span></td>
        <td style="font-size:11.5px; color:#334155;">
          <strong>${t.resultType || 'Options'}:</strong>
          <div style="font-size:11px; color:#64748b;">${typeLabel}</div>
        </td>
        <td style="font-size:11.5px; color:#475569;">
          <div>${t.method || 'Rapid Test'}</div>
          <small style="color:#64748b;">Specimen: ${t.specimen || 'Blood'}</small>
        </td>
        <td>
          <label class="switch-control">
            <input type="checkbox" class="admin-custom-test-toggle" data-test-id="${t.id}" ${isEnabled ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </td>
        <td style="text-align:right; white-space:nowrap;">
          <button type="button" class="btn primary btn-xs admin-use-custom-test-btn" data-test-name="${t.name}" title="Use this test in Generator and prepare to Print" style="margin-right:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Test
          </button>
          <button type="button" class="btn secondary btn-xs admin-del-custom-test-btn" data-test-id="${t.id}" data-test-name="${t.name}" style="color:#ef4444;" title="Delete Custom Test">
            &times;
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach toggle listeners
  tbody.querySelectorAll('.admin-custom-test-toggle').forEach(input => {
    input.addEventListener('change', async () => {
      const id = input.getAttribute('data-test-id');
      try {
        await fetch(`/api/admin/custom-tests/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          },
          body: JSON.stringify({ enabled: input.checked })
        });
        toast('Custom test status updated');
        await loadCustomTests();
      } catch {}
    });
  });

  // Attach delete listeners
  tbody.querySelectorAll('.admin-del-custom-test-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-test-id');
      const name = btn.getAttribute('data-test-name');
      if (!confirm(`Delete custom test "${name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/custom-tests/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminAuthToken}` }
        });
        if (res.ok) {
          toast(`Custom test "${name}" deleted`);
          await loadAdminConsole();
          await loadCustomTests();
        }
      } catch {}
    });
  });

  // Attach "Print / Test" listeners
  tbody.querySelectorAll('.admin-use-custom-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const testName = btn.getAttribute('data-test-name');
      closeSuperAdminModal();
      const testSelect = $('#test_name');
      if (testSelect) {
        testSelect.value = testName;
        updateTest();
        updatePreview();
        toast(`Selected "${testName}". Ready to enter results and print.`);
        $('#preview')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Result Type dropdown switch in Admin form
$('#adminCtType')?.addEventListener('change', e => {
  const type = e.target.value;
  const wrap = $('#adminCtOptionsWrap');
  const optInput = $('#adminCtOptions');
  if (type === 'pos_neg') {
    if (wrap) wrap.style.display = 'block';
    if (optInput) optInput.value = 'Negative, Positive';
  } else if (type === 'reactive_nonreactive') {
    if (wrap) wrap.style.display = 'block';
    if (optInput) optInput.value = 'Non-Reactive, Reactive';
  } else if (type === 'normal_abnormal') {
    if (wrap) wrap.style.display = 'block';
    if (optInput) optInput.value = 'Normal, Abnormal';
  } else if (type === 'numeric') {
    if (wrap) wrap.style.display = 'none';
  } else if (type === 'custom_options') {
    if (wrap) wrap.style.display = 'block';
    if (optInput) optInput.value = 'Negative, Positive, Weakly Positive';
  }
});

// Admin Custom Test form submit
$('#adminCustomTestForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!adminAuthToken) {
    alert('Please log in as Super Admin first');
    return;
  }

  const name = $('#adminCtName')?.value?.trim();
  const category = $('#adminCtCategory')?.value;
  const resultType = $('#adminCtType')?.value;
  const testLabel = $('#adminCtLabel')?.value?.trim() || name;
  const optionsRaw = $('#adminCtOptions')?.value?.trim();
  const unit = $('#adminCtUnit')?.value?.trim();
  const referenceRange = $('#adminCtRef')?.value?.trim();
  const method = $('#adminCtMethod')?.value?.trim() || 'Immunochromatography';
  const specimen = $('#adminCtSpecimen')?.value || 'Blood';

  let resultOptions = ['Negative', 'Positive'];
  if (resultType === 'reactive_nonreactive') {
    resultOptions = ['Non-Reactive', 'Reactive'];
  } else if (resultType === 'normal_abnormal') {
    resultOptions = ['Normal', 'Abnormal'];
  } else if (resultType === 'numeric') {
    resultOptions = [];
  } else if (optionsRaw) {
    resultOptions = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  try {
    const res = await fetch('/api/admin/custom-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        name, category, testLabel, resultType, resultOptions, unit, referenceRange, method, specimen
      })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create custom test');
      return;
    }
    toast(`Custom test "${name}" added successfully!`);
    $('#adminCtName').value = '';
    $('#adminCtLabel').value = '';
    $('#adminCtRef').value = '';
    $('#adminCtUnit').value = '';
    await loadAdminConsole();
    await loadCustomTests();
  } catch (err) {
    alert('Server error creating custom test');
  }
});

// ==========================================
// MEDICAL PACKAGES SYNC & GENERATOR INTEGRATION
// ==========================================

async function loadPackages() {
  try {
    const res = await fetch('/api/packages');
    if (!res.ok) return;
    const json = await res.json();
    if (json.ok && Array.isArray(json.packages)) {
      loadedPackages = json.packages;
      syncPackagesToDropdown(loadedPackages);
    }
  } catch (err) {
    console.warn('Failed to load packages:', err);
  }
}

const standardSingleTestsHtml = `
  <option value="">Select a test</option>
  <option>FBS</option>
    <option>Fasting Blood Sugar</option>
  <option>RBS</option>
  <option>Total Cholesterol</option>
  <option>SGPT</option>
  <option>SGOT</option>
  <option>SGPT &amp; SGOT</option>
  <option>Lipid Profile</option>
  <option>Total Bilirubine</option>
  <option>Serum Creatine</option>
  <option>Urine Full Report</option>
  <option>Haemoglobin A1C</option>
  <option>Full Blood Count</option>
  <option>Total β - HCG Concentration</option>
  <option>BETA H.C.G.</option>
  <option>Urine Drug Screening (12 Drugs)</option>
  <option>Urine Drug Screening (5 Drugs)</option>
  <option>Tuberculosis Rapid Test</option>
  <option>Brucellosis Test</option>
  <option>HIV Ag &amp; Ab Test</option>
`;

function syncPackagesToDropdown(packages) {
  const typeSelect = $('#report_type');
  const customOptGroup = $('#customPackagesOptGroup');
  if (!typeSelect) return;

  if (customOptGroup) {
    customOptGroup.innerHTML = '';
    const customPkgs = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs.length === 0) {
      customOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages created yet</option>';
    } else {
      customPkgs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.tests.length} Reports)`;
        opt.setAttribute('data-package-id', p.id);
        customOptGroup.appendChild(opt);
      });
    }
  }

  // Also sync custom packages into #test_name dropdown (#customPackagesTestOptGroup)
  const customTestOptGroup = document.getElementById('customPackagesTestOptGroup');
  if (customTestOptGroup) {
    customTestOptGroup.innerHTML = '';
    const customPkgs2 = (packages || []).filter(p => !p.isBuiltin && p.enabled !== false);
    if (customPkgs2.length === 0) {
      customTestOptGroup.innerHTML = '<option disabled style="font-style:italic;">No custom packages yet</option>';
    } else {
      customPkgs2.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.tests.length} Reports)`;
        opt.setAttribute('data-package-id', p.id);
        customTestOptGroup.appendChild(opt);
      });
    }
  }

  // Handle URL param ?package=
  try {
    const params = new URLSearchParams(window.location.search);
    const pkgParam = params.get('package');
    if (pkgParam && typeSelect) {
      typeSelect.value = pkgParam;
      handleReportTypeChange(pkgParam);
    }
  } catch {}
}

function handleReportTypeChange(selectedType) {
  const testSelect = $('#test_name');
  if (!testSelect) return;

  // For 'single', just clear the selection (dropdown already has all options in HTML)
  if (selectedType === 'single') {
    // Don't wipe innerHTML - just clear selection
    testSelect.value = '';
    updateTest();
    updatePreview();
    return;
  }

  // For built-in and custom packages: just set the value directly on the existing dropdown
  // The HTML dropdown already has all packages in the "Multi-Sheet Medical Packages" optgroup
  testSelect.value = selectedType;

  // If value didn't set (option not found), try matching by text
  if (testSelect.value !== selectedType) {
    Array.from(testSelect.options).forEach(opt => {
      if (opt.value === selectedType || opt.textContent.trim().startsWith(selectedType)) {
        opt.selected = true;
      }
    });
  }

  updateTest();
  updatePreview();
}


// Nav Shipping tab click listener
const navShippingBtn = document.getElementById('navShipping');
if (navShippingBtn) {
  navShippingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
    navShippingBtn.classList.add('active');
    const rType = document.getElementById('report_type');
    if (rType) rType.value = 'Shipping';
    handleReportTypeChange('Shipping');
    const shipSection = document.getElementById('shippingResults') || document.getElementById('test');
    if (shipSection) {
      shipSection.hidden = false;
      shipSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    toast('🚢 Shipping Medical Package selected (14 Reports)');
  });
}

$('#report_type')?.addEventListener('change', e => handleReportTypeChange(e.target.value));

// Bidirectional sync: when test_name changes, update report_type to match
$('#test_name')?.addEventListener('change', e => {
  const val = e.target.value;
  const typeSelect = $('#report_type');
  if (!typeSelect) return;
  const builtinPackages = ['Type 10 B', 'Type 10 B with urine drug', 'Type 11', 'Type 7'];
  if (builtinPackages.includes(val)) {
    typeSelect.value = val;
  } else {
    const isCustomPkg = loadedPackages.some(p => !p.isBuiltin && p.name === val && p.enabled !== false);
    if (isCustomPkg) {
      typeSelect.value = val;
    } else {
      typeSelect.value = 'single';
    }
  }
  updateTest();
  updatePreview();
});

// Cross-tab real-time synchronization with Super Admin Console
const neosysChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('neosys_security_sync') : null;
if (neosysChannel) {
  neosysChannel.onmessage = () => {
    fetchSecurityStatus();
    loadCustomTests();
    loadPackages();
  };
}
window.addEventListener('storage', e => {
  if (e.key === 'neosys_security_ping') {
    fetchSecurityStatus();
    loadCustomTests();
    loadPackages();
  }
});
window.addEventListener('focus', () => {
  fetchSecurityStatus();
  loadCustomTests();
  loadPackages();
});

// Run security status check, custom tests and packages loader on startup & every 3s
fetchSecurityStatus();
loadCustomTests();
loadPackages();
setInterval(() => {
  fetchSecurityStatus();
  loadCustomTests();
  loadPackages();
}, 3000);

// ==========================================
// Date Change (Manual Date Override) Module
// ==========================================
window.isManualDateActive = false;
window.manualSelectedDateISO = '';
window.manualSelectedDateFormatted = '';
window.originalPatientDate = '';

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOffsetISO(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatManualDate(isoString) {
  if (!isoString) return '';
  const parts = String(isoString).split(/[-/]/);
  if (parts.length === 3 && parts[0].length === 4) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d) ? isoString : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return isoString;
}

function setManualDateMode(active, chosenISO = '') {
  window.isManualDateActive = active;
  const panel = $('#dateChangePanel');
  const btnSystem = $('#btnModeSystemDate');
  const btnManual = $('#btnModeManualDate');
  const navBtn = $('#navDateChange');

  if (active) {
    if (panel) panel.style.display = 'block';
    if (btnSystem) {
      btnSystem.style.background = 'transparent';
      btnSystem.style.color = '#64748b';
    }
    if (btnManual) {
      btnManual.style.background = '#0d9488';
      btnManual.style.color = '#fff';
    }
    if (navBtn) navBtn.classList.add('active');

    const iso = chosenISO || window.manualSelectedDateISO || getTodayISO();
    applyManualDate(iso);
  } else {
    if (panel) panel.style.display = 'none';
    if (btnSystem) {
      btnSystem.style.background = '#0d9488';
      btnSystem.style.color = '#fff';
    }
    if (btnManual) {
      btnManual.style.background = 'transparent';
      btnManual.style.color = '#64748b';
    }
    if (navBtn) navBtn.classList.remove('active');

    // Restore original patient date
    const orig = window.originalPatientDate || reportDate(new Date());
    setValue('medical_date', orig);
    const hiddenDate = $('#reportForm [name="medical_date"]');
    if (hiddenDate) hiddenDate.value = orig;
    debouncedUpdatePreview();
    toast('Switched to System Date');
  }
}

function applyManualDate(isoString) {
  if (!isoString) return;
  window.manualSelectedDateISO = isoString;
  const formatted = formatManualDate(isoString);
  window.manualSelectedDateFormatted = formatted;

  const picker = $('#manualDatePicker');
  if (picker && picker.value !== isoString) picker.value = isoString;

  const txtDisplay = $('#manualDateTextDisplay');
  if (txtDisplay) txtDisplay.textContent = formatted;

  // Sync to Patient details display and hidden form
  setValue('medical_date', formatted);
  const hiddenDate = $('#reportForm [name="medical_date"]');
  if (hiddenDate) hiddenDate.value = isoString;

  debouncedUpdatePreview();
}

function setupDateChangeModule() {
  $('#btnModeSystemDate')?.addEventListener('click', () => setManualDateMode(false));
  $('#btnModeManualDate')?.addEventListener('click', () => {
    setManualDateMode(true);
    toast('Date Change Mode Activated');
  });

  $('#navDateChange')?.addEventListener('click', e => {
    e.preventDefault();
    setManualDateMode(true);
    $('#patient')?.scrollIntoView({ behavior: 'smooth' });
    toast('Date Change Tab Opened');
  });

  $('#editDateBtn')?.addEventListener('click', () => {
    setManualDateMode(true);
    $('#manualDatePicker')?.focus();
  });

  $('#manualDatePicker')?.addEventListener('change', e => {
    if (e.target.value) {
      applyManualDate(e.target.value);
      toast('Date set to ' + window.manualSelectedDateFormatted);
    }
  });

  $$('.date-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const offset = parseInt(btn.dataset.days || '0', 10);
      const iso = getOffsetISO(offset);
      applyManualDate(iso);
      toast('Date updated: ' + window.manualSelectedDateFormatted);
    });
  });

  $('#resetManualDateBtn')?.addEventListener('click', () => {
    if (window.originalPatientDate) {
      setValue('medical_date', window.originalPatientDate);
      const hiddenDate = $('#reportForm [name="medical_date"]');
      if (hiddenDate) hiddenDate.value = window.originalPatientDate;
      const txtDisplay = $('#manualDateTextDisplay');
      if (txtDisplay) txtDisplay.textContent = window.originalPatientDate;
      debouncedUpdatePreview();
      toast('Reset to NeoSys patient date: ' + window.originalPatientDate);
    } else {
      toast('No original patient date to reset to');
    }
  });

  $('#quickSelectType10bBtn')?.addEventListener('click', () => {
    const rType = $('#report_type');
    if (rType) {
      rType.value = 'Type 10 B';
      rType.dispatchEvent(new Event('change'));
      $('#test')?.scrollIntoView({ behavior: 'smooth' });
      toast('Type 10 B (with FBC & DC) selected!');
    }
  });
}

// Initialize Date Change Module
setupDateChangeModule();





// Setup Urine Drug Screening UI Handlers
function setupUrineDrugListeners() {
  const panelSelect = $('#drugPanelTypeSelect');
  if (panelSelect) {
    const handlePanelChange = () => {
      syncDrugGrid();
      updatePreview();
    };
    panelSelect.addEventListener('change', handlePanelChange);
    panelSelect.addEventListener('input', handlePanelChange);
  }

  // Live change on all drug selects
  document.querySelectorAll('.drug-select-status').forEach(sel => {
    const updateStyleAndPreview = () => {
      if (sel.value === 'Positive') {
        sel.style.backgroundColor = '#fee2e2';
        sel.style.color = '#dc2626';
        sel.style.borderColor = '#ef4444';
        sel.style.fontWeight = '700';
      } else {
        sel.style.backgroundColor = '#ffffff';
        sel.style.color = '#1e293b';
        sel.style.borderColor = '#cbd5e1';
        sel.style.fontWeight = '600';
      }
      updatePreview();
    };
    sel.addEventListener('change', updateStyleAndPreview);
    sel.addEventListener('input', updateStyleAndPreview);
    // Initial color
    if (sel.value === 'Positive') {
      sel.style.backgroundColor = '#fee2e2';
      sel.style.color = '#dc2626';
      sel.style.borderColor = '#ef4444';
      sel.style.fontWeight = '700';
    }
  });

  // All Negative reset
  $('#allNegativeDrugBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.drug-select-status').forEach(sel => {
      sel.value = 'Negative';
      sel.style.backgroundColor = '#ffffff';
      sel.style.color = '#1e293b';
      sel.style.borderColor = '#cbd5e1';
      sel.style.fontWeight = '600';
    });
    updatePreview();
    toast('All drug parameters set to Negative');
  });

  syncDrugGrid();
}

// Call on startup
setupUrineDrugListeners();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUrineDrugListeners);
} else {
  setupUrineDrugListeners();
}



  // Type 11 Live Input Sync
  window.type11_live_sync_attached = true;

  // Live input sync for Shipping Package
  const shipInputs = [
    'shipping_blood_alcohol', 'shipping_crp', 'shipping_esr', 'shipping_fbs',
    'shipping_creatinine', 'shipping_egfr', 'shipping_syphilis', 'shipping_vdrl',
    'shipping_cholesterol', 'shipping_sgpt', 'shipping_sgot', 'shipping_hba1c',
    'shipping_hcv', 'shipping_hbsag', 'shipping_hiv'
  ];
  shipInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updatePreview());
  });
  window.shipping_live_sync_attached = true;

  ['colombo_fbs', 'colombo_sgpt', 'colombo_sgot', 'colombo_gamma_gt', 'colombo_cholesterol', 'colombo_hdl', 'colombo_ldl', 'colombo_vldl', 'colombo_triglyceride', 'colombo_cho_hdl'].forEach(id => {
    $('#' + id)?.addEventListener('input', () => updatePreview());
  });

  $('#prevExcelBtnType11')?.addEventListener('click', () => $('#excelBtn')?.click());
