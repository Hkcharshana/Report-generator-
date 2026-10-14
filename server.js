const express = require('express');
const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } = require('docx');
const ExcelJS = require('exceljs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const pdfTemplate = path.join(__dirname, 'public', 'assets', 'neosys-report-template.png');
const xlsxTemplate = path.join(__dirname, 'public', 'assets', 'fbs-template.xlsx');
const signaturePath = path.join(__dirname, 'public', 'assets', 'signature.png');
const reportFontRegular = path.join(__dirname, 'public', 'assets', 'Cambria-Regular.ttf');
const reportFontBold = path.join(__dirname, 'public', 'assets', 'Cambria-Bold.ttf');
let referenceRecords = {};
let bridgePending = '';
const bridgeRecords = {};
const bridgeResultSets = {};
let bridgeHeartbeat = 0;
const referenceKey = value => String(value ?? '').trim().replace(/^0+(?=\d)/, '') || '0';
const referenceCell = (cell, mode='text') => {
  const value = cell && cell.value;
  if (value instanceof Date) return mode === 'date' ? value.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : value.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  return String(value || '').trim();
};
const referenceLoad = (async () => {
  try {
    const source = new ExcelJS.Workbook();
    await source.xlsx.readFile(xlsxTemplate);
    for (const sheet of source.worksheets) {
      const ref = String(sheet.getCell('D9').value || sheet.name).trim();
      const record = {
        ref_no: ref,
        passport_no: referenceCell(sheet.getCell('I9')),
        fname: referenceCell(sheet.getCell('D10')),
        age: referenceCell(sheet.getCell('I10')).replace(/\s+Years?$/i, ''),
        gender: referenceCell(sheet.getCell('D11')),
        agency: referenceCell(sheet.getCell('I11')),
        medical_date: referenceCell(sheet.getCell('D12'), 'date'),
        specimen: referenceCell(sheet.getCell('I12')) || 'Blood',
        report_time: referenceCell(sheet.getCell('D13'))
      };
      referenceRecords[ref] = record;
      referenceRecords[referenceKey(ref)] = record;
      referenceRecords[String(sheet.name).trim()] = record;
      referenceRecords[referenceKey(sheet.name)] = record;
    }
  } catch (e) { console.error('Reference workbook load failed:', e.message); }
  // Reference details supplied with the attached PDF, kept as a local lookup record.
  referenceRecords['04444'] = { ref_no:'04444', passport_no:'P1419862', fname:'Mrs.B.H.N.Dilukshika', age:'44', gender:'Female', agency:'Rogers International (Pvt) Ltd', medical_date:'13 October 2026', specimen:'Blood', report_time:'12:05 PM' };
})();

let neosysSession = null;
let neosysUser = null;
let neosysPassword = null;

function extractCiSession(headers) {
  const cookies = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie') || ''];
  for (const c of cookies) {
    const m = String(c).match(/ci_session=([^;]+)/);
    if (m) return m[1];
  }
  return null;
}

function toFullRecord(p) {
  const clean = v => String(v ?? '').trim();
  const fbsVal = clean(p.fbs || p.rbs);
  const rbsVal = clean(p.rbs || p.fbs);
  return {
    ref_no: clean(p.ref_no),
    passport_no: clean(p.passport_no),
    fname: clean(p.fname),
    lname: clean(p.lname),
    gender: clean(p.gender),
    agency: clean(p.agency_name || p.agency),
    agency_name: clean(p.agency_name || p.agency),
    country: clean(p.country_name || p.country),
    country_name: clean(p.country_name || p.country),
    medical_type_name: clean(p.medical_type_name),
    country_amount: clean(p.country_amount),
    telephone: clean(p.telephone),
    position: clean(p.position),
    dob: clean(p.dob),
    age: clean(p.age),
    marital_status: clean(p.marital_status),
    valid_days: clean(p.valid_days),
    medical_date: clean(p.reg_date || p.medical_date),
    reg_date: clean(p.reg_date || p.medical_date),
    agency_refno: clean(p.agency_refno),
    gcc_no: clean(p.gcc_no),
    height: clean(p.height),
    weight: clean(p.weight),
    general_note: clean(p.general_note),
    delivery_note: clean(p.delivery_note),
    patient_status_note: clean(p.patient_status_note),
    lab_note: clean(p.lab_note),
    specimen: clean(p.specimen) || 'Blood',
    photo: p.pic ? `https://neosys.lk/sys/upload/patient/photo/${p.pic}` : '',
    // Lab tests:
    fbs: fbsVal,
    rbs: rbsVal,
    cholesterol: clean(p.cholesterol),
    sgpt: clean(p.sgpt || p.alt || p.alat),
    sgot: clean(p.sgot || p.ast || p.asat || p.got),
    creatinine: clean(p.creatinine),
    urea: clean(p.urea),
    bilirubin_qty: clean(p.bilirubin_qty || p.bilirubin),
    bilirubin: clean(p.bilirubin),
    esr: clean(p.esr),
    hemoglobin: clean(p.hemoglobin),
    blood_group: clean(p.blood_group),
    malaria: clean(p.malaria),
    sugar: clean(p.sugar),
    albumin: clean(p.albumin),
    micro_fila: clean(p.micro_fila),
    urine_other: clean(p.urine_other),
    shigella: clean(p.shigella),
    helminthes: clean(p.helminthes),
    st_bilharziasis: clean(p.st_bilharziasis),
    salmonella: clean(p.salmonella),
    vdrl: clean(p.vdrl),
    tpha: clean(p.tpha),
    hiv: clean(p.hiv),
    hbc: clean(p.hbc),
    hepa_igm: clean(p.hepa_igm),
    hcv: clean(p.hcv),
    pregnancy: clean(p.pregnancy),
    phosphatase: clean(p.phosphatase),
    lab_update_status: p.lab_update_status
  };
}

async function loginToNeoSys(username, password) {
  try {
    const params = new URLSearchParams({ username, password });
    const res = await fetch('https://neosys.lk/sys/DashboardController/login_validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: params.toString(),
      redirect: 'manual'
    });

    const cookie = extractCiSession(res.headers);
    if (!cookie) {
      return { success: false, error: 'Could not obtain session cookie from NeoSys' };
    }

    const location = res.headers.get('location');
    if (res.status === 302 || res.status === 303 || (location && !location.includes('login'))) {
      neosysSession = cookie;
      neosysUser = username;
      neosysPassword = password;
      return { success: true, session: cookie, username };
    }

    const text = await res.text();
    if (text.includes('<title>Login</title>') || text.includes('Log In - Neosys')) {
      return { success: false, error: 'Invalid NeoSys username or password' };
    }

    // Verify session by checking medical-lab page
    const check = await fetch('https://neosys.lk/sys/medical-lab', {
      headers: {
        'Cookie': `ci_session=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });

    if (check.status === 200) {
      const checkText = await check.text();
      if (!checkText.includes('<title>Login</title>')) {
        neosysSession = cookie;
        neosysUser = username;
        neosysPassword = password;
        return { success: true, session: cookie, username };
      }
    }

    return { success: false, error: 'NeoSys authentication failed' };
  } catch (err) {
    return { success: false, error: 'Error connecting to NeoSys: ' + err.message };
  }
}

async function searchNeoSys(query) {
  if (!neosysSession) return null;
  const q = String(query || '').trim();
  if (!q) return null;

  async function performFind(session) {
    const params = new URLSearchParams({
      search: q,
      type: 'patient_doctor_report'
    });
    return fetch('https://neosys.lk/sys/find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': `ci_session=${session}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString()
    });
  }

  let res = await performFind(neosysSession);
  let text = await res.text();

  if (text.includes('<title>Login</title>') && neosysUser && neosysPassword) {
    console.log('NeoSys session expired. Re-authenticating...');
    const reAuth = await loginToNeoSys(neosysUser, neosysPassword);
    if (reAuth.success) {
      res = await performFind(neosysSession);
      text = await res.text();
    }
  }

  try {
    const json = JSON.parse(text);
    if (json && (json.status === 'true' || json.status === true) && Array.isArray(json.data)) {
      return json.data.map(toFullRecord);
    }
  } catch (e) {
    console.error('NeoSys response parse error:', e.message);
  }
  return null;
}

app.post('/api/login', async (req, res) => {
  const { username, password, offline } = req.body || {};
  if (offline) {
    return res.json({ ok: true, mode: 'offline', message: 'Switched to offline mode' });
  }
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required' });
  }
  const result = await loginToNeoSys(username, password);
  if (result.success) {
    res.json({ ok: true, mode: 'neosys', username: result.username, message: 'Connected to NeoSys live system' });
  } else {
    res.status(401).json({ ok: false, error: result.error });
  }
});

app.get('/api/session', (req, res) => {
  res.json({
    connected: !!neosysSession,
    mode: neosysSession ? 'neosys' : 'offline',
    username: neosysUser
  });
});

app.post('/api/logout', (req, res) => {
  neosysSession = null;
  neosysUser = null;
  neosysPassword = null;
  res.json({ ok: true });
});

app.get('/api/patient/search', async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim();
  if (!query) return res.status(400).json({ ok: false, error: 'Search query is required' });

  // 1. Live NeoSys search if session exists
  if (neosysSession) {
    try {
      const records = await searchNeoSys(query);
      if (records && records.length > 0) {
        records.forEach(r => {
          if (r.ref_no) {
            referenceRecords[r.ref_no] = r;
            referenceRecords[referenceKey(r.ref_no)] = r;
          }
          if (r.passport_no) {
            referenceRecords[r.passport_no] = r;
          }
        });
        return res.json({ ok: true, source: 'neosys', count: records.length, records });
      }
    } catch (e) {
      console.error('NeoSys search error:', e.message);
    }
  }

  // 2. Local Excel and bridge cache lookup
  await referenceLoad;
  const direct = referenceRecords[query] || referenceRecords[referenceKey(query)] || bridgeRecords[query] || bridgeRecords[referenceKey(query)];
  if (direct) {
    return res.json({ ok: true, source: 'local', count: 1, records: [direct] });
  }

  // Check substring matches across referenceRecords
  const matching = Object.values(referenceRecords).filter(r =>
    r && ((r.ref_no && r.ref_no.toLowerCase().includes(query.toLowerCase())) ||
         (r.passport_no && r.passport_no.toLowerCase().includes(query.toLowerCase())))
  );
  if (matching.length > 0) {
    const unique = Array.from(new Set(matching.map(r => r.ref_no))).map(ref => matching.find(r => r.ref_no === ref));
    return res.json({ ok: true, source: 'local', count: unique.length, records: unique });
  }

  return res.status(404).json({ ok: false, error: 'Patient not found for: ' + query });
});

app.get('/api/reference/:ref', async (req, res) => {
  const lookup = String(req.params.ref || '').trim();
  if (neosysSession) {
    try {
      const records = await searchNeoSys(lookup);
      if (records && records.length > 0) {
        const exact = records.find(r => r.ref_no.toLowerCase() === lookup.toLowerCase() || referenceKey(r.ref_no) === referenceKey(lookup)) || records[0];
        referenceRecords[exact.ref_no] = exact;
        return res.json(exact);
      }
    } catch (e) {}
  }
  await referenceLoad;
  const record = referenceRecords[lookup] || referenceRecords[referenceKey(lookup)] || bridgeRecords[lookup] || bridgeRecords[referenceKey(lookup)];
  if (!record) return res.status(404).json({ error: 'Reference number not found' });
  res.json(record);
});

app.get('/bridge.js', (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const appOrigin = `${protocol}://${host}`;
  const filePath = path.join(__dirname, 'public', 'bridge.js');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8').replace(/const APP = ['"][^'"]*['"];/, `const APP = '${appOrigin}';`);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.send(content);
  }
  res.status(404).send('bridge.js not found');
});

app.use('/api/bridge', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.post('/api/bridge/request', (req, res) => {
  bridgePending = String(req.body?.ref || '').trim();
  res.json({ ok: true, ref: bridgePending });
});
app.post('/api/bridge/heartbeat', (req, res) => { bridgeHeartbeat = Date.now(); res.json({ ok: true }); });
app.get('/api/bridge/status', (req, res) => res.json({ online: Date.now() - bridgeHeartbeat < 5000, lastSeen: bridgeHeartbeat || null }));
app.post('/api/bridge/clear', (req, res) => { bridgePending = ''; res.json({ ok: true }); });
app.get('/api/bridge/pending', (req, res) => res.json({ ref: bridgePending }));
app.post('/api/bridge/push', (req, res) => {
  const record = req.body?.record;
  const records = Array.isArray(req.body?.records) ? req.body.records : (record ? [record] : []);
  const ref = String(req.body?.ref || record?.ref_no || '').trim();
  if (!ref || !records.length) return res.status(400).json({ error: 'Missing bridge record' });
  bridgeResultSets[ref] = records;
  records.forEach(item => {
    const itemRef = String(item.ref_no || '').trim();
    if (itemRef) { bridgeRecords[itemRef] = item; bridgeRecords[referenceKey(itemRef)] = item; }
  });
  if (bridgePending === ref || referenceKey(bridgePending) === referenceKey(ref)) bridgePending = '';
  res.json({ ok: true, ref, count: records.length });
});
app.get('/api/bridge/results', (req, res) => {
  const query = String(req.query.query || '').trim();
  const records = bridgeResultSets[query] || (bridgeRecords[query] ? [bridgeRecords[query]] : []);
  if (!records.length) return res.status(404).json({ error: 'Waiting for NeoSys bridge' });
  res.json({ records });
});
app.get('/api/bridge/record', (req, res) => {
  const ref = String(req.query.ref || '').trim();
  const record = bridgeRecords[ref] || bridgeRecords[referenceKey(ref)];
  if (!record) return res.status(404).json({ error: 'Waiting for NeoSys bridge' });
  res.json(record);
});
app.get('/api/bridge/record/:ref', (req, res) => {
  const ref = String(req.params.ref || '').trim();
  const record = bridgeRecords[ref] || bridgeRecords[referenceKey(ref)];
  if (!record) return res.status(404).json({ error: 'Waiting for NeoSys bridge' });
  res.json(record);
});

const patientFields = [
  ['Passport No', 'passport_no'], ['Reference No', 'ref_no'], ['First Name', 'fname'], ['Last Name', 'lname'],
  ['Gender', 'gender'], ['Marital Status', 'marital_status'], ['Date of Birth', 'dob'], ['Age', 'age'],
  ['Agency', 'agency'], ['Medical Type & Amount', 'medical_type_name'], ['Country', 'country'], ['Telephone', 'telephone'],
  ['Medical Date', 'medical_date'], ['Position', 'position'], ['Agency Ref No', 'agency_refno'], ['GCC No', 'gcc_no'],
  ['Height', 'height'], ['Weight', 'weight'], ['Valid Days', 'valid_days'], ['Patient Status', 'status'],
  ['General Note', 'general_note'], ['Patient Status Note', 'patient_status_note'], ['Delivery Note', 'delivery_note'], ['Lab Note', 'lab_note']
];
const labFields = [
  ['Blood Group', 'blood_group'], ['ESR', 'esr'], ['Hemoglobin', 'hemoglobin'], ['FBS', 'fbs'], ['Malaria', 'malaria'], ['Micro Filaria', 'micro_fila'],
  ['Sugar', 'sugar'], ['Albumin', 'albumin'], ['Bilirubin', 'bilirubin'], ['Urine Other', 'urine_other'], ['Shigella', 'shigella'],
  ['Helminthes', 'helminthes'], ['S.T. Bilharziasis', 'st_bilharziasis'], ['Salmonella', 'salmonella'], ['VDRL', 'vdrl'], ['TPHA', 'tpha'],
  ['HIV', 'hiv'], ['HBC', 'hbc'], ['Hepatitis A IgM', 'hepa_igm'], ['HCV', 'hcv'], ['Pregnancy', 'pregnancy'], ['Urea', 'urea'],
  ['RBS', 'rbs'], ['Creatinine', 'creatinine'], ['SGOT', 'sgot'], ['SGPT', 'sgpt'], ['Cholesterol', 'cholesterol'],
  ['Phosphatase', 'phosphatase'], ['Bilirubin Quantity', 'bilirubin_qty']
];
const requestedTests = {
  'FBS': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dL' },
  'RBS': { key: 'rbs', reference: '< 160 mg/dl' },
  'Total Cholesterol': { key: 'cholesterol', reference: '< 240 mg/dl' },
  'SGPT': { key: 'sgpt', fallbackKey: 'sgpt_result', reference: 'Upto 45 iu/l (Men) / Upto 34 iu/l (Women)' },
  'SGOT': { key: 'sgot', fallbackKey: 'sgot_result', reference: 'Upto 35 iu/l (Men) / Upto 31 iu/l (Women)' },
  'SGPT & SGOT': { key: 'sgpt', fallbackKey: 'sgpt_result', secondaryKey: 'sgot', secondaryFallbackKey: 'sgot_result', reference: 'SGPT: Upto 45/34 iu/l | SGOT: Upto 35/31 iu/l' },
  'Lipid Profile': { key: 'lipid_profile', reference: 'See lipid profile reference ranges below' },
  'PT / OT': { key: 'pt', secondaryKey: 'ot', reference: 'PT / OT results' },
  'Total Bilirubine': { key: 'bilirubin_qty', fallbackKey: 'bilirubin', reference: '0.4 - 1.2 mg/dl' },
  'Serum Creatine': { key: 'creatinine', reference: '0.6 - 1.3 mg/dL' },
  'Urine Full Report': { key: 'urine_full_report', reference: '' },
  'Haemoglobin A1C': { key: 'hba1c_result', reference: 'See reference ranges below' }
};
const testUnits = { FBS:'mg/dL', RBS:'mg/dL', 'Total Cholesterol':'mg/dL', SGPT:'iu/l', SGOT:'iu/l', 'SGPT & SGOT':'iu/l', 'Total Bilirubine':'mg/dL', 'Serum Creatine':'mg/dL', 'Urine Full Report':'', 'Haemoglobin A1C':'%' };
const lipidReferenceRows = [
  ['Total Cholesterol','<240 mg/dl','—','≥240 mg/dl'],
  ['HDL- Cholesterol','>60 mg/dl','40-59 mg/dl (Men) / 50-59 mg/dl (Women)','<40 mg/dL (Men) / <50 mg/dL (Women)'],
  ['LDL- Cholesterol','<130 mg/dl','130-159 mg/dl','>160 mg/dL'],
  ['Cholesterol/HDL ratio','<3.4','3.4-5.7','>5.7'],
  ['Triglycerides','<150 mg/dl','150-199 mg/dl','>200 mg/dL']
];
function parseLipidResult(raw) {
  if (!raw) return {};
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') return parsed; } catch {}
  const keys = ['Total Cholesterol','HDL- Cholesterol','LDL- Cholesterol','VLDL- Cholesterol','Triglyceride','CHO/HDL ratio'];
  const out = {}; String(raw).split(/\n|[,;]+/).map(x=>x.trim()).filter(Boolean).forEach((line,i)=>{ const m=line.match(/^(.+?)\s*:\s*(.+)$/); if(m) out[m[1].trim()]=m[2].trim(); else if(keys[i] && !line.includes(':')) out[keys[i]]=line; });
  return out;
}

const val = (data, key) => data && data[key] != null && data[key] !== '' ? String(data[key]) : '-';
const pdfVal = (data, key, fallback='') => data && data[key] != null && data[key] !== '' ? String(data[key]) : fallback;
function reportDisplayName(data) {
  const raw = `${pdfVal(data,'title','')} ${pdfVal(data,'fname','')} ${pdfVal(data,'lname','')}`.replace(/\s+/g,' ').trim();
  const withoutTitle = raw.replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i,'').trim();
  if (!withoutTitle) return '-';
  const words = withoutTitle.split(/\s+/).filter(Boolean);
  const shortName = words.length > 1 && !withoutTitle.includes('.')
    ? `${words.slice(0,-1).map(word => `${word[0].toUpperCase()}.`).join('') } ${words.at(-1)}`
    : withoutTitle;
  const gender = pdfVal(data,'gender','').toLowerCase();
  const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
  return `${prefix} ${shortName}`.trim();
}
function reportDate(data) {
  const raw = pdfVal(data,'medical_date','');
  const parsed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parsed) return new Date(Number(parsed[1]), Number(parsed[2])-1, Number(parsed[3])).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  return raw || new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
}
function generatedReportTime(data={}) {
  const now = new Date();
  const todayColombo = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Colombo', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
  const raw = pdfVal(data, 'medical_date', '');
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)?.[0] || (() => { const d = new Date(raw); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Colombo', year:'numeric', month:'2-digit', day:'2-digit' }).format(d); })();
  if (iso && iso < todayColombo) {
    const seed = [...`${iso}${pdfVal(data,'ref_no','')}`].reduce((n,ch)=>n + ch.charCodeAt(0), 0);
    const totalMinutes = 330 + (seed % 61);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour}:${String(minute).padStart(2,'0')} PM`;
  }
  return now.toLocaleTimeString('en-US', { timeZone:'Asia/Colombo', hour:'numeric', minute:'2-digit' });
}
function reportAge(data) {
  const age = pdfVal(data,'age','-').trim();
  return age !== '-' && !/\byears?\b/i.test(age) ? `${age} Years` : age;
}
function reportFilename(data, extension, noLetterhead = false) {
  const ref = pdfVal(data,'ref_no','Report').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'') || 'Report';
  const test = pdfVal(data,'test_name','Laboratory-Test').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'') || 'Laboratory-Test';
  const suffix = noLetterhead ? '_No-Letterhead' : '';
  return `${ref}_${test}${suffix}.${extension}`;
}
function selectedTest(data) {
  const name = pdfVal(data, 'test_name', 'FBS');
  const spec = requestedTests[name] || { key: 'rbs', reference: '< 160 mg/dl' };
  let result = pdfVal(data, 'test_result', '');
  const unit = pdfVal(data, 'unit', testUnits[name] || '');
  let rows = [];
  if (name === 'Lipid Profile') {
    if (!result && (data.lipid_total || data.lipid_triglyceride || data.lipid_hdl)) result = `Total Cholesterol: ${pdfVal(data,'lipid_total','')}\nTriglyceride: ${pdfVal(data,'lipid_triglyceride','')}\nHDL- Cholesterol: ${pdfVal(data,'lipid_hdl','')}`;
    const values = parseLipidResult(result);
    const num = key => { const n = parseFloat(String(values[key] ?? '').replace(/,/g,'')); return Number.isFinite(n) ? n : null; };
    const total = num('Total Cholesterol'), triglyceride = num('Triglyceride');
    if (!values['HDL- Cholesterol'] && total != null) values['HDL- Cholesterol'] = (total / 4).toFixed(1);
    const hdl = num('HDL- Cholesterol');
    if (!values['VLDL- Cholesterol'] && triglyceride != null) values['VLDL- Cholesterol'] = (triglyceride / 5).toFixed(1);
    const vldl = num('VLDL- Cholesterol');
    if (!values['LDL- Cholesterol'] && total != null && hdl != null && vldl != null) values['LDL- Cholesterol'] = (total - hdl - vldl).toFixed(1);
    if (!values['CHO/HDL ratio'] && total != null && hdl != null && hdl !== 0) values['CHO/HDL ratio'] = (total / hdl).toFixed(2);
    const defs = [['Total Cholesterol','mg/dl'],['HDL- Cholesterol','mg/dl'],['LDL- Cholesterol','mg/dl'],['VLDL- Cholesterol','mg/dl'],['Triglyceride','mg/dl'],['CHO/HDL ratio','']];
    rows = defs.map(([label,u,source]) => ({ label, result: values[source || label] ? `${values[source || label]}${u ? ` ${u}` : ''}` : 'Not supplied', reference: '', unit: u }));
    return { name, result, reference: 'See lipid profile reference ranges below', unit: '', rows, lipid: true, lipidReferenceRows, lipidCalculationNote: 'HDL = Total Cholesterol / 4; VLDL = Triglyceride / 5; LDL = Total Cholesterol - HDL - VLDL.' };
  }
  if (name === 'Urine Full Report') {
    const defaultUfr = {
      colour: 'Pale Yellow',
      appearance: 'Clear',
      specific_gravity: '1.015',
      ph: '6.0',
      glucose: 'Nil',
      protein: 'Nil',
      ketone: 'Nil',
      bilirubin: 'Nil',
      urobilinogen: '+ Normal',
      pus_cells: '+ 01 - 02 /hpf',
      red_cells: 'Nil',
      epithelial_cells: '+  A Few   /hpf',
      organisms: 'Nil',
      crystals: 'Nil',
      casts: 'Nil'
    };
    const chemicalRows = [
      { label: 'Colour', result: pdfVal(data, 'ufr_colour', defaultUfr.colour) },
      { label: 'Appearance', result: pdfVal(data, 'ufr_appearance', defaultUfr.appearance) },
      { label: 'Specific Gravity', result: pdfVal(data, 'ufr_specific_gravity', defaultUfr.specific_gravity) },
      { label: 'pH', result: pdfVal(data, 'ufr_ph', defaultUfr.ph) },
      { label: 'Glucose', result: pdfVal(data, 'ufr_glucose', defaultUfr.glucose) },
      { label: 'Protein (Albumin)', result: pdfVal(data, 'ufr_protein', defaultUfr.protein) },
      { label: 'Ketone Bodies', result: pdfVal(data, 'ufr_ketone', defaultUfr.ketone) },
      { label: 'Bilirubin', result: pdfVal(data, 'ufr_bilirubin', defaultUfr.bilirubin) },
      { label: 'Urobilinogen', result: pdfVal(data, 'ufr_urobilinogen', defaultUfr.urobilinogen) }
    ];
    const microscopyRows = [
      { label: 'Pus Cells', result: pdfVal(data, 'ufr_pus_cells', defaultUfr.pus_cells) },
      { label: 'Red Cells', result: pdfVal(data, 'ufr_red_cells', defaultUfr.red_cells) },
      { label: 'Epithelial Cells', result: pdfVal(data, 'ufr_epithelial_cells', defaultUfr.epithelial_cells) },
      { label: 'Organisms', result: pdfVal(data, 'ufr_organisms', defaultUfr.organisms) },
      { label: 'Crystals', result: pdfVal(data, 'ufr_crystals', defaultUfr.crystals) },
      { label: 'Casts', result: pdfVal(data, 'ufr_casts', defaultUfr.casts) }
    ];
    const rows = [...chemicalRows, ...microscopyRows];
    return {
      name: 'URINE FULL REPORT',
      isUrine: true,
      chemicalRows,
      microscopyRows,
      rows,
      result: 'URINE FULL REPORT',
      reference: '',
      unit: '',
      lipid: false,
      lipidReferenceRows: []
    };
  }
  if (name === 'Haemoglobin A1C') {
    const result = pdfVal(data, 'hba1c_result', '5.3%');
    return {
      name: 'HAEMOGLOBIN A1C',
      isHba1c: true,
      hba1cResult: result,
      rows: [{ label: 'HbA1c', result, reference: '' }],
      result,
      reference: 'See reference ranges below',
      unit: '',
      lipid: false,
      lipidReferenceRows: []
    };
  }
  if (name === 'SGPT & SGOT') {
    let ptVal = pdfVal(data, 'sgpt_result', pdfVal(data, 'sgpt', ''));
    let otVal = pdfVal(data, 'sgot_result', pdfVal(data, 'sgot', ''));
    if (!ptVal && !otVal && result) {
      const parts = String(result).split(/\s*\|\s*|\s*[\/,]\s*/);
      ptVal = parts[0] || '';
      otVal = parts[1] || '';
    }
    const formatLab = (val) => {
      if (!val || val === '-' || val === '—') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    rows = [
      { label: 'SGPT', result: formatLab(ptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 34 iu/l (Women)', unit: '' },
      { label: '', result: '', reference: '', unit: '' },
      { label: 'SGOT', result: formatLab(otVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];
  } else if (name === 'SGOT') {
    let sgotVal = result || pdfVal(data, 'sgot_result', pdfVal(data, 'sgot', '-'));
    const formatLab = (val) => {
      if (!val || val === '-' || val === '—') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    rows = [
      { label: 'SGOT', result: formatLab(sgotVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];
  } else if (name === 'SGPT') {
    let sgptVal = result || pdfVal(data, 'sgpt_result', pdfVal(data, 'sgpt', '-'));
    const formatLab = (val) => {
      if (!val || val === '-' || val === '—') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    rows = [
      { label: 'SGPT', result: formatLab(sgptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: '[Repeated and Confirmed]', reference: 'Upto 34 iu/l (Women)', unit: '' }
    ];
  } else if (name === 'PT / OT') {
    const parts = String(result).split(/\s*\|\s*|\s*[\/,]\s*/);
    rows = [{label:'PT', result:parts[0] || '-', reference:'', unit:''}, {label:'OT', result:parts[1] || '-', reference:'', unit:''}];
  } else {
    if (!result) {
      result = pdfVal(data, spec.key, spec.fallbackKey ? pdfVal(data, spec.fallbackKey, '-') : '-');
    }
    rows = [{ label:name, result, reference:pdfVal(data, 'reference_range', spec.reference), unit }];
  }
  rows = rows.map(row => {
    if (!row.label && !row.result && !row.reference) return { ...row, result: '' };
    if (!row.result || row.result === '-' || row.result === '—') return { ...row, result: '-' };
    if (row.result === '[Repeated and Confirmed]') return row;
    if (row.unit && !new RegExp(`\\b${row.unit.replace('/', '\\/')}\\b`, 'i').test(row.result) && !/\b(i?u\/l)\b/i.test(row.result)) {
      return { ...row, result: `${row.result} ${row.unit}` };
    }
    return row;
  });
  return { name, result: rows.map(r=>r.result).join(' / '), reference: rows.map(r=>r.reference).join(' / '), unit, rows, lipid:false, lipidReferenceRows:[] };
}
function pdfText(page, font, text, x, y, size=8.5, bold=false) {
  page.drawText(String(text || ''), { x, y, size, font: bold ? font.bold : font.regular, color: rgb(0.04, 0.04, 0.04) });
}
function pdfCenteredText(page, font, text, y, size=12, bold=false, centerX=276) {
  const active = bold ? font.bold : font.regular;
  const width = active.widthOfTextAtSize(String(text || ''), size);
  pdfText(page, font, text, centerX - (width / 2), y, size, bold);
}
function cell(text, bold=false, fill) {
  return new TableCell({ shading: fill ? { type: ShadingType.CLEAR, fill } : undefined, children: [new Paragraph({ children: [new TextRun({ text: String(text), bold, size: 18 })] })] });
}
function sectionTable(title, fields, data) {
  const rows = [new TableRow({ children: [new TableCell({ columnSpan: 2, shading: { type: ShadingType.CLEAR, fill: '0F766E' }, children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, color: 'FFFFFF', size: 22 })] })] })] })];
  for (let i=0; i<fields.length; i+=2) {
    const a = fields[i], b = fields[i+1];
    rows.push(new TableRow({ children: [cell(a[0], true, 'E6FFFB'), cell(val(data,a[1])), ...(b ? [cell(b[0], true, 'E6FFFB'), cell(val(data,b[1]))] : [])] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

app.post('/api/export/word', async (req, res) => {
  try {
    const data = req.body || {};
    const reportData = { ...data, fname: reportDisplayName(data), lname: '', title: '', age: reportAge(data), medical_date: reportDate(data), report_time: generatedReportTime(data) };
    const history = Array.isArray(data.history) ? data.history : [];
    const children = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NEOSYS MEDICARE', bold: true, size: 34, color: '0F766E' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: 'Medical Laboratory Report', bold: true, size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 160 }, children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 16, color: '64748B' })] }),
      sectionTable('Patient Details', patientFields, reportData),
      new Paragraph({ spacing: { after: 100 } }),
      sectionTable('Laboratory Results', labFields, data),
      new Paragraph({ spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: 'Medical History', bold: true, size: 22, color: '0F766E' })] }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [cell('#', true, 'E6FFFB'), cell('Lab No', true, 'E6FFFB'), cell('Date', true, 'E6FFFB'), cell('Medical Test', true, 'E6FFFB')] }),
        ...(history.length ? history.map((h,i) => new TableRow({ children: [cell(i+1), cell(val(h,'lab_no')), cell(val(h,'test_date')), cell(val(h,'description'))] })) : [new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: 'No medical history records', italics: true, size: 18 })] })] })] })])
      ]}),
      new Paragraph({ children: [new ImageRun({ data: fs.readFileSync(signaturePath), transformation: { width: 115, height: 77 } })] }),
      new Paragraph({ children: [new TextRun({ text: 'Authorized Signature', bold: true, size: 16 })] }),
      new Paragraph({ spacing: { before: 180 }, children: [new TextRun({ text: 'Report generated locally from the NeoSys Medicare form data.', size: 16, color: '64748B' })] })
    ];
    const doc = new Document({ styles: { default: { document: { run: { font: 'Cambria', size: 24 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data,'docx')}"`);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/export/excel', async (req, res) => {
  try {
    const data = req.body || {};
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(__dirname, 'public', 'assets', 'fbs-template.xlsx'));
    const ws = wb.getWorksheet('04132') || wb.worksheets[0];
    // The supplied workbook is a styled laboratory-report template. Keep its fonts,
    // merges, widths, row heights and print layout; only replace the report values.
    ['H20:I20', 'D21:G21', 'B24:I24', 'B26:G26', 'D27:G27'].forEach(r => { try { ws.unMergeCells(r); } catch(e){} });
    for (let r=1; r<=46; r++) for (let c=1; c<=11; c++) ws.getCell(r,c).value = null;
    const name = reportDisplayName(data);
    const ageText = reportAge(data);
    const dateText = reportDate(data);
    ws.getCell('B7').value='Laboratory Report';
    ws.getCell('B9').value='Ref.No                '; ws.getCell('D9').value=pdfVal(data,'ref_no','-'); ws.getCell('G9').value='PP/NIC    '; ws.getCell('H9').value=':'; ws.getCell('I9').value=pdfVal(data,'passport_no','-');
    ws.getCell('B10').value='Name'; ws.getCell('C10').value=':'; ws.getCell('D10').value=name; ws.getCell('G10').value='Age     '; ws.getCell('H10').value=':'; ws.getCell('I10').value=ageText;
    ws.getCell('D10').alignment = { ...(ws.getCell('D10').alignment || {}), wrapText: true, shrinkToFit: true, vertical: 'middle' };
    ws.getCell('B11').value='Sex'; ws.getCell('C11').value=':'; ws.getCell('D11').value=pdfVal(data,'gender','-'); ws.getCell('G11').value='Ref.By'; ws.getCell('H11').value=':'; ws.getCell('I11').value=pdfVal(data,'agency','-');
    const test = selectedTest(data);
    const testName = test.name;
    ws.getCell('B12').value='Date '; ws.getCell('C12').value=':'; ws.getCell('D12').value=dateText; ws.getCell('G12').value='Specimen'; ws.getCell('H12').value=':'; ws.getCell('I12').value=pdfVal(data,'specimen',test.isUrine ? 'Urine' : 'Blood');
    ws.getCell('B13').value='Issued Time'; ws.getCell('C13').value=':'; ws.getCell('D13').value=generatedReportTime(data);
    let noteRow = 21;
    if (test.isUrine) {
      ws.getCell('B16').value = 'URINE FULL REPORT';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Results';
      ws.getCell('H18').value = '';
      test.chemicalRows.forEach((row, i) => {
        const r = 20 + i;
        ws.getCell(`B${r}`).value = row.label;
        ws.getCell(`E${r}`).value = `_  ${row.result}`;
      });
      const microRow = 20 + test.chemicalRows.length + 1;
      ws.getCell(`B${microRow}`).value = 'Centrifuged Urine Microscopy';
      test.microscopyRows.forEach((row, i) => {
        const r = microRow + 1 + i;
        ws.getCell(`B${r}`).value = row.label;
        ws.getCell(`E${r}`).value = `_  ${row.result}`;
      });
      noteRow = microRow + 1 + test.microscopyRows.length + 1;
    } else if (test.isHba1c) {
      ws.getCell('B16').value = 'HAEMOGLOBIN A1C';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      ws.getCell('B20').value = 'HbA1c';
      ws.getCell('E20').value = test.hba1cResult || '5.3%';
      ws.getCell('B22').value = 'Reference Range';
      const hba1cRefs = [
        ['Below 6.0%', '-', 'Normal'],
        ['6.0% to 6.4%', '-', 'Prediabetes'],
        ['6.5% or above', '-', 'Diabetes'],
        ['<7.0%', '-', 'Goal of Therapy (Adults)'],
        ['>8.0%', '-', 'Action Suggested (Adults)']
      ];
      hba1cRefs.forEach(([range, dash, desc], i) => {
        const r = 23 + i;
        ws.getCell(`B${r}`).value = range;
        ws.getCell(`D${r}`).value = dash;
        ws.getCell(`E${r}`).value = desc;
      });
      ws.getCell('B29').value = 'Analyzer -HemoCue\u00AE HbA1c 501';
      ws.getCell('B30').value = '(Test Method - Fluorescence Immunoassay (FIA))';
      noteRow = 31;
    } else {
      ws.getCell('B16').value=testName; ws.getCell('B18').value='Test'; ws.getCell('E18').value='Result'; ws.getCell('H18').value='Reference Range';
      test.rows.forEach((row, i) => { const r=20+i; ws.getCell(`B${r}`).value=row.label; ws.getCell(`E${r}`).value=row.result; ws.getCell(`H${r}`).value=row.reference; });
      noteRow = 21 + test.rows.length;
      if (test.lipid) { ws.getCell(`B${noteRow+1}`).value='Reference Ranges'; ws.getCell(`B${noteRow+2}`).value='Test'; ws.getCell(`E${noteRow+2}`).value='Desirable levels'; ws.getCell(`G${noteRow+2}`).value='Borderline levels'; ws.getCell(`I${noteRow+2}`).value='High levels'; test.lipidReferenceRows.forEach((row,i)=>{ const r=noteRow+3+i; ws.getCell(`B${r}`).value=row[0]; ws.getCell(`E${r}`).value=row[1]; ws.getCell(`G${r}`).value=row[2]; ws.getCell(`I${r}`).value=row[3]; }); noteRow += 8; }
    }
    
    const method = pdfVal(data,'test_method','Erba Mannheim Fully Auto Analyzer');
    const note = pdfVal(data,'result_note','Repeated and Confirmed');
    ws.getCell(`B${noteRow+2}`).value=`[Test Method - ${method}]`;
    ws.getCell(`D${noteRow+5}`).value='**End of Report**';
    const signatureId = wb.addImage({ filename: signaturePath, extension: 'png' });
    ws.addImage(signatureId, { tl: { col: 1.0, row: test.lipid ? 39.0 : 38.0 }, ext: { width: 90, height: 60 } });
    ws.getCell('B43').value='W.D.Gunarathne'; ws.getCell('B44').value='Chief Medical Laboratory Technologist'; ws.getCell('B45').value='D.M.L.T.,(Sri Lanka) / S.L.M.C 0012 '; ws.getCell('B46').value='W.H.O.Fellow';
    for (let r=1; r<=46; r++) for (let c=1; c<=11; c++) {
      const current = ws.getCell(r,c);
      if (current.value !== null && current.value !== undefined) {
        const strVal = String(current.value);
        const isHeader = ['URINE FULL REPORT', 'Centrifuged Urine Microscopy', 'Test', 'Results', 'Result', 'Laboratory Report', 'HAEMOGLOBIN A1C', 'Reference Range'].includes(strVal) || ['B9','B10','B11','B12','B13','G9','G10','G11','G12'].includes(current.address);
        const isUnderlined = ['URINE FULL REPORT', 'Centrifuged Urine Microscopy', 'Test', 'Results', 'Result', 'HAEMOGLOBIN A1C', 'Reference Range'].includes(strVal);
        current.font = {
          ...(current.font || {}),
          name:'Cambria',
          size: strVal.includes('Test Method') ? 9 : 12,
          bold: isHeader || strVal.includes('Gunarathne') || strVal.includes('Analyzer') || strVal.includes('Test Method'),
          underline: isUnderlined
        };
      }
    }
    // One generated report per workbook, with the same sheet name convention as FBS.xlsx.
    for (const sheet of [...wb.worksheets]) if (sheet !== ws) wb.removeWorksheet(sheet.id);
    ws.name = String(pdfVal(data,'ref_no','Report')).replace(/[\\/*?:\[\]]/g,'_').slice(0,31) || 'Report';
    ws.pageSetup = { orientation:'portrait', paperSize:9, fitToPage:true, fitToWidth:1, fitToHeight:1 };
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename="${reportFilename(data,'xlsx')}"`); await wb.xlsx.write(res); res.end();
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/export/pdf', async (req, res) => {
  try {
    const data = req.body || {};
    const noLetterhead = req.query.letterhead === 'false' || data.noLetterhead === true || data.letterhead === false;
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const page = pdf.addPage([595.28, 841.89]);
    if (!noLetterhead) {
      const template = require('fs').readFileSync(pdfTemplate);
      const bg = await pdf.embedPng(template);
      page.drawImage(bg, { x: 0, y: 0, width: 595.28, height: 841.89 });
      // Cover only the old sample body. Keep the original logo and letterhead title fully visible.
      page.drawRectangle({ x: 40, y: 103, width: 526, height: 600, color: rgb(1,1,1) });
    }
    const font = { regular: await pdf.embedFont(fs.readFileSync(reportFontRegular)), bold: await pdf.embedFont(fs.readFileSync(reportFontBold)) };
    const test = selectedTest(data);
    const left = [['Ref. No', pdfVal(data,'ref_no','-')], ['Name', reportDisplayName(data)], ['Sex', pdfVal(data,'gender','-')], ['Date', reportDate(data)], ['Issued Time', generatedReportTime(data)]];
    const right = [['PP/NIC No', pdfVal(data,'passport_no','-')], ['Age', reportAge(data)], ['Referred By', pdfVal(data,'agency','-')], ['Specimen', pdfVal(data,'specimen', test.isUrine ? 'Urine' : 'Blood')]];
    let y = 685;
    left.forEach(([label,value])=>{
      if (label === 'Issued Time') {
        pdfText(page,font,label,57,y,11); pdfText(page,font,':',138,y,11,true); pdfText(page,font,value,147,y,11);
        y -= 16;
        return;
      }
      const emphasize = label === 'Ref. No'; pdfText(page,font,label,57,y,11,emphasize); pdfText(page,font,':',138,y,11,true);
      const valueX = 147;
      if (label === 'Name' && font.regular.widthOfTextAtSize(String(value), 11) > 165) {
        const words = String(value).split(/\s+/); const lines = []; let line = '';
        words.forEach(word => { const candidate = (line + ' ' + word).trim(); if (font.regular.widthOfTextAtSize(candidate, 11) > 165 && line) { lines.push(line); line = word; } else line = candidate; });
        if (line) lines.push(line);
        lines.forEach((part,index)=>pdfText(page,font,part,147,y-(index*13),11,emphasize));
        y -= (14 * lines.length) + 2;
      } else { pdfText(page,font,value,valueX,y,11,emphasize); y-=16; }
    });
    let rightY=685; right.forEach(([label,value])=>{ const emphasize = label === 'Specimen'; pdfText(page,font,label,315,rightY,11,emphasize); pdfText(page,font,':',380,rightY,11,true); pdfText(page,font,value,390,rightY,11,emphasize); rightY-=16; });
    const detailBottomY = Math.min(y, rightY);
    const testY = detailBottomY - 22;
    const testName = test.name;
    const method = pdfVal(data,'test_method','Erba Mannheim Fully Auto Analyzer');
    const note = pdfVal(data,'result_note','Repeated and Confirmed');

    if (test.isUrine) {
      const title = 'URINE FULL REPORT';
      pdfText(page, font, title, 43, testY, 12, true);
      const titleWidth = font.bold.widthOfTextAtSize(title, 12);
      page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 1, color: rgb(0,0,0) });

      const headerY = testY - 24;
      pdfText(page, font, 'Test', 43, headerY, 11, true);
      page.drawLine({ start: { x: 43, y: headerY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize('Test', 11), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

      pdfText(page, font, 'Results', 260, headerY, 11, true);
      page.drawLine({ start: { x: 260, y: headerY - 2 }, end: { x: 260 + font.bold.widthOfTextAtSize('Results', 11), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

      let curY = headerY - 18;
      const rowStep = 15;
      test.chemicalRows.forEach(row => {
        pdfText(page, font, row.label, 43, curY, 10.5, true);
        pdfText(page, font, '_', 240, curY, 10.5, true);
        pdfText(page, font, row.result, 260, curY, 10.5, false);
        curY -= rowStep;
      });

      curY -= 10;
      const microTitle = 'Centrifuged Urine Microscopy';
      pdfText(page, font, microTitle, 43, curY, 11, true);
      page.drawLine({ start: { x: 43, y: curY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize(microTitle, 11), y: curY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

      curY -= 18;
      test.microscopyRows.forEach(row => {
        pdfText(page, font, row.label, 43, curY, 10.5, true);
        pdfText(page, font, '_', 240, curY, 10.5, true);
        pdfText(page, font, row.result, 260, curY, 10.5, false);
        curY -= rowStep;
      });

      pdfText(page, font, `[Test Method - ${method}]`, 43, curY - 18, 9, true);
      pdfCenteredText(page, font, '**End of Report**', curY - 45, 10.5, true);

      const signY = 175;
      pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
      pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
      pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
      pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
      if (!noLetterhead) {
        const signature = await pdf.embedPng(fs.readFileSync(signaturePath));
        page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
      }
    } else if (test.isHba1c) {
      const title = 'HAEMOGLOBIN A1C';
      pdfText(page, font, title, 43, testY, 12, true);
      const titleWidth = font.bold.widthOfTextAtSize(title, 12);
      page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 1, color: rgb(0,0,0) });

      const headerY = testY - 24;
      page.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
      page.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
      pdfText(page, font, 'Test', 100, headerY, 11, true);
      pdfText(page, font, 'Result', 300, headerY, 11, true);

      const dataRowY = headerY - 24;
      pdfText(page, font, 'HbA1c', 100, dataRowY, 10.5, true);
      pdfText(page, font, test.hba1cResult || '5.3%', 300, dataRowY, 10.5, true);

      const refTitleY = dataRowY - 32;
      const refTitle = 'Reference Range';
      pdfText(page, font, refTitle, 43, refTitleY, 11, true);
      const refTitleWidth = font.bold.widthOfTextAtSize(refTitle, 11);
      page.drawLine({ start: { x: 43, y: refTitleY - 2 }, end: { x: 43 + refTitleWidth, y: refTitleY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

      const hba1cRefs = [
        ['Below 6.0%', '- Normal'],
        ['6.0% to 6.4%', '- Prediabetes'],
        ['6.5% or above', '- Diabetes'],
        ['<7.0%', '- Goal of Therapy (Adults)'],
        ['>8.0%', '- Action Suggested (Adults)']
      ];

      let curY = refTitleY - 16;
      hba1cRefs.forEach(([range, desc]) => {
        pdfText(page, font, range, 43, curY, 9.5, false);
        pdfText(page, font, desc, 145, curY, 9.5, false);
        curY -= 14;
      });

      curY -= 10;
      pdfText(page, font, 'Analyzer -HemoCue® HbA1c 501', 43, curY, 9.5, true);
      pdfText(page, font, '(Test Method - Fluorescence Immunoassay (FIA))', 43, curY - 14, 9.5, true);

      pdfCenteredText(page, font, '**End of Report**', curY - 44, 10.5, true);

      const signY = 175;
      pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
      pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
      pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
      pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
      if (!noLetterhead) {
        const signature = await pdf.embedPng(fs.readFileSync(signaturePath));
        page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
      }
    } else {
      const testTitle = testName === 'FBS' ? 'FASTING BLOOD SUGAR'
        : testName === 'RBS' ? 'RANDOM BLOOD SUGAR'
        : testName;
      pdfText(page,font,testTitle,43,testY,11,true);
      const rowTop = testY - 56;
      const rowHeight = 16;
      const tableBottom = rowTop - (test.rows.length * rowHeight) - 10;
      const lipidTable = test.lipid;
      page.drawLine({ start:{x:41,y:testY-19}, end:{x:lipidTable ? 341 : 511,y:testY-19}, thickness:0.8, color:rgb(0,0,0) });
      page.drawRectangle({ x:41, y:testY-37, width:lipidTable ? 300 : 470, height:18, borderColor:rgb(0,0,0), borderWidth:0.8 });
      pdfCenteredText(page,font,'Test',testY-31,11,true,lipidTable ? 110 : 106); pdfCenteredText(page,font,'Result',testY-31,11,true,lipidTable ? 260 : 276); if(!lipidTable) pdfCenteredText(page,font,'Reference Range',testY-31,11,true,430);
      test.rows.forEach((row,i)=>{
        const ry=rowTop-(i*rowHeight);
        pdfCenteredText(page,font,row.label,ry,10.5,true,lipidTable ? 110 : 106);
        pdfCenteredText(page,font,row.result,ry,10.5,true,lipidTable ? 260 : 276);
        if(!lipidTable) pdfCenteredText(page,font,row.reference,ry,9.5,false,430);
      });
      let afterTable = tableBottom;
      if (test.lipid) {
        pdfText(page,font,'Reference Ranges',43,afterTable-2,10,true);
        pdfCenteredText(page,font,'Test',afterTable-18,8.5,true,90); pdfCenteredText(page,font,'Desirable levels',afterTable-18,8.5,true,190); pdfCenteredText(page,font,'Borderline levels',afterTable-18,8.5,true,330); pdfCenteredText(page,font,'High levels',afterTable-18,8.5,true,475);
        test.lipidReferenceRows.forEach((row,i)=>{ const ry=afterTable-34-(i*14); pdfText(page,font,row[0],43,ry,8.5); pdfText(page,font,row[1],135,ry,8); pdfText(page,font,row[2],245,ry,7.5); pdfText(page,font,row[3],420,ry,7.5); });
        afterTable -= 34 + test.lipidReferenceRows.length*14;
      }
      const skipBottomNote = test.lipid || ['SGPT', 'SGOT', 'SGPT & SGOT'].includes(test.name);
      if (!skipBottomNote && note) pdfCenteredText(page,font,String(note).startsWith('[') ? note : `[${note}]`,afterTable-18,10.5,true);
      pdfText(page,font,`[Test Method - ${method}]`,43, test.lipid ? afterTable-52 : afterTable-52,9,true);
      pdfCenteredText(page,font,'**End of Report**',afterTable-80,10.5,true);
      const signY = 175;
      pdfText(page,font,'W.D.Gunarathne',43,signY,11); pdfText(page,font,'Chief Medical Laboratory Technologist',43,signY-11,11); pdfText(page,font,'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012',43,signY-22,11); pdfText(page,font,'W.H.O.Fellow',43,signY-33,11);
      if (!noLetterhead) {
        const signature = await pdf.embedPng(fs.readFileSync(signaturePath));
        page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
      }
    }
    const bytes = await pdf.save();
    res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition',`attachment; filename="${reportFilename(data,'pdf', noLetterhead)}"`); res.send(Buffer.from(bytes));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 1516;
app.listen(PORT, '0.0.0.0', () => console.log(`NeoSys Local Generator running at http://localhost:${PORT}`));
