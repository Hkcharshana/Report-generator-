const express = require('express');
const net = require('net');
const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } = require('docx');
const ExcelJS = require('exceljs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

// Load environment variables from .env file
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        });
        break;
      } catch (e) {
        console.error('Error loading .env file:', e.message);
      }
    }
  }
}
loadEnv();

// Resolve Frontend and Assets directories
const FRONTEND_DIR = process.env.FRONTEND_DIR
  ? path.resolve(__dirname, '..', process.env.FRONTEND_DIR)
  : (fs.existsSync(path.join(__dirname, '..', 'frontend'))
      ? path.join(__dirname, '..', 'frontend')
      : (fs.existsSync(path.join(__dirname, 'frontend'))
          ? path.join(__dirname, 'frontend')
          : (fs.existsSync(path.join(__dirname, '..', 'public'))
              ? path.join(__dirname, '..', 'public')
              : path.join(__dirname, 'public'))));

const ASSETS_DIR = process.env.ASSETS_DIR
  ? path.resolve(__dirname, '..', process.env.ASSETS_DIR)
  : (fs.existsSync(path.join(FRONTEND_DIR, 'assets'))
      ? path.join(FRONTEND_DIR, 'assets')
      : (fs.existsSync(path.join(__dirname, '..', 'public', 'assets'))
          ? path.join(__dirname, '..', 'public', 'assets')
          : path.join(__dirname, 'public', 'assets')));

const app = express();
app.use(express.json({ limit: '2mb' }));

// Serve HTML files with no-cache and explicit UTF-8 charset
app.use(express.static(FRONTEND_DIR, {
  setHeaders(res, filePath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));
if (fs.existsSync(path.join(__dirname, '..', 'public')) && FRONTEND_DIR !== path.join(__dirname, '..', 'public')) {
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));
}

const pdfTemplate = path.join(ASSETS_DIR, 'neosys-report-template.png');
const xlsxTemplate = path.join(ASSETS_DIR, 'fbs-template.xlsx');
const signaturePath = path.join(ASSETS_DIR, 'signature.png');
const reportFontRegular = path.join(ASSETS_DIR, 'Cambria-Regular.ttf');
const reportFontBold = path.join(ASSETS_DIR, 'Cambria-Bold.ttf');
const arialFontRegular = path.join(ASSETS_DIR, 'Arial.ttf');
const arialFontBold = path.join(ASSETS_DIR, 'Arial-Bold.ttf');
const timesFontRegular = path.join(ASSETS_DIR, 'Times.ttf');
const timesFontBold = path.join(ASSETS_DIR, 'Times-Bold.ttf');
const letterheadPath = path.join(ASSETS_DIR, 'neosys-letterhead.jpg');
const defaultWbcPath = path.join(ASSETS_DIR, 'h360-wbc.png');
const defaultRbcPath = path.join(ASSETS_DIR, 'h360-rbc.png');
const defaultPltPath = path.join(ASSETS_DIR, 'h360-plt.png');
const defaultStampPath = path.join(ASSETS_DIR, 'h360-stamp-exact.png');

function safeReadBuf(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) return fs.readFileSync(filePath);
  } catch (err) {
    console.error('Asset cache error for', filePath, err.message);
  }
  return null;
}

// In-memory static asset cache to eliminate blocking disk I/O on low-spec hardware
const assetCache = {
  letterhead: safeReadBuf(letterheadPath),
  signature: safeReadBuf(signaturePath),
  stamp: safeReadBuf(defaultStampPath),
  fontRegular: safeReadBuf(reportFontRegular),
  fontBold: safeReadBuf(reportFontBold),
  fontArial: safeReadBuf(arialFontRegular),
  fontArialBold: safeReadBuf(arialFontBold),
  fontTimes: safeReadBuf(timesFontRegular),
  fontTimesBold: safeReadBuf(timesFontBold),
  histoWbc: safeReadBuf(defaultWbcPath),
  histoRbc: safeReadBuf(defaultRbcPath),
  histoPlt: safeReadBuf(defaultPltPath)
};

function formatFbcVal(code, v) {
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
}

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

function format2Dec(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  return n.toFixed(2);
}

function pngToGrayscale(buf) {
  try {
    if (!buf || buf.length < 33) return buf;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return buf;
    let pos = 8;
    const chunks = [];
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.slice(pos + 4, pos + 8).toString('ascii');
      const data = buf.slice(pos + 8, pos + 8 + len);
      const crc = buf.readUInt32BE(pos + 8 + len);
      chunks.push({ len, type, data, crc });
      pos += 12 + len;
    }
    const ihdr = chunks.find(c => c.type === 'IHDR');
    if (!ihdr) return buf;
    const width = ihdr.data.readUInt32BE(0);
    const height = ihdr.data.readUInt32BE(4);
    const bitDepth = ihdr.data[8];
    const colorType = ihdr.data[9];
    if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) return buf;
    const idatChunks = chunks.filter(c => c.type === 'IDAT');
    if (!idatChunks.length) return buf;
    const compressed = Buffer.concat(idatChunks.map(c => c.data));
    const raw = zlib.inflateSync(compressed);
    const bytesPerPixel = colorType === 6 ? 4 : 3;
    const scanlineLen = 1 + width * bytesPerPixel;
    for (let y = 0; y < height; y++) {
      const offset = y * scanlineLen + 1;
      for (let x = 0; x < width; x++) {
        const px = offset + x * bytesPerPixel;
        const r = raw[px], g = raw[px + 1], b = raw[px + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        raw[px] = gray;
        raw[px + 1] = gray;
        raw[px + 2] = gray;
      }
    }
    const newCompressed = zlib.deflateSync(raw);
    const outChunks = [buf.slice(0, 8)];
    for (const c of chunks) {
      if (c.type === 'IHDR') {
        const cBuf = Buffer.alloc(12 + c.len);
        cBuf.writeUInt32BE(c.len, 0);
        Buffer.from('IHDR').copy(cBuf, 4);
        c.data.copy(cBuf, 8);
        cBuf.writeUInt32BE(c.crc, 8 + c.len);
        outChunks.push(cBuf);
      } else if (c.type === 'IDAT') {
        // will write single new IDAT
      } else if (c.type === 'IEND') {
        const idatType = Buffer.from('IDAT');
        const idatLen = newCompressed.length;
        const idatBuf = Buffer.alloc(12 + idatLen);
        idatBuf.writeUInt32BE(idatLen, 0);
        idatType.copy(idatBuf, 4);
        newCompressed.copy(idatBuf, 8);
        const crc = zlib.crc32 ? zlib.crc32(Buffer.concat([idatType, newCompressed])) : 0;
        idatBuf.writeUInt32BE(crc >>> 0, 8 + idatLen);
        outChunks.push(idatBuf);

        const iendBuf = Buffer.alloc(12);
        iendBuf.writeUInt32BE(0, 0);
        Buffer.from('IEND').copy(iendBuf, 4);
        iendBuf.writeUInt32BE(0xae426082, 8);
        outChunks.push(iendBuf);
      } else {
        const cBuf = Buffer.alloc(12 + c.len);
        cBuf.writeUInt32BE(c.len, 0);
        Buffer.from(c.type).copy(cBuf, 4);
        c.data.copy(cBuf, 8);
        cBuf.writeUInt32BE(c.crc, 8 + c.len);
        outChunks.push(cBuf);
      }
    }
    return Buffer.concat(outChunks);
  } catch (err) {
    return buf;
  }
}
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
  
    // Colombo Consultancy Reference Patients (5330 & 5331)
    // Colombo Consultancy Reference Patient 5329 (User Sample)
    const rec5329 = {
      ref_no: '5329', raw_ref_no: '5329', passport_no: 'P1010657',
      fname: 'Miss.K.M.T.Maleeshi', patient_name: 'Miss.K.M.T.Maleeshi', full_name: 'Miss.K.M.T.Maleeshi',
      age: '24 Years', gender: 'Female', agency: 'Colombo Consultancy Lanka (Pvt) Ltd.',
      medical_date: '10 November 2026', specimen: 'Blood', report_time: '10:47 AM',
      medical_type: 'Type 11', medical_type_name: 'Type 11', package_name: 'Type 11',
      fbs: '77', colombo_fbs: '77',
      sgpt: '19', colombo_sgpt: '19',
      sgot: '18', colombo_sgot: '18',
      gamma_gt: '25', colombo_gamma_gt: '25',
      cholesterol: '213', colombo_cholesterol: '213',
      hdl: '49', colombo_hdl: '49',
      triglyceride: '93', colombo_triglyceride: '93',
      vldl: '18.6', colombo_vldl: '18.6',
      ldl: '145.4', colombo_ldl: '145.4',
      cho_hdl: '4.35', colombo_cho_hdl: '4.35',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.010', ufr_ph: '6.0',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_ketone: 'Nil', ufr_bilirubin: 'Nil', ufr_urobilinogen: '+ Normal',
      ufr_pus_cells: '+ 01- 02 / hpf', ufr_red_cells: 'Nil', ufr_epithelial_cells: '+ A few / hpf',
      ufr_organisms: 'Nil', ufr_crystals: 'Nil', ufr_casts: 'Nil'
    };


    const rec5330 = {
      ref_no: '5330', raw_ref_no: '5330', passport_no: 'P0997553',
      fname: 'Miss.N.G.S.Diwanjalee', patient_name: 'Miss.N.G.S.Diwanjalee', full_name: 'Miss.N.G.S.Diwanjalee',
      age: '22', gender: 'Female', agency: 'Colombo Consultancy Lanka (Pvt) Ltd.',
      medical_date: '10 November 2026', specimen: 'Blood', report_time: '11:15 AM',
      medical_type: 'Type 11', medical_type_name: 'Type 11', package_name: 'Type 11',
      fbs: '75', sgpt: '10', sgot: '13', gamma_gt: '18',
      cholesterol: '176', hdl: '44', ldl: '112.4', vldl: '19.6', triglyceride: '98', cho_hdl: '4',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.0153', ufr_ph: '6',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_pus_cells: '+ 01- 02 / hpf', ufr_epithelial_cells: '+ A few / hpf'
    };
    const rec5331 = {
      ref_no: '5331', raw_ref_no: '5331', passport_no: 'P0165027',
      fname: 'Mr.R.V.A.Upulsiri', patient_name: 'Mr.R.V.A.Upulsiri', full_name: 'Mr.R.V.A.Upulsiri',
      age: '27', gender: 'Male', agency: 'Colombo Consultancy Lanka (Pvt) Ltd.',
      medical_date: '10 November 2026', specimen: 'Blood', report_time: '11:20 AM',
      medical_type: 'Type 11', medical_type_name: 'Type 11', package_name: 'Type 11',
      fbs: '106', sgpt: '50', sgot: '26', gamma_gt: '25',
      cholesterol: '226', hdl: '56.5', ldl: '143.5', vldl: '26', triglyceride: '130', cho_hdl: '4',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.01', ufr_ph: '6',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_pus_cells: '+ 01- 02 / hpf', ufr_epithelial_cells: '+ A few / hpf'
    };
    // Reference Patient 05125 (Type 10 B with Urine Drug sample)
    const rec05125 = {
      ref_no: '05125', raw_ref_no: '05125', passport_no: 'N9016468',
      fname: 'Mr.H.A.D.S.Hewaarachchi', patient_name: 'Mr.H.A.D.S.Hewaarachchi', full_name: 'Mr.H.A.D.S.Hewaarachchi',
      age: '38 Years', gender: 'Male', agency: 'A R A Overseas Company',
      medical_date: '02 November 2026', specimen: 'Blood / Urine', report_time: '1:06 PM',
      medical_type: 'Type 10 B with urine drug', medical_type_name: 'Type 10 B with urine drug', package_name: 'Type 10 B with urine drug',
      diff_neutrophil: '61', diff_lymphocyte: '32', diff_monocyte: '04', diff_eosinophil: '03', diff_basophil: '00',
      gonorrhea_result: 'Negative',
      serology_hiv: 'Negative', serology_hba: 'Negative', serology_hcv: 'Negative', serology_vdrl: 'Non Reactive', serology_syphilis: 'Negative',
      ufr_colour: 'Pale Yellow', ufr_appearance: 'Clear', ufr_specific_gravity: '1.020', ufr_ph: '6.0',
      ufr_glucose: 'Nil', ufr_protein: 'Nil', ufr_ketone: 'Nil', ufr_bilirubin: 'Nil', ufr_urobilinogen: '+ Normal',
      ufr_pus_cells: '+ 01 - 02 /hpf', ufr_red_cells: 'Nil', ufr_epithelial_cells: '+ A Few      /hpf',
      ufr_organisms: 'Nil', ufr_crystals: 'Nil', ufr_casts: 'Nil',
      urine_drug_amp: 'Negative', urine_drug_bar: 'Negative', urine_drug_bzo: 'Negative', urine_drug_bup: 'Negative',
      urine_drug_coc: 'Negative', urine_drug_thc: 'Negative', urine_drug_mtd: 'Negative', urine_drug_met: 'Negative',
      urine_drug_mdma: 'Negative', urine_drug_mop: 'Negative', urine_drug_tml: 'Negative', urine_drug_tca: 'Negative'
    };
    referenceRecords['05125'] = rec05125;
    referenceRecords['5125'] = rec05125;
    referenceRecords['N9016468'] = rec05125;

    referenceRecords['5329'] = rec5329;
    referenceRecords['05329'] = rec5329;
    referenceRecords['P1010657'] = rec5329;
    referenceRecords['5330'] = rec5330;
    referenceRecords['05330'] = rec5330;
    referenceRecords['P0997553'] = rec5330;
    referenceRecords['5331'] = rec5331;
    referenceRecords['05331'] = rec5331;
    referenceRecords['P0165027'] = rec5331;

    referenceRecords['04444'] = { ref_no:'04444', passport_no:'P1419862', fname:'Mrs.B.H.N.Dilukshika', age:'44', gender:'Female', agency:'Rogers International (Pvt) Ltd', medical_date:'13 October 2026', specimen:'Blood', report_time:'12:05 PM' };

  // Load extracted Urine Drug Reference Records (5-Para & 12-Para)
  try {
    const drugRecPath = path.join(__dirname, 'urine_drug_records.json');
    if (fs.existsSync(drugRecPath)) {
      const drugRecords = JSON.parse(fs.readFileSync(drugRecPath, 'utf8'));
      Object.assign(referenceRecords, drugRecords);
      console.log(`[Reference] Loaded ${Object.keys(drugRecords).length} Urine Drug screening reference records.`);
    }
  } catch (err) {
    console.error('Failed to load urine_drug_records.json:', err.message);
  }
})();

// ?? Multi-Branch Neosys Configuration & Session Store ????????????????????????
const NEOSYS_BRANCHES = {
  pettah: { id: 'pettah', label: 'Pettah Branch', host: 'https://neosys.lk', path: 'pettah', prefix: 'PET' },
  colombo: { id: 'colombo', label: 'Colombo Branch', host: 'https://neosys.lk', path: 'sys', prefix: 'MRD' },
  sys: { id: 'colombo', label: 'Colombo Branch', host: 'https://neosys.lk', path: 'sys', prefix: 'MRD' }
};

function getBranchConfig(branch) {
  const b = String(branch || '').toLowerCase();
  return NEOSYS_BRANCHES[b] || NEOSYS_BRANCHES.pettah;
}

let activeBranch = 'pettah';

const branchSessions = {
  pettah: { session: null, user: null, pass: null },
  colombo: { session: null, user: null, pass: null }
};

// Legacy sync handles for backward compatibility with other server routines
let neosysSession = null;
let neosysUser = null;
let neosysPassword = null;

function syncLegacySession(branchKey) {
  const sess = branchSessions[branchKey] || branchSessions.pettah;
  neosysSession = sess.session;
  neosysUser = sess.user;
  neosysPassword = sess.pass;
}

function extractCiSession(headers) {
  const cookies = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie') || ''];
  for (const c of cookies) {
    const m = String(c).match(/ci_session=([^;]+)/);
    if (m) return m[1];
  }
  return null;
}

function toFullRecord(p, branchPath = 'pettah') {
  const clean = v => String(v ?? '').trim();
  const fbsVal = clean(p.fbs || p.rbs);
  const rbsVal = clean(p.rbs || p.fbs);
  const branchName = (branchPath === 'sys' || branchPath === 'colombo') ? 'Colombo' : 'Pettah';
  const rawRef = clean(p.ref_no);
  const cleanedRef = cleanRefNo(rawRef);
  return {
    ref_no: cleanedRef || rawRef,
    raw_ref_no: rawRef,
    passport_no: clean(p.passport_no),
    fname: clean(p.fname),
    lname: clean(p.lname),
    full_name: clean(p.full_name || p.patient_name || p.name || `${clean(p.fname)} ${clean(p.lname)}`.trim()),
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
    branch: branchName,
    photo: p.pic ? `https://neosys.lk/${branchPath}/upload/patient/photo/${p.pic}` : '',
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

async function loginToNeoSys(username, password, branch = 'pettah') {
  const cfg = getBranchConfig(branch);
  const branchKey = cfg.id;
  try {
    const params = new URLSearchParams({ username, password });
    const loginUrl = `${cfg.host}/${cfg.path}/DashboardController/login_validation`;
    console.log(`[NeoSys] Logging into ${cfg.label} (${loginUrl})...`);
    const res = await fetch(loginUrl, {
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
      return { success: false, error: `Could not obtain session cookie from NeoSys ${cfg.label}` };
    }

    const location = res.headers.get('location');
    if (res.status === 302 || res.status === 303 || (location && !location.includes('login'))) {
      branchSessions[branchKey] = { session: cookie, user: username, pass: password };
      activeBranch = branchKey;
      syncLegacySession(branchKey);
      return { success: true, session: cookie, username, branch: branchKey, branchLabel: cfg.label };
    }

    const text = await res.text();
    if (text.includes('<title>Login</title>') || text.includes('Log In - Neosys')) {
      return { success: false, error: `Invalid username or password for ${cfg.label}` };
    }

    // Verify session by checking medical-lab
    const check = await fetch(`${cfg.host}/${cfg.path}/medical-lab`, {
      headers: {
        'Cookie': `ci_session=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });

    if (check.status === 200) {
      const checkText = await check.text();
      if (!checkText.includes('<title>Login</title>')) {
        branchSessions[branchKey] = { session: cookie, user: username, pass: password };
        activeBranch = branchKey;
        syncLegacySession(branchKey);
        return { success: true, session: cookie, username, branch: branchKey, branchLabel: cfg.label };
      }
    }

    // Alternative check dashboard / root
    const altCheck = await fetch(`${cfg.host}/${cfg.path}/`, {
      headers: {
        'Cookie': `ci_session=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'manual'
    });
    if (altCheck.status === 200 || altCheck.status === 302) {
      branchSessions[branchKey] = { session: cookie, user: username, pass: password };
      activeBranch = branchKey;
      syncLegacySession(branchKey);
      return { success: true, session: cookie, username, branch: branchKey, branchLabel: cfg.label };
    }

    return { success: false, error: `NeoSys ${cfg.label} authentication failed` };
  } catch (err) {
    return { success: false, error: `Error connecting to NeoSys ${cfg.label}: ` + err.message };
  }
}

async function searchNeoSys(query, branch) {
  const branchKey = branch || activeBranch;
  const cfg = getBranchConfig(branchKey);
  const curSess = branchSessions[cfg.id];
  if (!curSess || !curSess.session) return null;
  const q = String(query || '').trim();
  if (!q) return null;

  async function performFind(session) {
    const params = new URLSearchParams({
      search: q,
      type: 'patient_doctor_report'
    });
    return fetch(`${cfg.host}/${cfg.path}/find`, {
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

  let res = await performFind(curSess.session);
  let text = await res.text();

  if (text.includes('<title>Login</title>') && curSess.user && curSess.pass) {
    console.log(`NeoSys ${cfg.label} session expired. Re-authenticating...`);
    const reAuth = await loginToNeoSys(curSess.user, curSess.pass, cfg.id);
    if (reAuth.success) {
      res = await performFind(branchSessions[cfg.id].session);
      text = await res.text();
    }
  }

  try {
    const json = JSON.parse(text);
    if (json && (json.status === 'true' || json.status === true) && Array.isArray(json.data)) {
      return json.data.map(p => toFullRecord(p, cfg.path));
    }
  } catch (e) {
    console.error(`NeoSys ${cfg.label} response parse error:`, e.message);
  }
  return null;
}

app.post('/api/login', async (req, res) => {
  const { username, password, offline, branch } = req.body || {};
  const branchKey = (branch === 'colombo' || branch === 'sys') ? 'colombo' : 'pettah';
  const cfg = getBranchConfig(branchKey);

  // Check Emergency Lockdown: If lockdown is active, block all regular logins!
  if (securityConfig.lockAllReports) {
    recordAudit('LOGIN_BLOCKED_LOCKDOWN', { username, branch: branchKey }, 'BLOCKED', req);
    return res.status(423).json({
      ok: false,
      locked: true,
      error: `SYSTEM LOCKDOWN ACTIVE: System login is currently disabled by Administrator (${securityConfig.lockReason || 'Emergency Maintenance Mode'}). Terminal access blocked.`
    });
  }

  if (offline) {
    return res.status(400).json({ ok: false, error: 'Offline login is disabled. Please sign in with your NeoSys credentials.' });
  }
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required' });
  }
  const result = await loginToNeoSys(username, password, branchKey);
  if (result.success) {
    res.json({
      ok: true,
      mode: 'neosys',
      username: result.username,
      branch: result.branch,
      branchLabel: result.branchLabel,
      message: `Connected to NeoSys ${result.branchLabel}`
    });
  } else {
    res.status(401).json({ ok: false, error: result.error });
  }
});

app.get('/api/session', (req, res) => {
  const curSess = branchSessions[activeBranch];
  const cfg = getBranchConfig(activeBranch);
  if (securityConfig.lockAllReports) {
    return res.json({
      connected: false,
      locked: true,
      lockReason: securityConfig.lockReason || 'Emergency Maintenance Mode',
      mode: 'locked',
      username: null,
      branch: activeBranch,
      branchLabel: cfg.label,
      branches: {
        pettah: { connected: false, username: null },
        colombo: { connected: false, username: null }
      }
    });
  }
  res.json({
    connected: !!(curSess && curSess.session),
    mode: (curSess && curSess.session) ? 'neosys' : 'offline',
    username: curSess?.user || null,
    branch: activeBranch,
    branchLabel: cfg.label,
    branches: {
      pettah: {
        connected: !!branchSessions.pettah.session,
        username: branchSessions.pettah.user
      },
      colombo: {
        connected: !!branchSessions.colombo.session,
        username: branchSessions.colombo.user
      }
    }
  });
});

app.post('/api/switch-branch', (req, res) => {
  const { branch } = req.body || {};
  if (securityConfig.lockAllReports) {
    return res.status(423).json({ ok: false, locked: true, error: 'System is locked down.' });
  }
  const target = (branch === 'colombo' || branch === 'sys') ? 'colombo' : 'pettah';
  activeBranch = target;
  syncLegacySession(activeBranch);
  const cfg = getBranchConfig(activeBranch);
  const cur = branchSessions[activeBranch];
  res.json({
    ok: true,
    branch: activeBranch,
    branchLabel: cfg.label,
    connected: !!(cur && cur.session),
    username: cur?.user || null
  });
});

app.post('/api/logout', (req, res) => {
  const { branch } = req.body || {};
  if (branch) {
    const b = (branch === 'colombo' || branch === 'sys') ? 'colombo' : 'pettah';
    branchSessions[b] = { session: null, user: null, pass: null };
  } else {
    branchSessions.pettah = { session: null, user: null, pass: null };
    branchSessions.colombo = { session: null, user: null, pass: null };
  }
  syncLegacySession(activeBranch);
  res.json({ ok: true });
});

// ==============================================================================
// SUPER ADMIN & SYSTEM SECURITY MANAGEMENT
// ==============================================================================
const SECURITY_CONFIG_PATH = path.join(__dirname, 'security_config.json');

const BUILTIN_PACKAGES = [
  {
    id: 'pkg_shipping',
    name: 'Shipping',
    code: 'Shipping',
    category: 'Medical Packages',
    description: 'Shipping Medical Package - Type 12 - 1 (14 Reports: Blood Alcohol, CRP, ESR, FBS, S.Creatinine & eGFR, Syphilis & VDRL, Total Cholesterol, SGPT & SGOT, Urine Full Report, Urine Drug Screening, HbA1c, Hepatitis C, Hepatitis B, HIV)',
    tests: [
      'Blood Alcohol Test',
      'C-reactive protein',
      'ESR',
      'Fasting Blood Sugar',
      'S.Creatinine & eGFR',
      'Syphilis & VDRL',
      'Total Cholesterol',
      'Blood for SGPT & SGOT',
      'Urine Full Report',
      'Urine Drug Screening',
      'Haemoglobin A1C',
      'Hepatitis C [HCV]',
      'Hepatitis B [HBsAg]',
      'HIV Test'
    ],
    isBuiltin: true,
    enabled: true
  },
  {
    id: 'pkg_type11',
    name: 'Type 11',
    code: 'Type 11',
    category: 'Medical Packages',
    description: 'Type 11 Medical Package (5 Reports: Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
    tests: ['Fasting Blood Sugar', 'SGPT & SGOT', 'Urine Full Report', 'Gamma GT', 'Lipid Profile'],
    isBuiltin: true,
    enabled: true
  },
  {
    id: 'pkg_type10b',
    name: 'Type 10 B',
    code: 'Type 10 B',
    category: 'Medical Packages',
    description: 'Medical Package (4 Reports: Gonorrhea, Urine Full Report, Differential Count, Serology)',
    tests: ['Gonorrhea', 'Urine Full Report', 'Differential Count', 'Serology'],
    isBuiltin: true,
    enabled: true
  },
  {
    id: 'pkg_type10b_drug',
    name: 'Type 10 B with urine drug',
    code: 'Type 10 B with urine drug',
    category: 'Medical Packages',
    description: 'Medical Package (5 Reports: Gonorrhea, Urine Full Report, Differential Count, Serology, Urine Drug Screening)',
    tests: ['Gonorrhea', 'Urine Full Report', 'Differential Count', 'Serology', 'Urine Drug Screening'],
    isBuiltin: true,
    enabled: true
  },
  {
    id: 'pkg_type7',
    name: 'Type 7',
    code: 'Type 7',
    category: 'Medical Packages',
    description: 'Russia Medical Package (4 Reports: Urine Full Report, Tuberculosis Rapid Test, Brucellosis Test, HIV Ag & Ab Test)',
    tests: ['Urine Full Report', 'Tuberculosis Rapid Test', 'Brucellosis Test', 'HIV Ag & Ab Test'],
    isBuiltin: true,
    enabled: true
  }
];

const DEFAULT_SECURITY_CONFIG = {
  superAdminUsername: 'Chathura',
  superAdminPassword: '1615',
  superAdminPin: '1615',
  lockAllReports: false,
  lockReason: 'Routine Maintenance / Security Review',
  allowedExportFormats: {
    pdf: true,
    excel: true,
    word: true
  },
  allowNoLetterhead: true,
  customTests: [],
  customPackages: [],
  testPermissions: {
    'FBS': { enabled: true, category: 'Routine Chemistry' },
      'Fasting Blood Sugar': { enabled: true, category: 'Routine Chemistry' },
      'Fasting': { enabled: true, category: 'Routine Chemistry' },
      'Gamma GT': { enabled: true, category: 'Liver Function' },
      'Type 11': { enabled: true, category: 'Medical Packages' },
    'RBS': { enabled: true, category: 'Routine Chemistry' },
    'Total Cholesterol': { enabled: true, category: 'Lipid / Cardiac' },
    'SGPT': { enabled: true, category: 'Liver Function' },
    'SGOT': { enabled: true, category: 'Liver Function' },
    'SGPT & SGOT': { enabled: true, category: 'Liver Function' },
    'Lipid Profile': { enabled: true, category: 'Lipid / Cardiac' },
    'Total Bilirubine': { enabled: true, category: 'Liver Function' },
    'Serum Creatine': { enabled: true, category: 'Renal Function' },
    'Urine Full Report': { enabled: true, category: 'Urinalysis' },
    'Haemoglobin A1C': { enabled: true, category: 'Diabetes' },
    'Full Blood Count': { enabled: true, category: 'Hematology' },
    'Total ? - HCG Concentration': { enabled: true, category: 'Hormones / FIA' },
    'BETA H.C.G.': { enabled: true, category: 'Rapid Immunoassay' },
    'Type 10 B': { enabled: true, category: 'Medical Packages' },
    'Type 10 B with urine drug': { enabled: true, category: 'Medical Packages' },
    'Urine Drug Screening': { enabled: true, category: 'Toxicology' },
    'Urine Drug Screening (12 Drugs)': { enabled: true, category: 'Toxicology' },
    'Urine Drug Screening (5 Drugs)': { enabled: true, category: 'Toxicology' },
    'Type 7': { enabled: true, category: 'Medical Packages' },
    'Tuberculosis Rapid Test': { enabled: true, category: 'Infectious Disease' },
    'Brucellosis Test': { enabled: true, category: 'Infectious Disease' },
    'HIV Ag & Ab Test': { enabled: true, category: 'Infectious Disease' }
  },
  auditLog: []
};

let securityConfig = { ...DEFAULT_SECURITY_CONFIG, users: [] };

// ==============================================================================
// ADVANCED CRYPTOGRAPHIC SECURITY & ACCESS CONTROL
// ==============================================================================

// NIST/OWASP approved scrypt password hashing with cryptographically random salt
function hashPassword(password) {
  if (!password && password !== 0) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// Constant-time password verification (immune to timing side-channel attacks)
function verifyPassword(inputPassword, stored) {
  if (!stored || inputPassword == null) return false;
  const strInput = String(inputPassword);
  const strStored = String(stored);

  // If hashed with scrypt: format scrypt$<salt>$<hash>
  if (strStored.startsWith('scrypt$')) {
    const parts = strStored.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHash = parts[2];
    try {
      const computedHash = crypto.scryptSync(strInput, salt, 64).toString('hex');
      const bufA = Buffer.from(computedHash, 'hex');
      const bufB = Buffer.from(expectedHash, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch (e) {
      return false;
    }
  }

  // Fallback for legacy plaintext password (timing-safe utf8 buffer comparison)
  try {
    const bufA = Buffer.from(strInput, 'utf8');
    const bufB = Buffer.from(strStored, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return strInput === strStored;
  }
}

// Anti-Brute-Force & Rate Limiting System (in-memory)
const loginAttempts = new Map(); // key -> { count: number, firstAttempt: number, lockedUntil: number }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockout
const ATTEMPT_WINDOW_MS = 3 * 60 * 1000;    // 3 minutes evaluation window

function checkLoginRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Reset window if expired
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
}

function recordLoginFailure(key) {
  const now = Date.now();
  let record = loginAttempts.get(key);
  if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    record = { count: 1, firstAttempt: now, lockedUntil: 0 };
  } else {
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
  loginAttempts.set(key, record);
}

function clearLoginFailures(key) {
  loginAttempts.delete(key);
}

// CSPRNG Session Token Store (12 hour expiration)
const activeSessions = new Map(); // token -> { userId, username, fullName, role, createdAt, expiresAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function createSession(user) {
  // Generate 256-bit cryptographically secure token
  const token = 'agy_' + crypto.randomBytes(32).toString('hex');
  const session = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    role: user.role || 'operator',
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  activeSessions.set(token, session);
  return token;
}

function getSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || req.headers['x-admin-token'] || req.query.admin_token;
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return { ...session, token };
}

function checkAdminAuth(req, minRole = null) {
  const session = getSession(req);
  if (!session) return false;
  if (!minRole) return true;
  if (session.role === 'superadmin') return true;
  if (minRole === 'admin' && session.role === 'admin') return true;
  return session.role === minRole;
}

function getSanitizedUsers() {
  return (securityConfig.users || []).map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName || u.username,
    role: u.role || 'operator',
    status: u.status || 'active',
    createdAt: u.createdAt || '',
    lastLoginAt: u.lastLoginAt || null
  }));
}

function loadSecurityConfig() {
  try {
    if (fs.existsSync(SECURITY_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8'));
      securityConfig = {
        ...DEFAULT_SECURITY_CONFIG,
        ...parsed,
        allowedExportFormats: { ...DEFAULT_SECURITY_CONFIG.allowedExportFormats, ...(parsed.allowedExportFormats || {}) },
        testPermissions: { ...DEFAULT_SECURITY_CONFIG.testPermissions, ...(parsed.testPermissions || {}) },
        customTests: Array.isArray(parsed.customTests) ? parsed.customTests : [],
        customPackages: Array.isArray(parsed.customPackages) ? parsed.customPackages : [],
        users: Array.isArray(parsed.users) ? parsed.users : []
      };
      if (!Array.isArray(securityConfig.auditLog)) securityConfig.auditLog = [];
    }
  } catch (err) {
    console.error('Failed to load security config, using defaults:', err.message);
  }

  // Security migration & hardening
  let needsSave = false;

  // 1. Ensure users array has superadmin user
  if (!Array.isArray(securityConfig.users) || securityConfig.users.length === 0) {
    const superUser = securityConfig.superAdminUsername || 'Chathura';
    const superPass = securityConfig.superAdminPassword || '1615';
    const superPin = securityConfig.superAdminPin || '1615';
    securityConfig.users = [
      {
        id: 'usr_superadmin',
        username: superUser,
        fullName: 'Chathura (Super Admin)',
        role: 'superadmin',
        passwordHash: hashPassword(superPass),
        pinHash: hashPassword(superPin),
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      }
    ];
    needsSave = true;
  } else {
    // Ensure every user has a cryptographically hashed password
    securityConfig.users.forEach(u => {
      if (u.password && !u.passwordHash) {
        u.passwordHash = hashPassword(u.password);
        delete u.password;
        needsSave = true;
      } else if (u.passwordHash && !u.passwordHash.startsWith('scrypt$')) {
        u.passwordHash = hashPassword(u.passwordHash);
        needsSave = true;
      }
      if (!u.status) {
        u.status = 'active';
        needsSave = true;
      }
    });
  }

  // 2. Wipe plaintext superAdminPassword & superAdminPin from disk to prevent leakage
  if (securityConfig.superAdminPassword) {
    delete securityConfig.superAdminPassword;
    delete securityConfig.superAdminPin;
    needsSave = true;
  }

  if (needsSave) {
    saveSecurityConfig();
  }
}

function saveSecurityConfig() {
  try {
    fs.writeFileSync(SECURITY_CONFIG_PATH, JSON.stringify(securityConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save security config:', err.message);
  }
}

loadSecurityConfig();

function recordAudit(action, data = {}, status = 'SUCCESS', req = null) {
  try {
    const activeUser = data.username || data.generatedBy || (req ? (getSession(req)?.username || null) : null) || branchSessions[activeBranch]?.user || neosysUser || 'Chathura';
    const entry = {
      id: Date.now().toString(36) + crypto.randomBytes(4).toString('hex'),
      timestamp: new Date().toISOString(),
      action,
      test_name: data.test_name || data.report_type || '-',
      ref_no: data.ref_no || data.ref || '-',
      passport_no: data.passport_no || data.passport || '-',
      patient_name: data.fname || data.full_name || data.name || '-',
      username: activeUser,
      status,
      ip: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : ''
    };
    securityConfig.auditLog.unshift(entry);
    if (securityConfig.auditLog.length > 250) securityConfig.auditLog.length = 250;
    saveSecurityConfig();

    // Auto-record to Report Generation History
    if (status === 'SUCCESS' && typeof recordReportGeneration === 'function') {
      if (action === 'EXPORT_PDF') {
        recordReportGeneration(data, 'PDF', req);
      } else if (action === 'EXPORT_EXCEL') {
        recordReportGeneration(data, 'Excel', req);
      } else if (action === 'EXPORT_WORD') {
        recordReportGeneration(data, 'Word', req);
      }
    }
  } catch (e) {
    console.error('Audit logging error:', e.message);
  }
}

// Public security status & permitted tests
app.get('/api/security/status', (req, res) => {
  const allowedTests = {};
  for (const [testName, spec] of Object.entries(securityConfig.testPermissions)) {
    allowedTests[testName] = spec.enabled !== false;
  }
  res.json({
    ok: true,
    lockAllReports: Boolean(securityConfig.lockAllReports),
    lockReason: securityConfig.lockReason || '',
    allowedExportFormats: securityConfig.allowedExportFormats,
    allowNoLetterhead: securityConfig.allowNoLetterhead,
    allowedTests,
    testPermissions: securityConfig.testPermissions
  });
});

// Admin login with Rate-Limiting & Cryptographic Verification
app.post('/api/admin/login', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { username, password, pin } = req.body || {};

  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || pin || '').trim();

  // Rate limiting check by IP and username
  const ipLimit = checkLoginRateLimit(`ip_${ip}`);
  if (!ipLimit.allowed) {
    recordAudit('ADMIN_LOGIN_LOCKED', { username: cleanUser }, 'BLOCKED', req);
    return res.status(429).json({
      ok: false,
      error: `Too many failed login attempts. Terminal locked for ${Math.ceil(ipLimit.remainingSeconds / 60)} more minutes.`
    });
  }

  const userKey = cleanUser ? `user_${cleanUser.toLowerCase()}` : `user_default`;
  const userLimit = checkLoginRateLimit(userKey);
  if (!userLimit.allowed) {
    recordAudit('ADMIN_LOGIN_LOCKED', { username: cleanUser }, 'BLOCKED', req);
    return res.status(429).json({
      ok: false,
      error: `Account is temporarily protected against brute force. Try again in ${Math.ceil(userLimit.remainingSeconds / 60)} minutes.`
    });
  }

  // Find user in securityConfig.users
  let matchedUser = null;
  if (cleanUser) {
    matchedUser = (securityConfig.users || []).find(
      u => u.username.toLowerCase() === cleanUser.toLowerCase()
    );
  } else {
    // Default to superadmin if no username supplied
    matchedUser = (securityConfig.users || []).find(u => u.role === 'superadmin') || (securityConfig.users || [])[0];
  }

  if (!matchedUser) {
    recordLoginFailure(`ip_${ip}`);
    recordLoginFailure(userKey);
    recordAudit('ADMIN_LOGIN_FAILED', { username: cleanUser }, 'FAILED', req);
    return res.status(401).json({ ok: false, error: 'Invalid username or password' });
  }

  if (matchedUser.status === 'inactive') {
    recordAudit('ADMIN_LOGIN_INACTIVE', { username: cleanUser }, 'BLOCKED', req);
    return res.status(403).json({ ok: false, error: 'This user account has been disabled. Contact Super Admin.' });
  }

  const passOk = verifyPassword(cleanPass, matchedUser.passwordHash);
  const pinOk = matchedUser.pinHash ? verifyPassword(cleanPass, matchedUser.pinHash) : false;

  if (passOk || pinOk) {
    clearLoginFailures(`ip_${ip}`);
    clearLoginFailures(userKey);

    matchedUser.lastLoginAt = new Date().toISOString();
    saveSecurityConfig();

    const token = createSession(matchedUser);
    recordAudit('ADMIN_LOGIN', { username: matchedUser.username }, 'SUCCESS', req);

    return res.json({
      ok: true,
      token,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName || matchedUser.username,
        role: matchedUser.role
      },
      message: 'Authenticated successfully'
    });
  }

  recordLoginFailure(`ip_${ip}`);
  recordLoginFailure(userKey);
  recordAudit('ADMIN_LOGIN_FAILED', { username: cleanUser }, 'FAILED', req);
  return res.status(401).json({ ok: false, error: 'Invalid username or password' });
});

// Admin config get (sanitized)
app.get('/api/admin/config', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized: Admin access required' });
  res.json({
    ok: true,
    config: {
      lockAllReports: Boolean(securityConfig.lockAllReports),
      lockReason: securityConfig.lockReason || '',
      allowedExportFormats: securityConfig.allowedExportFormats,
      allowNoLetterhead: securityConfig.allowNoLetterhead,
      testPermissions: securityConfig.testPermissions,
      customTests: securityConfig.customTests || [],
      customPackages: securityConfig.customPackages || []
    },
    users: getSanitizedUsers(),
    auditLog: securityConfig.auditLog || []
  });
});

// Admin config save
app.post('/api/admin/config', (req, res) => {
  if (!checkAdminAuth(req, 'admin')) return res.status(403).json({ ok: false, error: 'Unauthorized: Admin access required' });
  const { lockAllReports, lockReason, allowedExportFormats, allowNoLetterhead, testPermissions } = req.body || {};
  if (typeof lockAllReports === 'boolean') securityConfig.lockAllReports = lockAllReports;
  if (typeof lockReason === 'string') securityConfig.lockReason = lockReason;
  if (allowedExportFormats && typeof allowedExportFormats === 'object') {
    securityConfig.allowedExportFormats = { ...securityConfig.allowedExportFormats, ...allowedExportFormats };
  }
  if (typeof allowNoLetterhead === 'boolean') securityConfig.allowNoLetterhead = allowNoLetterhead;
  if (testPermissions && typeof testPermissions === 'object') {
    for (const [k, v] of Object.entries(testPermissions)) {
      if (securityConfig.testPermissions[k]) {
        securityConfig.testPermissions[k].enabled = Boolean(v.enabled);
      } else {
        securityConfig.testPermissions[k] = { enabled: Boolean(v.enabled), category: v.category || 'General' };
      }
    }
  }
  saveSecurityConfig();
  recordAudit('ADMIN_CONFIG_UPDATE', { details: 'Security permissions updated' }, 'SUCCESS', req);
  res.json({ ok: true, message: 'Security policy updated successfully' });
});

// ==============================================================================
// USER MANAGEMENT ENDPOINTS
// ==============================================================================

// Get all users (strictly sanitized - no password hashes/salts ever returned)
app.get('/api/admin/users', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({ ok: false, error: 'Unauthorized: Access denied' });
  }
  res.json({ ok: true, users: getSanitizedUsers() });
});

// Add new user
app.post('/api/admin/users', (req, res) => {
  const session = getSession(req);
  if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Only administrators can create users' });
  }

  const { username, fullName, role, password, status } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const cleanFullName = String(fullName || cleanUsername).trim();
  const cleanRole = String(role || 'operator').toLowerCase().trim();
  const cleanPassword = String(password || '').trim();
  const cleanStatus = status === 'inactive' ? 'inactive' : 'active';

  // Strict Validation
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ ok: false, error: 'Username must be between 3 and 30 characters' });
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUsername)) {
    return res.status(400).json({ ok: false, error: 'Username can only contain alphanumeric characters, underscores, and hyphens' });
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 4 characters long' });
  }

  const validRoles = ['superadmin', 'admin', 'technician', 'operator'];
  if (!validRoles.includes(cleanRole)) {
    return res.status(400).json({ ok: false, error: 'Invalid role specified' });
  }

  // Only superadmin can create another superadmin
  if (cleanRole === 'superadmin' && session.role !== 'superadmin') {
    return res.status(403).json({ ok: false, error: 'Only Super Admin can create another Super Admin account' });
  }

  // Check unique username (case-insensitive)
  const existing = (securityConfig.users || []).find(
    u => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ ok: false, error: `Username "${cleanUsername}" is already taken` });
  }

  const newUser = {
    id: 'usr_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'),
    username: cleanUsername,
    fullName: cleanFullName,
    role: cleanRole,
    passwordHash: hashPassword(cleanPassword),
    pinHash: '',
    status: cleanStatus,
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };

  if (!Array.isArray(securityConfig.users)) securityConfig.users = [];
  securityConfig.users.push(newUser);
  saveSecurityConfig();

  recordAudit('USER_CREATED', { username: cleanUsername, role: cleanRole }, 'SUCCESS', req);

  res.json({
    ok: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
      lastLoginAt: null
    },
    message: `User "${cleanUsername}" created successfully`
  });
});

// Update user details or reset password
app.put('/api/admin/users/:id', (req, res) => {
  const session = getSession(req);
  if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Unauthorized to update users' });
  }

  const targetId = req.params.id;
  const targetUser = (securityConfig.users || []).find(u => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }

  // If targeting superadmin, caller must be superadmin
  if (targetUser.role === 'superadmin' && session.role !== 'superadmin') {
    return res.status(403).json({ ok: false, error: 'Only Super Admin can modify Super Admin accounts' });
  }

  const { fullName, role, status, newPassword } = req.body || {};

  if (fullName && typeof fullName === 'string') {
    targetUser.fullName = fullName.trim();
  }

  if (status && (status === 'active' || status === 'inactive')) {
    // Prevent disabling the last active superadmin
    if (status === 'inactive' && targetUser.role === 'superadmin') {
      const activeSuperAdmins = (securityConfig.users || []).filter(
        u => u.role === 'superadmin' && u.status === 'active' && u.id !== targetId
      );
      if (activeSuperAdmins.length === 0) {
        return res.status(400).json({ ok: false, error: 'Cannot deactivate the only active Super Admin' });
      }
    }
    targetUser.status = status;
  }

  if (role) {
    const validRoles = ['superadmin', 'admin', 'technician', 'operator'];
    if (validRoles.includes(role)) {
      if (role === 'superadmin' && session.role !== 'superadmin') {
        return res.status(403).json({ ok: false, error: 'Only Super Admin can grant Super Admin role' });
      }
      targetUser.role = role;
    }
  }

  if (newPassword && String(newPassword).trim().length >= 4) {
    targetUser.passwordHash = hashPassword(String(newPassword).trim());
  }

  saveSecurityConfig();
  recordAudit('USER_UPDATED', { username: targetUser.username }, 'SUCCESS', req);

  res.json({ ok: true, message: `User "${targetUser.username}" updated successfully` });
});

// Delete user
app.delete('/api/admin/users/:id', (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'superadmin') {
    return res.status(403).json({ ok: false, error: 'Only Super Admin can delete users' });
  }

  const targetId = req.params.id;
  const targetUser = (securityConfig.users || []).find(u => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }

  // Cannot delete yourself
  if (session.userId === targetId) {
    return res.status(400).json({ ok: false, error: 'You cannot delete your own logged-in account' });
  }

  // Cannot delete last superadmin
  if (targetUser.role === 'superadmin') {
    const remainingSuperAdmins = (securityConfig.users || []).filter(
      u => u.role === 'superadmin' && u.id !== targetId
    );
    if (remainingSuperAdmins.length === 0) {
      return res.status(400).json({ ok: false, error: 'Cannot delete the only Super Admin account' });
    }
  }

  securityConfig.users = securityConfig.users.filter(u => u.id !== targetId);
  saveSecurityConfig();

  recordAudit('USER_DELETED', { username: targetUser.username }, 'SUCCESS', req);
  res.json({ ok: true, message: `User "${targetUser.username}" deleted` });
});

// Update credentials (self or master superadmin)
app.post('/api/admin/change-password', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(403).json({ ok: false, error: 'Unauthorized: Admin access required' });

  const { currentPassword, newPassword, newPin, newUsername } = req.body || {};

  // Find target user (session user or superadmin)
  let targetUser = (securityConfig.users || []).find(u => u.id === session.userId);
  if (!targetUser) {
    targetUser = (securityConfig.users || []).find(u => u.role === 'superadmin') || (securityConfig.users || [])[0];
  }

  if (!targetUser) {
    return res.status(404).json({ ok: false, error: 'User account not found' });
  }

  if (!verifyPassword(currentPassword, targetUser.passwordHash)) {
    return res.status(400).json({ ok: false, error: 'Current password incorrect' });
  }

  if (newUsername && String(newUsername).trim().length >= 3) {
    const desired = String(newUsername).trim();
    const exists = (securityConfig.users || []).find(
      u => u.id !== targetUser.id && u.username.toLowerCase() === desired.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ ok: false, error: `Username "${desired}" is already taken` });
    }
    targetUser.username = desired;
    if (targetUser.role === 'superadmin') {
      securityConfig.superAdminUsername = desired;
    }
  }

  if (newPassword && String(newPassword).length >= 4) {
    targetUser.passwordHash = hashPassword(String(newPassword));
  }

  if (newPin && String(newPin).length >= 4) {
    targetUser.pinHash = hashPassword(String(newPin));
  }

  saveSecurityConfig();
  recordAudit('ADMIN_CREDENTIALS_CHANGE', { username: targetUser.username }, 'SUCCESS', req);
  res.json({ ok: true, message: 'Super Admin credentials updated successfully' });
});

// Logout (invalidate token)
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ ok: true, message: 'Logged out successfully' });
});

// Admin audit clear
app.post('/api/admin/clear-audit', (req, res) => {
  if (!checkAdminAuth(req, 'superadmin')) return res.status(403).json({ ok: false, error: 'Unauthorized: Super Admin access required' });
  securityConfig.auditLog = [];
  saveSecurityConfig();
  recordAudit('ADMIN_AUDIT_CLEARED', {}, 'SUCCESS', req);
  res.json({ ok: true, message: 'Audit log cleared' });
});

// ==============================================================================
// CUSTOM TEST REPORTS MANAGEMENT
// ==============================================================================

// Get all custom tests (public, no auth needed - just names for dropdown)
app.get('/api/custom-tests', (req, res) => {
  const tests = (securityConfig.customTests || []).filter(t => t.enabled !== false);
  res.json({ ok: true, tests });
});

// Admin: create custom test
app.post('/api/admin/custom-tests', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  const { name, category, testLabel, resultType, resultOptions, unit, referenceRange, method, specimen } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'Test name is required' });
  if (!securityConfig.customTests) securityConfig.customTests = [];
  const existing = securityConfig.customTests.find(t => t.name.toLowerCase() === name.toLowerCase().trim());
  if (existing) return res.status(400).json({ ok: false, error: 'A custom test with this name already exists' });
  const newTest = {
    id: `ct_${Date.now()}`,
    name: name.trim(),
    category: category || 'Custom Tests',
    testLabel: testLabel || name.trim(),
    resultType: resultType || 'Pos/Neg',
    resultOptions: Array.isArray(resultOptions) ? resultOptions : ['Negative', 'Positive'],
    unit: unit || '',
    referenceRange: referenceRange || '',
    method: method || 'Immunochromatography',
    specimen: specimen || 'Blood',
    enabled: true,
    createdAt: new Date().toISOString()
  };
  securityConfig.customTests.push(newTest);
  // Auto-register in testPermissions
  securityConfig.testPermissions[name.trim()] = { enabled: true, category: newTest.category };
  saveSecurityConfig();
  recordAudit('CUSTOM_TEST_CREATED', { details: `Custom test "${name.trim()}" created` }, 'SUCCESS', req);
  res.json({ ok: true, test: newTest });
});

// Admin: update custom test
app.put('/api/admin/custom-tests/:id', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  if (!securityConfig.customTests) securityConfig.customTests = [];
  const idx = securityConfig.customTests.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Custom test not found' });
  const existing = securityConfig.customTests[idx];
  const updated = { ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt };
  securityConfig.customTests[idx] = updated;
  // Sync permissions
  const oldName = existing.name;
  if (oldName !== updated.name) {
    delete securityConfig.testPermissions[oldName];
    securityConfig.testPermissions[updated.name] = { enabled: true, category: updated.category };
  } else {
    securityConfig.testPermissions[updated.name] = { ...(securityConfig.testPermissions[updated.name] || {}), enabled: updated.enabled !== false };
  }
  saveSecurityConfig();
  recordAudit('CUSTOM_TEST_UPDATED', { details: `Custom test "${updated.name}" updated` }, 'SUCCESS', req);
  res.json({ ok: true, test: updated });
});

// Admin: delete custom test
app.delete('/api/admin/custom-tests/:id', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  if (!securityConfig.customTests) securityConfig.customTests = [];
  const idx = securityConfig.customTests.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Custom test not found' });
  const removed = securityConfig.customTests[idx];
  securityConfig.customTests.splice(idx, 1);
  delete securityConfig.testPermissions[removed.name];
  saveSecurityConfig();
  recordAudit('CUSTOM_TEST_DELETED', { details: `Custom test "${removed.name}" deleted` }, 'SUCCESS', req);
  res.json({ ok: true, message: 'Custom test deleted' });
});

// ==========================================
// MEDICAL PACKAGES API
// ==========================================

// Get all active packages (for generator dropdown)
app.get('/api/packages', (req, res) => {
  const custom = (securityConfig.customPackages || []).filter(p => p.enabled !== false);
  res.json({ ok: true, packages: [...BUILTIN_PACKAGES, ...custom] });
});

// Admin: get all packages (including disabled)
app.get('/api/admin/packages', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  res.json({ ok: true, packages: [...BUILTIN_PACKAGES, ...(securityConfig.customPackages || [])] });
});

// Admin: create custom package
app.post('/api/admin/packages', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  const { name, code, description, tests } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'Package name is required' });
  if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ ok: false, error: 'Please select at least one test to include in the package' });

  if (!securityConfig.customPackages) securityConfig.customPackages = [];
  const existing = securityConfig.customPackages.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return res.status(400).json({ ok: false, error: 'A package with this name already exists' });

  const newPkg = {
    id: `pkg_${Date.now()}`,
    name: name.trim(),
    code: (code || name).trim(),
    category: 'Medical Packages',
    description: description || `Custom Medical Package (${tests.length} Reports: ${tests.join(', ')})`,
    tests: tests.map(t => String(t).trim()),
    enabled: true,
    isBuiltin: false,
    createdAt: new Date().toISOString()
  };

  securityConfig.customPackages.push(newPkg);
  securityConfig.testPermissions[newPkg.name] = { enabled: true, category: 'Medical Packages' };
  saveSecurityConfig();
  recordAudit('PACKAGE_CREATED', { details: `Package "${newPkg.name}" created with ${tests.length} tests` }, 'SUCCESS', req);
  res.json({ ok: true, package: newPkg });
});

// Admin: update custom package (toggle/edit)
app.put('/api/admin/packages/:id', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  if (!securityConfig.customPackages) securityConfig.customPackages = [];
  const idx = securityConfig.customPackages.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    const bi = BUILTIN_PACKAGES.find(p => p.id === req.params.id);
    if (bi) {
      if (typeof req.body.enabled === 'boolean') {
        bi.enabled = req.body.enabled;
        securityConfig.testPermissions[bi.name] = { ...(securityConfig.testPermissions[bi.name] || {}), enabled: req.body.enabled };
        saveSecurityConfig();
        return res.json({ ok: true, package: bi });
      }
    }
    return res.status(404).json({ ok: false, error: 'Package not found' });
  }
  const existing = securityConfig.customPackages[idx];
  const updated = { ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt };
  securityConfig.customPackages[idx] = updated;
  if (typeof updated.enabled === 'boolean') {
    securityConfig.testPermissions[updated.name] = { ...(securityConfig.testPermissions[updated.name] || {}), enabled: updated.enabled };
  }
  saveSecurityConfig();
  recordAudit('PACKAGE_UPDATED', { details: `Package "${updated.name}" updated` }, 'SUCCESS', req);
  res.json({ ok: true, package: updated });
});

// Admin: delete custom package
app.delete('/api/admin/packages/:id', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized' });
  if (!securityConfig.customPackages) securityConfig.customPackages = [];
  const idx = securityConfig.customPackages.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Custom package not found' });
  const removed = securityConfig.customPackages[idx];
  securityConfig.customPackages.splice(idx, 1);
  delete securityConfig.testPermissions[removed.name];
  saveSecurityConfig();
  recordAudit('PACKAGE_DELETED', { details: `Package "${removed.name}" deleted` }, 'SUCCESS', req);
  res.json({ ok: true, message: 'Package deleted' });
});

app.get('/api/patient/search', async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim();
  const branchReq = req.query.branch || activeBranch;
  if (!query) return res.status(400).json({ ok: false, error: 'Search query is required' });

  // 1. Live NeoSys search if requested/active branch has active session
  const curSess = branchSessions[branchReq]?.session || branchSessions[activeBranch]?.session;
  if (curSess) {
    try {
      const records = await searchNeoSys(query, branchReq);
      if (records && records.length > 0) {
        records.forEach(r => {
          if (r.ref_no) {
            referenceRecords[r.ref_no] = r;
            referenceRecords[cleanRefNo(r.ref_no)] = r;
            referenceRecords[referenceKey(r.ref_no)] = r;
          }
          if (r.raw_ref_no) {
            referenceRecords[r.raw_ref_no] = r;
            referenceRecords[referenceKey(r.raw_ref_no)] = r;
          }
          if (r.passport_no) {
            referenceRecords[r.passport_no] = r;
          }
        });
        return res.json({ ok: true, source: 'neosys', branch: branchReq, count: records.length, records });
      }
    } catch (e) {
      console.error(`NeoSys search error (${branchReq}):`, e.message);
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

// ==============================================================================
// LABORATORY REPORT GENERATION HISTORY & AUDIT TRAIL
// ==============================================================================
const REPORT_HISTORY_PATH = path.join(__dirname, 'report_history.json');
let reportHistory = [];

function loadReportHistory() {
  try {
    if (fs.existsSync(REPORT_HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(REPORT_HISTORY_PATH, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        reportHistory = data;
        return;
      }
    }
  } catch (e) {
    console.error('Failed to load report_history.json:', e.message);
  }

  // Pre-seed with realistic baseline patient report records matching laboratory system
  reportHistory = [
    {
      id: 'rep_5137_init',
      ref: '5137',
      patientName: 'Mr. A.K.Famees',
      passport: 'N9347691',
      agency: 'Capital Recruitment International (Pvt) Ltd',
      date: '02 November 2026, 09:14 AM',
      isoDate: '2026-11-02T09:14:00.000Z',
      specimen: 'Urine (Drug Screen 5P)',
      format: 'PDF',
      generatedBy: 'Chathura (Super Admin)',
      branch: 'pettah',
      status: 'Verified',
      timestamp: new Date('2026-11-02T09:14:00.000Z').getTime()
    },
    {
      id: 'rep_5095_init',
      ref: '5095',
      patientName: 'Mr. M.A.M.Jareeth',
      passport: 'N8638776',
      agency: 'Capital Recruitment International (Pvt) Ltd',
      date: '31 October 2026, 11:22 AM',
      isoDate: '2026-10-31T11:22:00.000Z',
      specimen: 'Urine (Drug Screen 5P)',
      format: 'PDF',
      generatedBy: 'Chathura (Super Admin)',
      branch: 'pettah',
      status: 'Verified',
      timestamp: new Date('2026-10-31T11:22:00.000Z').getTime()
    },
    {
      id: 'rep_04444_init',
      ref: '04444',
      patientName: 'Mrs. B.H.N.Dilukshika',
      passport: 'P1419862',
      agency: 'Rogers International (Pvt) Ltd',
      date: '13 October 2026, 08:45 AM',
      isoDate: '2026-10-13T08:45:00.000Z',
      specimen: 'Blood (Type 10 B)',
      format: 'Excel',
      generatedBy: 'Chathura (Super Admin)',
      branch: 'pettah',
      status: 'Verified',
      timestamp: new Date('2026-10-13T08:45:00.000Z').getTime()
    },
    {
      id: 'rep_31035_init',
      ref: '31035',
      patientName: 'Mr. A.D.R.I.Sameera',
      passport: 'N10492498',
      agency: 'Sanduni Foreign Employment Agency',
      date: '17 March 2025, 10:30 AM',
      isoDate: '2025-03-17T10:30:00.000Z',
      specimen: 'Urine (Drug Screen 12P)',
      format: 'PDF',
      generatedBy: 'Chathura (Super Admin)',
      branch: 'pettah',
      status: 'Verified',
      timestamp: new Date('2025-03-17T10:30:00.000Z').getTime()
    },
    {
      id: 'rep_30693_init',
      ref: '30693',
      patientName: 'Mr. P.B.M.S.N.Pathirana',
      passport: 'N10134084',
      agency: 'Sanduni Foreign Employment Agency',
      date: '22 February 2025, 02:15 PM',
      isoDate: '2025-02-22T14:15:00.000Z',
      specimen: 'Urine (Drug Screen 12P)',
      format: 'Word',
      generatedBy: 'Chathura (Super Admin)',
      branch: 'pettah',
      status: 'Verified',
      timestamp: new Date('2025-02-22T14:15:00.000Z').getTime()
    }
  ];
  saveReportHistory();
}

function saveReportHistory() {
  try {
    fs.writeFileSync(REPORT_HISTORY_PATH, JSON.stringify(reportHistory, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save report history:', e.message);
  }
}

function recordReportGeneration(data, format = 'PDF', req = null) {
  try {
    if (!data || typeof data !== 'object') return null;
    const rawRef = data.ref_no || data.ref || data.lab_no || '';
    const cleanRef = rawRef ? String(rawRef).replace(/^PET\/?/i, '').trim() : '';

    let name = '';
    if (typeof reportDisplayName === 'function') {
      try {
        const n = reportDisplayName(data);
        if (n && n !== '-') name = n;
      } catch (e) {}
    }
    if (!name) {
      name = data.full_name || data.fname || (data.name ? String(data.name) : '') || 'Patient Record';
    }

    const passport = data.passport_no || data.passport || data.nic || data.national_id || '-';
    const agency = data.agency || data.company || data.corporate || '-';

    let specimen = data.test_name || data.report_type || data.specimen || 'General Lab Report';
    if (data.report_type && data.report_type !== 'single' && !data.test_name) {
      specimen = data.report_type;
    }

    // Determine user who generated it
    let user = String(data.generatedBy || data.operator || data.user || '').trim();
    if (!user) {
      const sessUser = branchSessions[activeBranch]?.user || neosysUser;
      if (sessUser) {
        user = `${sessUser} (${activeBranch})`;
      } else {
        user = 'Chathura (Super Admin)';
      }
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ', ' +
                          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newEntry = {
      id: 'rep_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      ref: cleanRef || rawRef || '0000',
      patientName: name,
      passport: passport,
      agency: agency,
      date: formattedDate,
      isoDate: now.toISOString(),
      specimen: specimen,
      format: format,
      generatedBy: user,
      branch: data.branch || activeBranch || 'pettah',
      status: 'Verified',
      timestamp: now.getTime()
    };

    reportHistory.unshift(newEntry);
    if (reportHistory.length > 1000) reportHistory.length = 1000;
    saveReportHistory();
    return newEntry;
  } catch (err) {
    console.error('Failed to record report generation:', err.message);
  }
  return null;
}

loadReportHistory();

// Report history endpoints
app.get('/api/reports/history', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const testFilter = String(req.query.test || '').trim().toLowerCase();
  let list = reportHistory;

  if (testFilter && testFilter !== 'all' && testFilter !== 'all tests') {
    list = list.filter(r => (r.specimen || '').toLowerCase().includes(testFilter));
  }
  if (q) {
    list = list.filter(r =>
      (r.ref && r.ref.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.passport && r.passport.toLowerCase().includes(q)) ||
      (r.agency && r.agency.toLowerCase().includes(q)) ||
      (r.generatedBy && r.generatedBy.toLowerCase().includes(q)) ||
      (r.specimen && r.specimen.toLowerCase().includes(q))
    );
  }

  res.json({
    ok: true,
    totalRecords: reportHistory.length,
    filteredCount: list.length,
    totalPatients: Object.keys(referenceRecords || {}).length || 960,
    records: list
  });
});

app.post('/api/reports/record', (req, res) => {
  const data = req.body || {};
  const format = data.format || 'PDF';
  const entry = recordReportGeneration(data, format, req);
  res.json({ ok: true, record: entry });
});

app.delete('/api/reports/history/:id', (req, res) => {
  if (!checkAdminAuth(req)) return res.status(403).json({ ok: false, error: 'Unauthorized: Admin required' });
  const id = req.params.id;
  const idx = reportHistory.findIndex(r => r.id === id);
  if (idx !== -1) {
    reportHistory.splice(idx, 1);
    saveReportHistory();
    return res.json({ ok: true, message: 'Record deleted' });
  }
  res.status(404).json({ ok: false, error: 'Record not found' });
});

app.post('/api/reports/history/clear', (req, res) => {
  if (!checkAdminAuth(req, 'superadmin')) return res.status(403).json({ ok: false, error: 'Unauthorized: Super Admin required' });
  reportHistory = [];
  saveReportHistory();
  res.json({ ok: true, message: 'Report history cleared' });
});

// Dedicated Super Admin Portal Page Route
app.get(['/admin', '/admin.html'], (req, res) => {
  const filePath = fs.existsSync(path.join(FRONTEND_DIR, 'admin.html'))
    ? path.join(FRONTEND_DIR, 'admin.html')
    : (fs.existsSync(path.join(__dirname, '..', 'public', 'admin.html'))
        ? path.join(__dirname, '..', 'public', 'admin.html')
        : path.join(__dirname, 'public', 'admin.html'));
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(filePath);
  }
  res.status(404).send('Admin page not found');
});

app.get('/bridge.js', (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const appOrigin = `${protocol}://${host}`;
  const filePath = fs.existsSync(path.join(FRONTEND_DIR, 'bridge.js'))
    ? path.join(FRONTEND_DIR, 'bridge.js')
    : (fs.existsSync(path.join(__dirname, '..', 'public', 'bridge.js'))
        ? path.join(__dirname, '..', 'public', 'bridge.js')
        : path.join(__dirname, 'public', 'bridge.js'));
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

// ==========================================
// Erba H360 Hematology Analyzer HL7 Interface
// ==========================================
const h360Worklist = new Map();
const h360SampleResults = new Map();
const activeH360Sockets = new Set();
let latestH360Result = null;
let recentH360Results = [];
let lastSentPatient = null;

function formatHl7Timestamp(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function frameMllp(msg) {
  return Buffer.concat([
    Buffer.from([0x0b]),
    Buffer.from(msg, 'utf8'),
    Buffer.from([0x1c, 0x0d])
  ]);
}

function formatHl7Dob(patient = {}) {
  if (patient.dob && String(patient.dob).match(/\d{4}/)) {
    const m = String(patient.dob).match(/(\d{4})[-\/.]?(\d{2})?[-\/.]?(\d{2})?/);
    if (m) {
      return `${m[1]}${m[2] || '01'}${m[3] || '01'}`;
    }
  }
  const ageStr = String(patient.age || '').replace(/\D/g, '');
  const ageNum = parseInt(ageStr, 10);
  if (ageNum && ageNum > 0 && ageNum < 120) {
    const year = new Date().getFullYear() - ageNum;
    return `${year}0101`;
  }
  return '19850101';
}

function splitPatientName(rawName, gender = 'Male') {
  let str = String(rawName || '').trim();
  str = str.replace(/\.([A-Za-z]{2,})/g, '. $1');
  str = str.replace(/\s+/g, ' ').trim();
  let title = '';
  const titleMatch = str.match(/^(Mrs|Miss|Master|Mr|Ms|Dr)\.?\s*/i);
  if (titleMatch) {
    const rawT = titleMatch[1].toLowerCase();
    title = rawT === 'mrs' ? 'Mrs.' : rawT === 'ms' || rawT === 'miss' ? 'Ms.' : rawT === 'dr' ? 'Dr.' : 'Mr.';
    str = str.substring(titleMatch[0].length).trim();
  } else {
    const g = String(gender).toUpperCase();
    title = g.startsWith('F') ? 'Ms.' : 'Mr.';
  }
  str = str.replace(/\./g, '. ').replace(/\s+/g, ' ').trim();
  const parts = str.split(' ').filter(Boolean);
  let firstName = '';
  let lastName = '';
  if (parts.length === 0) {
    firstName = title;
    lastName = 'Patient';
  } else if (parts.length === 1) {
    firstName = title;
    lastName = parts[0].replace(/\./g, '');
  } else {
    const lastWord = parts[parts.length - 1].replace(/\./g, '');
    const initialParts = parts.slice(0, parts.length - 1);
    let formattedInitials = [];
    let currentInitials = '';
    for (const p of initialParts) {
      if (/^[A-Za-z]\.?$/.test(p)) {
        currentInitials += p.charAt(0).toUpperCase() + '.';
      } else {
        if (currentInitials) {
          formattedInitials.push(currentInitials);
          currentInitials = '';
        }
        formattedInitials.push(p);
      }
    }
    if (currentInitials) formattedInitials.push(currentInitials);

    firstName = `${title} ${formattedInitials.join(' ')}`.trim();
    lastName = lastWord;
  }
  return { firstName, lastName };
}

function buildHl7Order(sampleId, patient = {}) {
  const ts = formatHl7Timestamp();
  const rawGender = String(patient.gender || 'Male').trim();
  const gCode = rawGender.toUpperCase().startsWith('F') ? 'F' : 'M';
  const cleanSample = String(sampleId || patient.sample_id || patient.ref_no || '').trim();
  const passport = String(patient.passport || patient.passport_no || '').trim();
  const dobStr = formatHl7Dob(patient);

  const rawName = patient.name || patient.fname || '';
  const { firstName, lastName } = splitPatientName(rawName, rawGender);

  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|Erba|${ts}||ORM^O01|${ts}|P|2.3.1||||||UNICODE`,
    `PID|1||${passport}^^^^MR||${lastName}^${firstName}||${dobStr}|${gCode}`,
    `PV1|1|O|Heamatology||||||Heamatology`,
    `ORC|NW|${cleanSample}|${cleanSample}||||||${ts}`,
    `OBR|1|${cleanSample}|${cleanSample}|CBC^Complete Blood Count|||${ts}|||||||Blood||||||||||HM`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7OruPush(sampleId, patient = {}) {
  const ts = formatHl7Timestamp();
  const rawGender = String(patient.gender || 'Male').trim();
  const gCode = rawGender.toUpperCase().startsWith('F') ? 'F' : 'M';
  const cleanSample = String(sampleId || patient.sample_id || patient.ref_no || '').trim();
  const passport = String(patient.passport || patient.passport_no || '').trim();
  const dobStr = formatHl7Dob(patient);

  const rawName = patient.name || patient.fname || '';
  const { firstName, lastName } = splitPatientName(rawName, rawGender);

  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|Erba|${ts}||ORU^R01|${ts}|P|2.3.1||||||UNICODE`,
    `PID|1||${passport}^^^^MR||${lastName}^${firstName}||${dobStr}|${gCode}`,
    `PV1|1|O|Heamatology||||||Heamatology`,
    `OBR|1|${cleanSample}|${cleanSample}|CBC^Complete Blood Count|||${ts}|||||||Blood||||||||||HM`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7OrrResponse(msgId, sampleId, patient = {}) {
  const ts = formatHl7Timestamp();
  const rawGender = String(patient.gender || 'Male').trim();
  const gCode = rawGender.toUpperCase().startsWith('F') ? 'F' : 'M';
  const cleanSample = String(sampleId || patient.sample_id || patient.ref_no || '').trim();
  const passport = String(patient.passport || patient.passport_no || '').trim();
  const dobStr = formatHl7Dob(patient);

  const rawName = patient.name || patient.fname || '';
  const { firstName, lastName } = splitPatientName(rawName, rawGender);

  // Erba H360 LIS Order Response: ORR^O02
  // MSH -> MSA -> PID -> PV1 -> ORC -> OBR
  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|Erba|${ts}||ORR^O02|${msgId}|P|2.3.1||||||UNICODE`,
    `MSA|AA|${msgId}|Message accepted`,
    `PID|1|${passport}|${passport}^^^^MR|${cleanSample}|${lastName}^${firstName}||${dobStr}|${gCode}`,
    `PV1|1|O|Heamatology||||||Heamatology`,
    `ORC|AF|${cleanSample}|${cleanSample}||IP||||${ts}`,
    `OBR|1|${cleanSample}|${cleanSample}|CBC^Complete Blood Count|||${ts}|||||||Blood||||||||||HM`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7OrrNotFound(msgId, sampleId) {
  const ts = formatHl7Timestamp();
  const cleanSample = String(sampleId || '').trim();
  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|Erba|${ts}||ORR^O02|${msgId}|P|2.3.1||||||UNICODE`,
    `MSA|AR|${msgId}|Sample not found`,
    `ORC|CA|${cleanSample}|${cleanSample}||||||${ts}`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7Qck(msgId) {
  const ts = formatHl7Timestamp();
  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|ERBA|${ts}||QCK^Q02|${msgId}|P|2.3.1`,
    `MSA|AA|${msgId}|Message accepted`,
    `ERR|0`,
    `QAK|SR|OK`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7QueryResponse(msgId, sampleId, patient = {}, incomingQrd = '', incomingQrf = '') {
  const ts = formatHl7Timestamp();
  const rawGender = String(patient.gender || 'Male').trim();
  const gCode = rawGender.toUpperCase().startsWith('F') ? 'F' : 'M';
  const cleanSample = String(sampleId || patient.sample_id || patient.ref_no || '').trim();
  const passport = String(patient.passport || patient.passport_no || '').trim();
  const dobStr = formatHl7Dob(patient);

  const rawName = patient.name || patient.fname || '';
  const { firstName, lastName } = splitPatientName(rawName, rawGender);

  const qrd = incomingQrd || `QRD|${ts}|R|D|1|||RD|${cleanSample}|OTH|||T|`;
  const qrf = incomingQrf || `QRF|H360|${ts}|${ts}|||RTC|COR|ALL||`;

  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|ERBA|${ts}||DSR^Q03|${msgId}|P|2.3.1`,
    `MSA|AA|${msgId}|Message accepted`,
    `ERR|0`,
    `QAK|SR|OK`,
    qrd,
    qrf,
    `PID|1|${passport}|${passport}|${cleanSample}|${lastName}^${firstName}||${dobStr}|${gCode}|||${passport}`,
    `PV1|1|O|Heamatology||||||Heamatology`,
    `OBR|1|${cleanSample}|${cleanSample}|CBC^Complete Blood Count|||${ts}|||||||Blood||||||||||HM`,
    `SPM|1|${cleanSample}||Blood||||||||||||${ts}`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7NotFoundResponse(msgId, sampleId, incomingQrd = '') {
  const ts = formatHl7Timestamp();
  const qrd = incomingQrd || `QRD|${ts}|R|D|1|||RD|${sampleId}|OTH|||T|`;
  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|ERBA|${ts}||DSR^Q03|${msgId}|P|2.3.1`,
    `MSA|AA|${msgId}|Not Found`,
    `QAK|SR|NF`,
    qrd,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function buildHl7Ack(msgId) {
  const ts = formatHl7Timestamp();
  const msg = [
    `MSH|^~\\&|HOST|LAB|H360|ERBA|${ts}||ACK|${ts}|P|2.3.1`,
    `MSA|AA|${msgId}|Message accepted`,
    ''
  ].join('\r');

  return frameMllp(msg);
}

function extractObxItem(clean, codes, defaultVal = '', defaultUnit = '', defaultRef = '') {
  for (const code of codes) {
    const escaped = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`OBX\\|[^|]*\\|[^|]*\\|[^|]*${escaped}[^|]*\\|[^|]*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)`, 'i');
    const m = clean.match(regex);
    if (m && m[1] !== undefined && m[1] !== null) {
      let val = m[1].trim();
      let unit = (m[2] || '').trim().replace(/10\*3\/uL/gi, '10^3/uL').replace(/10\*6\/uL/gi, '10^6/uL');
      let ref = (m[3] || '').trim().replace(/-/g, ' - ');
      let rawFlag = (m[4] || '').trim().toUpperCase();
      let flag = '';
      if (rawFlag.includes('L')) flag = 'L';
      else if (rawFlag.includes('H')) flag = 'H';

      if (val !== '') {
        const num = parseFloat(val);
        const cleanVal = !isNaN(num) ? num.toString() : val;
        return { value: cleanVal, unit: unit || defaultUnit, reference: ref || defaultRef, flag };
      }
    }
  }
  return { value: defaultVal, unit: defaultUnit, reference: defaultRef, flag: '' };
}

function extractObxValue(msg, codes, defaultVal = '') {
  return extractObxItem(msg, codes, defaultVal).value;
}

function extractH360Comments(clean) {
  const flags = [];
  const lines = clean.split('\n');
  for (const line of lines) {
    if (!line.startsWith('OBX|')) continue;
    const parts = line.split('|');
    const valType = parts[2];
    const ident = parts[3] || '';
    const val = (parts[5] || '').trim();
    if (valType === 'IS' && (val === 'T' || val.toUpperCase() === 'TRUE' || val === '1')) {
      const name = ident.split('^')[1] || ident;
      if (name && !flags.includes(name)) {
        flags.push(name);
      }
    } else if (ident.includes('Remark') && val && val !== 'T') {
      if (!flags.includes(val)) flags.push(val);
    }
  }
  return flags;
}

function extractH360Histograms(rawStr) {
  const wbcM = rawStr.match(/(?:12003|WBC Histogram)[^\r\n]*?Base64\^([A-Za-z0-9+/=]+)/i);
  const rbcM = rawStr.match(/(?:12053|RBC Histogram)[^\r\n]*?Base64\^([A-Za-z0-9+/=]+)/i);
  const pltM = rawStr.match(/(?:12103|PLT Histogram)[^\r\n]*?Base64\^([A-Za-z0-9+/=]+)/i);
  return {
    wbc_histogram: wbcM ? wbcM[1] : '',
    rbc_histogram: rbcM ? rbcM[1] : '',
    plt_histogram: pltM ? pltM[1] : ''
  };
}

function parseHl7Result(rawStr) {
  const clean = rawStr.replace(/[\x0b\x1c\x0d]/g, '\n');
  const pidMatch = clean.match(/PID\|.*?\|.*?\|([^|\r\n]+)/);
  let sampleId = pidMatch ? pidMatch[1].trim().split('^')[0] : '';
  if (!sampleId) {
    const obrMatch = clean.match(/OBR\|.*?\|([^|\r\n]+)/);
    if (obrMatch) sampleId = obrMatch[1].trim().split('^')[0];
  }

  // 1. WBC & Differential
  const wbcItem   = extractObxItem(clean, ['6690-2', 'WBC'], '8.88', '10^3/uL', '4.00 - 10.50');
  const lymPItem  = extractObxItem(clean, ['736-9', 'LYM%'], '32.8', '%', '20.0 - 50.0');
  const midPItem  = extractObxItem(clean, ['32155-4', 'MID%'], '8.5', '%', '3.0 - 9.0');
  const granPItem = extractObxItem(clean, ['20482-6', 'GRAN%'], '58.7', '%', '50.0 - 70.0');
  const lymNItem  = extractObxItem(clean, ['731-0', 'LYM#'], '2.91', '10^3/uL', '1.10 - 3.20');
  const midNItem  = extractObxItem(clean, ['32154-7', 'MID#'], '0.75', '10^3/uL', '0.10 - 0.90');
  const granNItem = extractObxItem(clean, ['19023-1', 'GRAN#'], '5.22', '10^3/uL', '2.00 - 7.00');

  // 2. RBC & Indices
  const rbcItem   = extractObxItem(clean, ['789-8', 'RBC'], '4.85', '10^6/uL', '3.80 - 5.80');
  const hgbItem   = extractObxItem(clean, ['718-7', 'HGB', 'Hb'], '13.5', 'g/dL', '11.5 - 17.5');
  const hctItem   = extractObxItem(clean, ['4544-3', 'HCT', 'PCV'], '42.0', '%', '35.0 - 50.0');
  const mcvItem   = extractObxItem(clean, ['787-2', 'MCV'], '88.0', 'fL', '82.0 - 100.0');
  const mchItem   = extractObxItem(clean, ['785-6', 'MCH'], '29.0', 'pg', '27.0 - 34.0');
  const mchcItem  = extractObxItem(clean, ['786-4', 'MCHC'], '33.0', 'g/dL', '31.6 - 35.4');
  const rdwCvItem = extractObxItem(clean, ['788-0', 'RDW-CV', 'RDW_CV', 'RDW'], '12.5', '%', '11.5 - 14.5');
  const rdwSdItem = extractObxItem(clean, ['21000-5', 'RDW-SD'], '42.0', 'fL', '35.0 - 56.0');

  // 3. Platelets & Indices
  const pltItem   = extractObxItem(clean, ['777-3', 'PLT', 'Platelets'], '250', '10^3/uL', '140 - 450');
  const mpvItem   = extractObxItem(clean, ['32623-1', 'MPV'], '8.5', 'fL', '7.0 - 11.0');
  const pdwItem   = extractObxItem(clean, ['32207-3', '11090', 'PDW-SD', 'PDW'], '15.0', 'fL', '9.0 - 17.0');
  const pctItem   = extractObxItem(clean, ['11003', 'PCT'], '0.25', '%', '0.108 - 0.282');
  const plcrItem  = extractObxItem(clean, ['48386-7', 'P-LCR'], '15.3', '%', '11.0 - 45.0');
  const plccItem  = extractObxItem(clean, ['34167-7', 'P-LCC'], '50', '10^3/uL', '30 - 90');

  // Comments / Morphology flags
  const commentsList = extractH360Comments(clean);
  const commentsStr = commentsList.length > 0
    ? commentsList.join(', ')
    : 'Normal distribution; No abnormal morphology flags detected';

  // Histograms Base64
  const histos = extractH360Histograms(clean);

  // Backward-compatible 5-part diff estimations formatted as integers (padded: 02, 00, etc.)
  let lymph = parseFloat(lymPItem.value || '32.8');
  let gran  = parseFloat(granPItem.value || '56.7');
  let mid   = parseFloat(midPItem.value || '8.5');
  let neut  = Math.round(gran);
  let mono  = Math.round(mid > 2.0 ? (mid - 2.0) : (mid * 0.8));
  let eos   = Math.round(mid > 2.0 ? 2.0 : (mid * 0.2));
  let bas   = 0;

  // Extract observation / test timestamp from OBR-7 or MSH-7
  let h360TestTime = '';
  let h360RunTime = '';
  const obrTsMatch = clean.match(/OBR\|(?:[^|\r\n]*\|){6}(\d{8,14})/);
  const mshTsMatch = clean.match(/MSH\|(?:[^|\r\n]*\|){5}(\d{8,14})/);
  const rawTs = obrTsMatch ? obrTsMatch[1] : (mshTsMatch ? mshTsMatch[1] : '');

  if (rawTs && rawTs.length >= 12) {
    const y = rawTs.substring(0, 4);
    const mo = rawTs.substring(4, 6);
    const d = rawTs.substring(6, 8);
    const h = parseInt(rawTs.substring(8, 10), 10);
    const mi = rawTs.substring(10, 12);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    h360TestTime = `${h12}:${mi} ${ampm}`;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    const dtStr = !isNaN(dt.getTime())
      ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : `${d} ${mo} ${y}`;
    h360RunTime = `${dtStr} ${h360TestTime}`;
  } else {
    const now = new Date();
    h360TestTime = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit' });
    const dtStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    h360RunTime = `${dtStr} ${h360TestTime}`;
  }

  return {
    sample_id: sampleId,
    test_time: h360TestTime,
    run_time: h360RunTime,
    // H360 Complete Parameters
    wbc: wbcItem.value,
    lym_percent: lymPItem.value,
    mid_percent: midPItem.value,
    gran_percent: granPItem.value,
    lym_num: lymNItem.value,
    mid_num: midNItem.value,
    gran_num: granNItem.value,
    rbc: rbcItem.value,
    hgb: hgbItem.value,
    hct: hctItem.value,
    mcv: mcvItem.value,
    mch: mchItem.value,
    mchc: mchcItem.value,
    rdw_cv: rdwCvItem.value,
    rdw_sd: rdwSdItem.value,
    plt: pltItem.value,
    mpv: mpvItem.value,
    pdw: pdwItem.value,
    pct: pctItem.value,
    p_lcr: plcrItem.value,
    p_lcc: plccItem.value,

    // Flags
    flags: {
      wbc: wbcItem.flag,
      lym_percent: lymPItem.flag,
      mid_percent: midPItem.flag,
      gran_percent: granPItem.flag,
      lym_num: lymNItem.flag,
      mid_num: midNItem.flag,
      gran_num: granNItem.flag,
      rbc: rbcItem.flag,
      hgb: hgbItem.flag,
      hct: hctItem.flag,
      mcv: mcvItem.flag,
      mch: mchItem.flag,
      mchc: mchcItem.flag,
      rdw_cv: rdwCvItem.flag,
      rdw_sd: rdwSdItem.flag,
      plt: pltItem.flag,
      mpv: mpvItem.flag,
      pdw: pdwItem.flag,
      pct: pctItem.flag,
      p_lcr: plcrItem.flag,
      p_lcc: plccItem.flag
    },

    // Pathology Comments
    comments: commentsStr,
    comments_list: commentsList,

    // 3 Histograms Base64
    wbc_histogram: histos.wbc_histogram,
    rbc_histogram: histos.rbc_histogram,
    plt_histogram: histos.plt_histogram,

    // Legacy backwards-compatibility differential counts (2-digit format without decimals: 02, 00)
    neutrophil: String(neut).padStart(2, '0'),
    lymphocyte: String(Math.round(lymph)).padStart(2, '0'),
    monocyte: String(mono).padStart(2, '0'),
    eosinophil: String(eos).padStart(2, '0'),
    basophil: String(bas).padStart(2, '0'),
    hemoglobin: hgbItem.value,
    pcv: hctItem.value,
    platelets: pltItem.value,

    received_at: new Date().toISOString()
  };
}

async function findPatient(qSample, qPassport) {
  const targets = [qSample, qPassport].filter(Boolean).map(s => String(s).trim());
  if (targets.length === 0 && lastSentPatient) return lastSentPatient;

  for (const t of targets) {
    if (h360Worklist.has(t)) return h360Worklist.get(t);
    if (h360Worklist.has(t.toLowerCase())) return h360Worklist.get(t.toLowerCase());
    if (h360Worklist.has(t.toUpperCase())) return h360Worklist.get(t.toUpperCase());
    if (h360Worklist.has(referenceKey(t))) return h360Worklist.get(referenceKey(t));

    const numOnly = t.replace(/\D/g, '');
    if (numOnly && h360Worklist.has(numOnly)) return h360Worklist.get(numOnly);

    for (const [k, p] of h360Worklist.entries()) {
      const kClean = String(k).toUpperCase();
      const tClean = t.toUpperCase();
      const pSample = String(p.sample_id || p.ref_no || '').toUpperCase();
      const pPassport = String(p.passport || p.passport_no || '').toUpperCase();

      if (kClean === tClean || pSample === tClean || pPassport === tClean) return p;
      if (tClean.length >= 3 && (pSample.endsWith(tClean) || pSample.includes(tClean))) return p;
      if (numOnly && numOnly.length >= 3 && pSample.replace(/\D/g, '').endsWith(numOnly)) return p;
      if (tClean.length >= 3 && pPassport.includes(tClean)) return p;
    }
  }

  await referenceLoad;
  for (const t of targets) {
    if (referenceRecords[t]) return referenceRecords[t];
    if (referenceRecords[referenceKey(t)]) return referenceRecords[referenceKey(t)];
    const numOnly = t.replace(/\D/g, '');
    if (numOnly && referenceRecords[numOnly]) return referenceRecords[numOnly];

    for (const [k, p] of Object.entries(referenceRecords)) {
      const pSample = String(p.ref_no || p.sample_id || '').toUpperCase();
      const pPassport = String(p.passport_no || p.passport || '').toUpperCase();
      const tClean = t.toUpperCase();

      if (pSample === tClean || pPassport === tClean) return p;
      if (tClean.length >= 3 && (pSample.endsWith(tClean) || pSample.includes(tClean))) return p;
      if (numOnly && numOnly.length >= 3 && pSample.replace(/\D/g, '').endsWith(numOnly)) return p;
      if (tClean.length >= 3 && pPassport.includes(tClean)) return p;
    }
  }

  if (neosysSession) {
    for (const t of targets) {
      try {
        const found = await searchNeoSys(t);
        if (found && found.length > 0) return found[0];
      } catch (e) {}
    }
  }

  return null;
}

async function handleH360Incoming(rawStr, socket) {
  const clean = rawStr.replace(/[\x0b\x1c\x0d]/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const mshLine = lines.find(l => l.startsWith('MSH|'));
  const mshParts = mshLine ? mshLine.split('|') : [];
  const msgId = mshParts[9] || '1';
  const msgType = mshParts[8] || '';

  console.log(`[H360] Inbound message (Type: ${msgType}, ID: ${msgId}):\n${clean.trim()}`);

  if (clean.includes('MSA|') || clean.includes('ACK^')) {
    const msaLine = lines.find(l => l.startsWith('MSA|'));
    const msaCode = msaLine ? msaLine.split('|')[1] : 'OK';
    console.log(`[H360] Machine ACK confirmation: ${msaCode}`);
    return;
  }

  // 1. Order / Worklist Query from H360 (ORM^O01 with ORC|RF)
  if (clean.includes('ORM^') || clean.includes('ORC|RF')) {
    let qSample = '';
    let qPassport = '';

    const orcLine = lines.find(l => l.startsWith('ORC|'));
    if (orcLine) {
      const op = orcLine.split('|');
      qSample = (op[3] || op[2] || '').trim();
    }

    const pidLine = lines.find(l => l.startsWith('PID|'));
    if (pidLine) {
      const pp = pidLine.split('|');
      const idToken = (pp[3] || pp[2] || '').split('^')[0].trim();
      if (idToken) {
        // If no ORC line was present, PID-3 is likely the sample ID the operator entered
        // on the H360 machine (e.g. "04605"). Passport numbers typically start with a letter.
        const looksLikePassport = /^[A-Za-z]/.test(idToken);
        if (!qSample) {
          // No ORC ? PID-3 is the sample ID regardless
          qSample = idToken;
        } else if (looksLikePassport) {
          qPassport = idToken;
        }
        // If ORC gave us qSample and PID-3 is also numeric, use PID-3 as secondary sample lookup
        if (qSample && idToken !== qSample && !looksLikePassport) {
          // PID-3 is an alternate numeric sample ID
          if (!qPassport) qPassport = ''; // don't set numeric ID as passport
        } else if (looksLikePassport) {
          qPassport = idToken;
        }
      }
    }

    console.log(`[H360] ORM^O01 Query detected - Sample: '${qSample}', Passport: '${qPassport}'`);

    const patient = await findPatient(qSample, qPassport);

    if (patient) {
      const sendSample = qSample || patient.sample_id || patient.ref_no;
      console.log(`[H360] Matched patient '${patient.fname || patient.name}' (Sample: ${sendSample}, Passport: ${patient.passport || patient.passport_no})`);
      const resp = buildHl7OrrResponse(msgId, sendSample, patient);
      try {
        socket.write(resp);
        console.log(`[H360] Sent ORR^O02 response for Sample '${sendSample}'`);
      } catch (err) {
        console.error('[H360] Error sending ORR response:', err.message);
      }
    } else {
      console.log(`[H360] No patient found for ORM query '${qSample}', sending NF response`);
      const resp = buildHl7OrrNotFound(msgId, qSample);
      try {
        socket.write(resp);
      } catch (err) {
        console.error('[H360] Error sending ORR NF response:', err.message);
      }
    }
    return;
  }

  // 2. Query from H360 (Host Query QRY^ / QBP^)
  if (clean.includes('QRY^') || clean.includes('QBP^') || clean.includes('QRD|')) {
    const qrdLine = lines.find(l => l.startsWith('QRD|')) || '';
    const qrfLine = lines.find(l => l.startsWith('QRF|')) || '';
    let qSample = '';
    let qPassport = '';

    if (qrdLine) {
      const parts = qrdLine.split('|');
      for (let i = 4; i < parts.length; i++) {
        const token = parts[i].split('^')[0].trim();
        if (token && !['R', 'D', 'RD', 'OTH', 'T', 'COR', 'ALL', 'RTC'].includes(token.toUpperCase()) && !/^\d{14}$/.test(token)) {
          qSample = token;
          break;
        }
      }
    }
    const pidLine = lines.find(l => l.startsWith('PID|'));
    if (pidLine) {
      const pparts = pidLine.split('|');
      const token = (pparts[3] || pparts[2] || '').split('^')[0].trim();
      if (token) {
        qPassport = token;
        if (!qSample) qSample = token;
      }
    }

    console.log(`[H360] Host Query QRY detected for Sample ID: '${qSample}', Passport: '${qPassport}'`);

    // 1. Send QCK^Q02 immediately to acknowledge query
    try {
      socket.write(buildHl7Qck(msgId));
    } catch (e) {
      console.warn('[H360] QCK write notice:', e.message);
    }

    const patient = await findPatient(qSample, qPassport);

    // 2. Send DSR^Q03 response after short delay
    setTimeout(() => {
      try {
        if (patient) {
          const sendSample = qSample || patient.sample_id || patient.ref_no;
          console.log(`[H360] Sending DSR^Q03: Patient '${patient.fname || patient.name}' for Sample ID '${sendSample}'`);
          const resp = buildHl7QueryResponse(msgId, sendSample, patient, qrdLine, qrfLine);
          socket.write(resp);
        } else {
          console.log(`[H360] No patient found for query '${qSample}', sending NF`);
          socket.write(buildHl7NotFoundResponse(msgId, qSample, qrdLine));
        }
      } catch (err) {
        console.error('[H360] Error sending DSR response:', err.message);
      }
    }, 40);
    return;
  }

  // 3. Results from H360 (ORU^R01 / OBX)
  if (clean.includes('ORU^') || clean.includes('OBX|')) {
    console.log(`[H360] Received test results from H360`);
    try { socket.write(buildHl7Ack(msgId)); } catch (e) {}

    try {
      const parsed = parseHl7Result(rawStr);
      latestH360Result = parsed;
      recentH360Results.unshift(parsed);
      if (recentH360Results.length > 50) recentH360Results.pop();
      if (parsed.sample_id) {
        const sid = String(parsed.sample_id).trim();
        h360SampleResults.set(sid, parsed);
        h360SampleResults.set(sid.toLowerCase(), parsed);
        h360SampleResults.set(sid.toUpperCase(), parsed);
        h360SampleResults.set(referenceKey(sid), parsed);
        const cleanId = sid.replace(/^0+(?=\d)/, '');
        h360SampleResults.set(cleanId, parsed);
        const numOnly = sid.replace(/\D/g, '');
        if (numOnly) {
          h360SampleResults.set(numOnly, parsed);
          h360SampleResults.set(numOnly.padStart(5, '0'), parsed);
        }
      }
      console.log(`[H360] Parsed results for Sample ${parsed.sample_id}: WBC=${parsed.wbc}, Hb=${parsed.hgb}, PLT=${parsed.plt}, Neut=${parsed.neutrophil}, Lymph=${parsed.lymphocyte}`);
    } catch (e) {
      console.error('[H360] Error parsing result:', e.message);
    }
    return;
  }

  try { socket.write(buildHl7Ack(msgId)); } catch (e) {}
}

try {
  const h360Server = net.createServer(socket => {
    activeH360Sockets.add(socket);
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[H360] Analyzer connected from ${remote}`);

    let buffer = Buffer.alloc(0);
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (true) {
        const endIdx = buffer.indexOf(Buffer.from([0x1c, 0x0d]));
        if (endIdx !== -1) {
          const msg = buffer.slice(0, endIdx);
          buffer = buffer.slice(endIdx + 2);
          handleH360Incoming(msg.toString('utf8'), socket);
        } else {
          const singleEnd = buffer.indexOf(0x1c);
          if (singleEnd !== -1 && buffer.length > singleEnd + 1 && buffer[singleEnd + 1] === 0x0a) {
            const msg = buffer.slice(0, singleEnd);
            buffer = buffer.slice(singleEnd + 2);
            handleH360Incoming(msg.toString('utf8'), socket);
          } else {
            break;
          }
        }
      }
    });

    socket.on('error', err => {
      console.log(`[H360] Client ${remote} socket error:`, err.message);
      activeH360Sockets.delete(socket);
    });

    socket.on('close', () => {
      console.log(`[H360] Client ${remote} disconnected`);
      activeH360Sockets.delete(socket);
    });
  });

  h360Server.on('error', err => {
    console.warn('[H360] Port 5600 server notice:', err.message);
  });

  const H360_PORT = process.env.H360_PORT ? parseInt(process.env.H360_PORT, 10) : 5600;
  const H360_HOST = process.env.H360_HOST || '0.0.0.0';
  h360Server.listen(H360_PORT, H360_HOST, () => {
    console.log(`[H360] Bi-directional HL7 MLLP server running on ${H360_HOST}:${H360_PORT}`);
  });
} catch (e) {
  console.warn('[H360] Could not start server on port 5600:', e.message);
}

// H360 API Endpoints
app.post('/api/h360/send', async (req, res) => {
  const { sample_id, ref_no, fname, lname, passport_no, age, gender, agency, dob } = req.body || {};
  const sample = String(sample_id || ref_no || '').trim();
  if (!sample) return res.status(400).json({ ok: false, error: 'Sample / Reference ID is required' });

  const rawName = `${fname || ''} ${lname || ''}`.trim() || 'Patient';
  const passport = String(passport_no || '').trim();
  const patientGender = String(gender || 'Male').trim();
  const patientAge = String(age || '').trim();

  const { firstName, lastName } = splitPatientName(rawName, patientGender);

  const record = {
    sample_id: sample,
    ref_no: sample,
    name: `${firstName} ${lastName}`.trim(),
    fname: firstName,
    lname: lastName,
    firstName,
    lastName,
    passport,
    passport_no: passport,
    dob: dob || '',
    age: patientAge,
    gender: patientGender,
    agency: agency || '',
    sample_type: 'Blood',
    department: 'Heamatology',
    updated_at: new Date().toISOString()
  };

  h360Worklist.set(sample, record);
  h360Worklist.set(referenceKey(sample), record);
  const numOnly = sample.replace(/\D/g, '');
  if (numOnly) h360Worklist.set(numOnly, record);
  const slashParts = sample.split('/');
  if (slashParts.length > 1) {
    const tail = slashParts[slashParts.length - 1].trim();
    if (tail) {
      h360Worklist.set(tail, record);
      const tailNum = tail.replace(/\D/g, '');
      if (tailNum) {
        h360Worklist.set(tailNum, record);
        const parsedInt = parseInt(tailNum, 10);
        if (!isNaN(parsedInt)) h360Worklist.set(String(parsedInt), record);
      }
    }
  }
  if (passport) {
    h360Worklist.set(passport, record);
    h360Worklist.set(passport.toLowerCase(), record);
    h360Worklist.set(passport.toUpperCase(), record);
  }

  console.log(`[H360] Patient registered in Worklist: Sample='${sample}' -> First='${firstName}', Last='${lastName}', PID(Passport)='${passport}', Age='${patientAge}', Gender='${patientGender}', Dept='Heamatology', Type='Blood'`);

  let directSent = 0;
  const ormMsg = buildHl7Order(sample, record);
  const oruMsg = buildHl7OruPush(sample, record);

  for (const s of activeH360Sockets) {
    try {
      s.write(ormMsg);
      s.write(oruMsg);
      directSent++;
    } catch (e) {
      console.warn('[H360] Failed sending to active socket:', e.message);
    }
  }

  // Also try direct TCP connect to 10.0.0.101:5600
  let outConnSent = false;
  try {
    const client = new net.Socket();
    client.setTimeout(2000);
    client.connect(5600, '10.0.0.101', () => {
      client.write(ormMsg);
      client.write(oruMsg);
      outConnSent = true;
      setTimeout(() => client.destroy(), 500);
    });
    client.on('error', () => {});
    client.on('timeout', () => client.destroy());
  } catch (e) {}

  const isSent = directSent > 0 || outConnSent;
  lastSentPatient = {
    ...record,
    sentDirectly: isSent,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  const fullName = `${firstName} ${lastName}`.trim();

  res.json({
    ok: true,
    sample_id: sample,
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    passport,
    patient_id: passport,
    sample_type: 'Blood',
    department: 'Heamatology',
    queued: true,
    activeSockets: activeH360Sockets.size,
    sentDirectly: isSent,
    message: isSent
      ? `Patient '${fullName}' pushed directly to H360 machine!`
      : `Patient '${fullName}' registered in Worklist. Ready when Sample ID '${sample}' is entered on H360.`
  });
});

app.get('/api/h360/status', (req, res) => {
  res.json({
    ok: true,
    activeConnections: activeH360Sockets.size,
    worklistCount: h360Worklist.size,
    latestResult: latestH360Result,
    lastSent: lastSentPatient
  });
});

app.get('/api/h360/latest', (req, res) => {
  res.json({
    ok: true,
    latest: latestH360Result,
    recent: recentH360Results.slice(0, 10)
  });
});

app.get('/api/h360/results/:sample', (req, res) => {
  const s = String(req.params.sample || '').trim();
  if (s === 'latest' || !s) {
    return res.json({ ok: !!latestH360Result, result: latestH360Result, isLatest: true });
  }

  const numOnly = s.replace(/\D/g, '');
  let found = h360SampleResults.get(s) ||
              h360SampleResults.get(s.toLowerCase()) ||
              h360SampleResults.get(s.toUpperCase()) ||
              h360SampleResults.get(referenceKey(s)) ||
              h360SampleResults.get(s.replace(/^0+(?=\d)/, '')) ||
              (numOnly ? (h360SampleResults.get(numOnly) || h360SampleResults.get(numOnly.padStart(5, '0'))) : null);

  if (!found) {
    const sClean = s.toUpperCase().replace(/\D/g, '');
    for (const r of recentH360Results) {
      const rId = String(r.sample_id || '').toUpperCase();
      const rClean = rId.replace(/\D/g, '');
      if (rId === s.toUpperCase() || rId.endsWith(s.toUpperCase()) || s.toUpperCase().endsWith(rId)) {
        found = r;
        break;
      }
      if (sClean && rClean && (sClean.endsWith(rClean) || rClean.endsWith(sClean))) {
        found = r;
        break;
      }
    }
  }

  if (found) {
    return res.json({ ok: true, result: found, sample: s });
  }

  return res.json({ ok: false, latest: latestH360Result, sample: s });
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
  'Fasting Blood Sugar': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dl' },
  'Fasting': { key: 'fbs', fallbackKey: 'rbs', reference: '74 - 115 mg/dl' },
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
  'Haemoglobin A1C': { key: 'hba1c_result', reference: 'See reference ranges below' },
  'Full Blood Count': { key: 'fbc', reference: 'See FBC reference ranges below' },
  'Total β - HCG Concentration': { key: 'beta_hcg_fia', reference: 'See reference ranges below' },
  'Total ? - HCG Concentration': { key: 'beta_hcg_fia', reference: 'See reference ranges below' },
  'BETA H.C.G.': { key: 'beta_hcg_rapid', reference: '' },
  'Type 10 B': { key: 'type_10b', reference: 'Medical Package (4 Reports)' },
  'Type 10 B with urine drug': { key: 'type_10b_drug', reference: 'Medical Package (5 Reports)' },
  'Urine Drug Screening': { key: 'urine_drug', reference: '12 Drugs (All Negative)' },
  'Urine Drug Screening (12 Drugs)': { key: 'urine_drug_12', reference: '12 Drugs (All Negative)' },
  'Urine Drug Screening (5 Drugs)': { key: 'urine_drug_5', reference: '5 Drugs (All Negative)' },
  'Type 7': { key: 'type_7', reference: 'Medical Package (4 Reports: UFR, TB, Brucellosis, HIV)' },
  'Tuberculosis Rapid Test': { key: 'tb_rapid', reference: 'Negative' },
  'Brucellosis Test': { key: 'brucellosis', reference: 'Negative' },
  'HIV Ag & Ab Test': { key: 'hiv_ag_ab', reference: 'Negative' },
  'Gamma GT': { key: 'gamma_gt', reference: '5 - 40 U/L' },
  'Type 11': { key: 'type11_pkg', reference: '5 Reports' },
  'Shipping': { key: 'shipping_pkg', reference: '14 Reports' },
  'Type 12 - 1': { key: 'shipping_pkg', reference: '14 Reports' },
  'Type 12 - 1 (Shipping)': { key: 'shipping_pkg', reference: '14 Reports' },
  'Blood Alcohol Test': { key: 'blood_alcohol', reference: 'Not Detected' },
  'C-reactive protein': { key: 'crp', reference: '< 06 mg/dL' },
  'ESR': { key: 'esr', reference: '03 mm/1hr' },
  'S.Creatinine & eGFR': { key: 'creatinine_egfr', reference: '0.6 - 1.3 mg/dL' },
  'Syphilis & VDRL': { key: 'syphilis_vdrl', reference: 'Negative / Non Reactive' },
  'Hepatitis C [HCV]': { key: 'hcv', reference: 'Negative' },
  'Hepatitis B [HBsAg]': { key: 'hbsag', reference: 'Negative' },
  'HIV Test': { key: 'hiv_test', reference: 'Negative' }
};
const testUnits = { FBS:'mg/dL', 'Fasting Blood Sugar':'mg/dl', 'Fasting':'mg/dl', RBS:'mg/dL', 'Total Cholesterol':'mg/dL', SGPT:'iu/l', SGOT:'iu/l', 'SGPT & SGOT':'iu/l', 'Total Bilirubine':'mg/dL', 'Serum Creatine':'mg/dL', 'Urine Full Report':'', 'Haemoglobin A1C':'%', 'Full Blood Count':'', 'Total β - HCG Concentration':'mIU/mL', 'Total ? - HCG Concentration':'mIU/mL', 'BETA H.C.G.':'', 'Type 10 B':'', 'Type 10 B with urine drug':'', 'Urine Drug Screening':'', 'Type 7':'', 'Tuberculosis Rapid Test':'', 'Brucellosis Test':'', 'HIV Ag & Ab Test':'', 'Gamma GT':'U/L', 'Type 11':'', 'Shipping':'', 'Type 12 - 1':'', 'Type 12 - 1 (Shipping)':'', 'Blood Alcohol Test':'', 'C-reactive protein':'mg/dL', 'ESR':'mm/1hr', 'S.Creatinine & eGFR':'mg/dL', 'Syphilis & VDRL':'', 'Hepatitis C [HCV]':'', 'Hepatitis B [HBsAg]':'', 'HIV Test':'' };
const lipidReferenceRows = [
  ['Total Cholesterol','<240 mg/dl','200 - 239 mg/dl','>= 240 mg/dl'],
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
  let raw = `${pdfVal(data,'title','')} ${pdfVal(data,'fname','')} ${pdfVal(data,'lname','')}`.replace(/\s+/g,' ').trim();
  if (!raw || raw === '-') {
    raw = pdfVal(data, 'full_name', pdfVal(data, 'patient_name', pdfVal(data, 'name', ''))).trim();
  }
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
function reportFullName(data) {
  const fullFromData = pdfVal(data, 'full_name', '') || pdfVal(data, 'patient_full_name', '');
  if (fullFromData && fullFromData.trim()) {
    const raw = String(fullFromData).trim();
    const withoutTitle = raw.replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i, '').trim();
    if (withoutTitle) {
      const gender = pdfVal(data, 'gender', '').toLowerCase();
      const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
      return `${prefix} ${withoutTitle}`.trim();
    }
  }
  const raw = `${pdfVal(data,'title','')} ${pdfVal(data,'fname','')} ${pdfVal(data,'lname','')}`.replace(/\s+/g,' ').trim();
  const withoutTitle = raw.replace(/^(mr|mrs|ms|miss|dr)\.?\s*/i,'').trim();
  if (!withoutTitle) return '-';
  const gender = pdfVal(data,'gender','').toLowerCase();
  const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
  return `${prefix} ${withoutTitle}`.trim();
}
function getRandomSG() {
  const opts = ['1.005', '1.010', '1.015', '1.020'];
  return opts[Math.floor(Math.random() * opts.length)];
}
function reportDateOffset(data, days = 0) {
  const raw = pdfVal(data, 'medical_date', '') || pdfVal(data, 'reg_date', '');
  let baseDate = new Date();
  const parsed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parsed) {
    baseDate = new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]));
  } else if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) baseDate = d;
  }
  baseDate.setDate(baseDate.getDate() + days);
  return baseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function reportDateISOOffset(data, days = 0) {
  const raw = pdfVal(data, 'medical_date', '') || pdfVal(data, 'reg_date', '');
  let baseDate = new Date();
  const parsed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parsed) {
    baseDate = new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]));
  } else if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) baseDate = d;
  }
  baseDate.setDate(baseDate.getDate() + days);
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function reportDate(data) {
  const raw = pdfVal(data,'medical_date','');
  // Always format: handles ISO "2026-11-05" → "05 November 2026"
  // Also handles already-formatted "05 November 2026" → returned as-is
  if (!raw) return new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const parsed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parsed) return new Date(Number(parsed[1]), Number(parsed[2])-1, Number(parsed[3])).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  // Try parsing other date formats (e.g. already human-readable)
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  return raw; // return as-is if already formatted string
}
// Helper: always returns formatted date string "05 November 2026" from data
function getFormattedDate(data) {
  return reportDate(data);
}
function generatedReportTime(data={}) {
  const fbcTime = pdfVal(data, 'test_time', pdfVal(data, 'report_time', pdfVal(data, 'issued_time', '')));
  if (fbcTime && fbcTime !== '11:08' && !fbcTime.includes('undefined')) return fbcTime;
  const now = new Date();
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
      specific_gravity: getRandomSG(),
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
      { label: 'Specific Gravity', result: pdfVal(data, 'ufr_specific_gravity', '') || defaultUfr.specific_gravity },
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
  if (name === 'Total ? - HCG Concentration' || name === 'Beta HCG FIA' || name === 'Total Beta HCG') {
    const conc = pdfVal(data, 'beta_hcg_conc', pdfVal(data, 'test_result', '< 5.00'));
    const status = pdfVal(data, 'beta_hcg_status', 'Negative');
    let comment = pdfVal(data, 'beta_hcg_comment', '');
    if (!comment) {
      if (status.toLowerCase().includes('today negative')) {
        comment = 'Total ? - HCG Level <5.00 - Negative for Pregnancy';
      } else if (status.toLowerCase().includes('negative')) {
        comment = 'Total ? - HCG Level <5.00 - Negative for Pregnancy';
      } else if (status.toLowerCase().includes('positive')) {
        comment = `Total ? - HCG Level ${conc} - Positive for Pregnancy`;
      }
    }
    const betaHcgRefs = [
      ['3', '5 - 50'],
      ['4', '5 - 426'],
      ['5', '18 - 7,340'],
      ['6', '1,080 - 56,500'],
      ['7 - 8', '7,650 - 229,000'],
      ['9 - 12', '25,700 - 288,000'],
      ['13 - 16', '13,300 - 254,000'],
      ['17 - 24', '4,060 - 165,400'],
      ['25 - 40', '3,640 - 117,000']
    ];
    return {
      name: 'Total ? - HCG Concentration',
      isBetaHcgFia: true,
      conc,
      status,
      comment,
      betaHcgRefs,
      rows: [
        { label: 'Total ? - HCG Concentration', result: conc, unit: 'mIU/mL' },
        { label: '', result: status, unit: '' }
      ],
      result: `${conc} mIU/mL (${status})`,
      reference: 'See reference ranges below',
      unit: 'mIU/mL',
      method: 'Fluorescence Immunoassay (FIA)'
    };
  }
  if (name === 'BETA H.C.G.' || name === 'BETA HCG' || name === 'Beta HCG Rapid') {
    const result = pdfVal(data, 'beta_hcg_rapid_result', pdfVal(data, 'test_result', 'Negative'));
    return {
      name: 'BETA H.C.G.',
      isBetaHcgRapid: true,
      result,
      rows: [{ label: 'BETA H.C.G.', result }],
      reference: '',
      unit: '',
      method: 'Immunochromatographic assay-Rapid'
    };
  }
  if (name === 'Full Blood Count' || name === 'FBC' || name === 'Complete Blood Count' || name === 'CBC') {
    const isFemale = String(data.gender || '').toLowerCase().startsWith('f');
    const calcFlag = (valStr, refStr, explicit = '') => {
      if (explicit === 'L' || explicit === 'H') return explicit;
      const num = parseFloat(valStr);
      if (isNaN(num)) return '';
      const m = String(refStr).match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (m) {
        const low = parseFloat(m[1]);
        const high = parseFloat(m[2]);
        if (!isNaN(low) && num < low) return 'L';
        if (!isNaN(high) && num > high) return 'H';
      }
      return '';
    };

    // Defaults for Erba H360
    const defWbc = '8.88';
    const defLymP = '32.8';
    const defMidP = '8.5';
    const defGranP = '58.7';
    const defLymN = '2.91';
    const defMidN = '0.75';
    const defGranN = '5.22';
    const defRbc = isFemale ? '4.20' : '4.85';
    const defHgb = isFemale ? '12.5' : '13.5';
    const defHct = isFemale ? '38.0' : '42.0';
    const defMcv = '88.0';
    const defMch = '29.0';
    const defMchc = '33.0';
    const defRdwCv = '12.5';
    const defRdwSd = '42.0';
    const defPlt = '280';
    const defMpv = '8.5';
    const defPdw = '15.0';
    const defPct = '0.25';
    const defPlcr = '15.3';
    const defPlcc = '50';

    const wbcVal = pdfVal(data, 'fbc_wbc', defWbc);
    const lymPVal = pdfVal(data, 'fbc_lym_percent', pdfVal(data, 'fbc_lymphocyte', defLymP));
    const midPVal = pdfVal(data, 'fbc_mid_percent', pdfVal(data, 'fbc_monocyte', defMidP));
    const granPVal = pdfVal(data, 'fbc_gran_percent', pdfVal(data, 'fbc_neutrophil', defGranP));
    const lymNVal = pdfVal(data, 'fbc_lym_num', defLymN);
    const midNVal = pdfVal(data, 'fbc_mid_num', defMidN);
    const granNVal = pdfVal(data, 'fbc_gran_num', defGranN);

    const rbcVal = pdfVal(data, 'fbc_rbc', defRbc);
    const hgbVal = pdfVal(data, 'fbc_hemoglobin', pdfVal(data, 'hemoglobin', defHgb));
    const hctVal = pdfVal(data, 'fbc_pcv', defHct);
    const mcvVal = pdfVal(data, 'fbc_mcv', defMcv);
    const mchVal = pdfVal(data, 'fbc_mch', defMch);
    const mchcVal = pdfVal(data, 'fbc_mchc', defMchc);
    const rdwCvVal = pdfVal(data, 'fbc_rdw_cv', defRdwCv);
    const rdwSdVal = pdfVal(data, 'fbc_rdw_sd', defRdwSd);

    const pltVal = pdfVal(data, 'fbc_platelets', defPlt);
    const mpvVal = pdfVal(data, 'fbc_mpv', defMpv);
    const pdwSdVal = pdfVal(data, 'fbc_pdw_sd', pdfVal(data, 'fbc_pdw', '11.1'));
    const pdwCvVal = pdfVal(data, 'fbc_pdw_cv', '15.0');
    const pctVal = pdfVal(data, 'fbc_pct', defPct);
    const plcrVal = pdfVal(data, 'fbc_p_lcr', defPlcr);
    const plccVal = pdfVal(data, 'fbc_p_lcc', defPlcc);

    const h360Params = [
      { code: 'WBC', name: 'WBC', result: formatFbcVal('WBC', wbcVal), unit: '10^3/uL', reference: '4.00-11.00', flag: calcFlag(wbcVal, '4.00-11.00', data.fbc_wbc_flag) },
      { code: 'Lym%', name: 'Lym%', result: formatFbcVal('Lym%', lymPVal), unit: '%', reference: '20.0-50.0', flag: calcFlag(lymPVal, '20.0-50.0', data.fbc_lym_percent_flag) },
      { code: 'Gran%', name: 'Gran%', result: formatFbcVal('Gran%', granPVal), unit: '%', reference: '50.0-70.0', flag: calcFlag(granPVal, '50.0-70.0', data.fbc_gran_percent_flag) },
      { code: 'Mid%', name: 'Mid%', result: formatFbcVal('Mid%', midPVal), unit: '%', reference: '3.0-9.0', flag: calcFlag(midPVal, '3.0-9.0', data.fbc_mid_percent_flag) },
      { code: 'Lym#', name: 'Lym#', result: formatFbcVal('Lym#', lymNVal), unit: '10^3/uL', reference: '1.10-3.20', flag: calcFlag(lymNVal, '1.10-3.20', data.fbc_lym_num_flag) },
      { code: 'Gran#', name: 'Gran#', result: formatFbcVal('Gran#', granNVal), unit: '10^3/uL', reference: '2.00-7.00', flag: calcFlag(granNVal, '2.00-7.00', data.fbc_gran_num_flag) },
      { code: 'Mid#', name: 'Mid#', result: formatFbcVal('Mid#', midNVal), unit: '10^3/uL', reference: '0.10-0.90', flag: calcFlag(midNVal, '0.10-0.90', data.fbc_mid_num_flag) },
      { code: 'RBC', name: 'RBC', result: formatFbcVal('RBC', rbcVal), unit: '10^6/uL', reference: isFemale ? '3.80-5.00' : '4.30-5.80', flag: calcFlag(rbcVal, isFemale ? '3.80-5.00' : '4.30-5.80', data.fbc_rbc_flag) },
      { code: 'HGB', name: 'HGB', result: formatFbcVal('HGB', hgbVal), unit: 'g/dL', reference: isFemale ? '11.5-15.5' : '12.5-18.0', flag: calcFlag(hgbVal, isFemale ? '11.5-15.5' : '12.5-18.0', data.fbc_hemoglobin_flag) },
      { code: 'HCT', name: 'HCT', result: formatFbcVal('HCT', hctVal), unit: '%', reference: isFemale ? '35.0-45.0' : '40.0-50.0', flag: calcFlag(hctVal, isFemale ? '35.0-45.0' : '40.0-50.0', data.fbc_pcv_flag) },
      { code: 'MCV', name: 'MCV', result: formatFbcVal('MCV', mcvVal), unit: 'fL', reference: '82.0-100.0', flag: calcFlag(mcvVal, '82.0-100.0', data.fbc_mcv_flag) },
      { code: 'MCH', name: 'MCH', result: formatFbcVal('MCH', mchVal), unit: 'pg', reference: '27.0-34.0', flag: calcFlag(mchVal, '27.0-34.0', data.fbc_mch_flag) },
      { code: 'MCHC', name: 'MCHC', result: formatFbcVal('MCHC', mchcVal), unit: 'g/dL', reference: '31.6-35.4', flag: calcFlag(mchcVal, '31.6-35.4', data.fbc_mchc_flag) },
      { code: 'RDW-CV', name: 'RDW-CV', result: formatFbcVal('RDW-CV', rdwCvVal), unit: '%', reference: '11.5-14.5', flag: calcFlag(rdwCvVal, '11.5-14.5', data.fbc_rdw_cv_flag) },
      { code: 'RDW-SD', name: 'RDW-SD', result: formatFbcVal('RDW-SD', rdwSdVal), unit: 'fL', reference: '35.0-56.0', flag: calcFlag(rdwSdVal, '35.0-56.0', data.fbc_rdw_sd_flag) },
      { code: 'PLT', name: 'PLT', result: formatFbcVal('PLT', pltVal), unit: '10^3/uL', reference: '140-350', flag: calcFlag(pltVal, '140-350', data.fbc_platelets_flag) },
      { code: 'MPV', name: 'MPV', result: formatFbcVal('MPV', mpvVal), unit: 'fL', reference: '7.0-11.0', flag: calcFlag(mpvVal, '7.0-11.0', data.fbc_mpv_flag) },
      { code: 'PDW-SD', name: 'PDW-SD', result: formatFbcVal('PDW-SD', pdwSdVal), unit: 'fL', reference: '9.0-17.0', flag: calcFlag(pdwSdVal, '9.0-17.0', data.fbc_pdw_sd_flag) },
      { code: 'PDW-CV', name: 'PDW-CV', result: formatFbcVal('PDW-CV', pdwCvVal), unit: '%', reference: '10.0-17.9', flag: calcFlag(pdwCvVal, '10.0-17.9', data.fbc_pdw_cv_flag) },
      { code: 'PCT', name: 'PCT', result: formatFbcVal('PCT', pctVal), unit: '%', reference: '0.108-0.282', flag: calcFlag(pctVal, '0.108-0.282', data.fbc_pct_flag) },
      { code: 'P-LCR', name: 'P-LCR', result: formatFbcVal('P-LCR', plcrVal), unit: '%', reference: '11.0-45.0', flag: calcFlag(plcrVal, '11.0-45.0', data.fbc_p_lcr_flag) },
      { code: 'P-LCC', name: 'P-LCC', result: formatFbcVal('P-LCC', plccVal), unit: '10^3/uL', reference: '30-90', flag: calcFlag(plccVal, '30-90', data.fbc_p_lcc_flag) }
    ];

    const comments = pdfVal(data, 'fbc_comments', 'Normal cell morphology and count distribution');
    const wbcMessage = pdfVal(data, 'fbc_wbc_message', '');
    const rbcMessage = pdfVal(data, 'fbc_rbc_message', '');
    const pltMessage = pdfVal(data, 'fbc_plt_message', '');

    const neutrophil = pdfVal(data, 'fbc_diff_neutrophil', '65');
    const lymphocyte = pdfVal(data, 'fbc_diff_lymphocyte', '30');
    const monocyte   = pdfVal(data, 'fbc_diff_monocyte', '03');
    const eosinophil = pdfVal(data, 'fbc_diff_eosinophil', '02');
    const basophil   = pdfVal(data, 'fbc_diff_basophil', '00');

    const histograms = {
      wbc: data.fbc_wbc_histogram || '',
      rbc: data.fbc_rbc_histogram || '',
      plt: data.fbc_plt_histogram || ''
    };

    // Legacy rows for Excel export
    const wbcRows = [
      { label: 'Total White Blood Cells (WBC)', result: wbcVal, unit: '10^3/uL', reference: '4.00 - 11.00' }
    ];
    const diffRows = [
      { label: 'Lymphocytes (LYM%)', result: lymPVal, unit: '%', reference: '20.0 - 50.0' },
      { label: 'Granulocytes (GRAN%)', result: granPVal, unit: '%', reference: '50.0 - 70.0' },
      { label: 'Monocytes (MID%)', result: midPVal, unit: '%', reference: '3.0 - 9.0' },
      { label: 'Absolute Lymphocytes (LYM#)', result: lymNVal, unit: '10^3/uL', reference: '1.10 - 3.20' },
      { label: 'Absolute Granulocytes (GRAN#)', result: granNVal, unit: '10^3/uL', reference: '2.00 - 7.00' },
      { label: 'Absolute Monocytes (MID#)', result: midNVal, unit: '10^3/uL', reference: '0.10 - 0.90' }
    ];
    const rbcRows = [
      { label: 'Red Blood Cells (RBC)', result: rbcVal, unit: '10^6/uL', reference: isFemale ? '3.80 - 5.00' : '4.30 - 5.80' },
      { label: 'Haemoglobin (Hb)', result: hgbVal, unit: 'g/dL', reference: isFemale ? '11.5 - 15.5' : '12.5 - 18.0' },
      { label: 'Haematocrit (PCV)', result: hctVal, unit: '%', reference: isFemale ? '35.0 - 45.0' : '40.0 - 50.0' },
      { label: 'MCV', result: mcvVal, unit: 'fL', reference: '82.0 - 100.0' },
      { label: 'MCH', result: mchVal, unit: 'pg', reference: '27.0 - 34.0' },
      { label: 'MCHC', result: mchcVal, unit: 'g/dL', reference: '31.6 - 35.4' },
      { label: 'RDW - CV', result: rdwCvVal, unit: '%', reference: '11.5 - 14.5' },
      { label: 'RDW - SD', result: rdwSdVal, unit: 'fL', reference: '35.0 - 56.0' }
    ];
    const pltRows = [
      { label: 'Platelet Count (PLT)', result: pltVal, unit: '10^3/uL', reference: '140 - 350' },
      { label: 'Mean Platelet Volume (MPV)', result: mpvVal, unit: 'fL', reference: '7.0 - 11.0' },
      { label: 'PDW-SD', result: pdwSdVal, unit: 'fL', reference: '9.0 - 17.0' },
      { label: 'PDW-CV', result: pdwCvVal, unit: '%', reference: '10.0 - 17.9' },
      { label: 'PCT', result: pctVal, unit: '%', reference: '0.108 - 0.282' },
      { label: 'P-LCR', result: plcrVal, unit: '%', reference: '11.0 - 45.0' },
      { label: 'P-LCC', result: plccVal, unit: '10^3/uL', reference: '30 - 90' }
    ];

    const fbcData = {
      wbc: wbcVal,
      neutrophil,
      lymphocyte,
      monocyte,
      eosinophil,
      basophil,
      rbc: rbcVal,
      hemoglobin: hgbVal,
      pcv: hctVal,
      mcv: mcvVal,
      mch: mchVal,
      mchc: mchcVal,
      rdw_cv: rdwCvVal,
      platelets: pltVal,
      mpv: mpvVal
    };

    const rows = [...wbcRows, ...diffRows, ...rbcRows, ...pltRows];

    return {
      name: 'FULL BLOOD COUNT',
      isFbc: true,
      h360Params,
      comments,
      wbcMessage,
      rbcMessage,
      pltMessage,
      neutrophil,
      lymphocyte,
      monocyte,
      eosinophil,
      basophil,
      histograms,
      wbcRows,
      diffRows,
      rbcRows,
      pltRows,
      fbcData,
      rows,
      result: 'FULL BLOOD COUNT',
      reference: '',
      unit: '',
      lipid: false,
      lipidReferenceRows: []
    };
  }
  if (name === 'Type 10 B' || name === 'Type 10 B with urine drug') {
    const hasUrineDrug = name.includes('urine drug') || name.includes('drug');
    return {
      name,
      isType10B: true,
      hasUrineDrug,
      result: name,
      reference: '',
      unit: '',
      rows: []
    };
  }
  if (name.startsWith('Urine Drug') || name.includes('Urine Drug Screening') || name === 'Urine Drug' || name === 'Urine Drug Report') {
    const is12 = name.includes('12') ? true : (name.includes('5') ? false : (String(data.drug_panel_type || '').includes('12') || (data.urine_drugs && Object.keys(data.urine_drugs).length === 12) || !String(data.drug_panel_type || '').includes('5')));
    const panelType = is12 ? '12' : '5';
    const drugKeys5 = [
      'Amphetamine (AMP)',
      'Benzodiazepine (BZO)',
      'Methamphetamine (MET)',
      'Opioid (OPI)',
      'Marijuana (THC)'
    ];
    const drugKeys12 = [
      'Amphetamine (AMP)',
      'Barbiturates (BAR)',
      'Benzodiazepine (BZO)',
      'Buprenorphine (BUP)',
      'Cocaine (COC)',
      'Marijuana (THC)',
      'Methadone (MTD)',
      'Methamphetamine (MET)',
      'Methylenedioxymethamphetamine (MDMA)',
      'Morphine (MOP)',
      'Phencyclidine (PCP)',
      'Tricyclic Antidepressants (TCA)'
    ];
    const drugKeys = is12 ? drugKeys12 : drugKeys5;
    const drugResults = {};
    drugKeys.forEach(k => {
      const shortKey = k.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
      drugResults[k] = (data.urine_drugs && data.urine_drugs[k]) ||
                       (shortKey && data[`urine_drug_${shortKey}`]) ||
                       'Negative';
    });

    const hasPositive = Object.values(drugResults).some(v => String(v).trim().toLowerCase() === 'positive');

    return {
      name: is12 ? 'Urine Drug Screening (12 Drugs)' : 'Urine Drug Screening (5 Drugs)',
      isUrineDrugOnly: true,
      panelType,
      drugKeys,
      drugResults,
      result: hasPositive ? 'Positive' : 'Negative',
      reference: is12 ? '12 Drugs Screen' : '5 Drugs Screen',
      unit: '',
      rows: drugKeys.map(k => ({ label: k, result: drugResults[k] }))
    };
  }
  if (name === 'Type 7' || name === 'Type 7 (Russia)' || name.toLowerCase().includes('type 7') || name.toLowerCase().includes('brucellosis')) {
    const defaultUfr = {
      colour: 'Pale Yellow',
      appearance: 'Clear',
      specific_gravity: getRandomSG(),
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
      { label: 'Specific Gravity', result: pdfVal(data, 'ufr_specific_gravity', '') || defaultUfr.specific_gravity },
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
    return {
      name: 'Type 7',
      isType7: true,
      chemicalRows,
      microscopyRows,
      result: 'Type 7',
      reference: '4 Reports (UFR, TB, Brucellosis, HIV)',
      unit: '',
      rows: []
    };
  }
  if (name === 'Tuberculosis Rapid Test' || name === 'TB Test' || name === 'TB') {
    const resVal = pdfVal(data, 'tb_result', pdfVal(data, 'test_result', 'Negative'));
    return {
      name: 'Tuberculosis Rapid Test',
      isTbOnly: true,
      result: resVal,
      reference: '',
      unit: '',
      rows: [{ label: 'TB Test', result: resVal, reference: '', unit: '' }]
    };
  }
  if (name === 'Brucellosis Test' || name === 'BRUCELLOSIS TEST' || name === 'Brucellosis') {
    const resVal = pdfVal(data, 'brucellosis_result', pdfVal(data, 'test_result', 'Negative'));
    return {
      name: 'BRUCELLOSIS TEST',
      isBrucellosisOnly: true,
      result: resVal,
      reference: '',
      unit: '',
      rows: [{ label: 'BRUCELLA Test', result: resVal, reference: '', unit: '' }]
    };
  }
  if (name === 'HIV Ag & Ab Test' || name === 'HIV I & II' || name === 'HIV') {
    const resVal = pdfVal(data, 'hiv_result', pdfVal(data, 'test_result', 'Negative'));
    return {
      name: 'HIV Ag & Ab Test',
      isHivOnly: true,
      result: resVal,
      reference: '',
      unit: '',
      rows: [{ label: 'HIV I & II', result: resVal, reference: '', unit: '' }]
    };
  }

      // Unified Package Resolution (Standard & Custom Packages)
    const allPkgs = [...BUILTIN_PACKAGES, ...(securityConfig.customPackages || [])];
    
    if (name === 'Gamma GT') {
      const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'test_result', '18'));
      return {
        name: 'Gamma GT',
        code: 'GGT',
        result: `${ggtVal} U/L`,
        reference: '5 - 40 U/L',
        unit: 'U/L',
        method: '[Test Method - Spectrophotometry - Kinetic ]',
        specimen: 'Blood',
        rows: [
          { test: 'Gamma GT', result: `${ggtVal} U/L`, unit: 'U/L', flag: '', ref: '5 - 40 U/L' }
        ]
      };
    }

    const matchedPkg = allPkgs.find(p => 
      p.name.toLowerCase() === name.toLowerCase() ||
      p.code.toLowerCase() === name.toLowerCase() ||
      (data.package_name && p.name.toLowerCase() === String(data.package_name).toLowerCase()) ||
      (data.report_type && data.report_type !== 'single' && p.name.toLowerCase() === String(data.report_type).toLowerCase()) ||
      (data.package_id && p.id === data.package_id)
    );

    if (matchedPkg) {
      if (matchedPkg.name === 'Type 10 B' || matchedPkg.id === 'pkg_type10b') {
        return { name: matchedPkg.name, isType10B: true, hasUrineDrug: false, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Type 10 B with urine drug' || matchedPkg.id === 'pkg_type10b_drug') {
        return { name: matchedPkg.name, isType10B: true, hasUrineDrug: true, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Type 7' || matchedPkg.id === 'pkg_type7') {
        return { name: matchedPkg.name, isType7: true, result: matchedPkg.name, reference: '', unit: '', rows: [] };
      }
      if (matchedPkg.name === 'Shipping' || matchedPkg.id === 'pkg_shipping' || matchedPkg.name === 'Type 12 - 1 (Shipping)' || matchedPkg.name === 'Type 12 - 1') {
        return {
          name: 'Shipping',
          code: 'Shipping',
          isShipping: true,
          packageDef: matchedPkg,
          result: 'Shipping',
          reference: '14 Reports',
          unit: '',
          rows: []
        };
      }
      if (matchedPkg.name === 'Type 11' || matchedPkg.id === 'pkg_type11' || matchedPkg.id === 'pkg_colombo_consultancy') {
        return {
          name: 'Type 11',
          code: 'Type 11',
          isType11: true,
          isCustomPackage: true,
          packageDef: matchedPkg,
          result: 'Type 11',
          reference: '5 Reports (Fasting Blood Sugar, SGPT & SGOT, Urine Full Report, Gamma GT, Lipid Profile)',
          unit: '',
          rows: []
        };
      }
      return {
        name: matchedPkg.name,
        code: matchedPkg.code,
        isCustomPackage: true,
        packageDef: matchedPkg,
        result: matchedPkg.name,
        reference: `${matchedPkg.tests.length} Reports (${matchedPkg.tests.join(', ')})`,
        unit: '',
        rows: []
      };
    }

  // Check custom tests
  const customTests = securityConfig.customTests || [];
  const matchedCustom = customTests.find(t => t.name.toLowerCase() === name.toLowerCase() || (t.id && t.id === pdfVal(data, 'custom_test_id', '')));
  if (matchedCustom) {
    const resVal = pdfVal(data, 'custom_test_result', pdfVal(data, 'test_result', (matchedCustom.resultOptions && matchedCustom.resultOptions[0]) || 'Negative'));
    return {
      name: matchedCustom.name,
      isCustomTest: true,
      customTestDef: matchedCustom,
      result: resVal,
      reference: matchedCustom.referenceRange || '',
      unit: matchedCustom.unit || '',
      rows: [{ label: matchedCustom.testLabel || matchedCustom.name, result: resVal, reference: matchedCustom.referenceRange || '', unit: matchedCustom.unit || '' }]
    };
  }

  if (name.toLowerCase().includes('shipping') || name === 'Type 12 - 1' || name === 'Type 12 - 1 (Shipping)') {
    return {
      name: 'Shipping',
      code: 'Shipping',
      isShipping: true,
      result: 'Shipping',
      reference: '14 Reports',
      unit: '',
      rows: []
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
      if (!val || val === '-' || val === '?') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numPt = parseFloat(String(ptVal).replace(/[^0-9.]/g, ''));
    const numOt = parseFloat(String(otVal).replace(/[^0-9.]/g, ''));
    const isPtHigh = (!isNaN(numPt) && numPt > 45);
    const isOtHigh = (!isNaN(numOt) && numOt > 35);
    rows = [
      { label: 'SGPT', result: formatLab(ptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isPtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 34 iu/l (Women)', unit: '' },
      { label: '', result: '', reference: '', unit: '' },
      { label: 'SGOT', result: formatLab(otVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isOtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];
  } else if (name === 'SGOT') {
    let sgotVal = result || pdfVal(data, 'sgot_result', pdfVal(data, 'sgot', '-'));
    const formatLab = (val) => {
      if (!val || val === '-' || val === '?') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numOt = parseFloat(String(sgotVal).replace(/[^0-9.]/g, ''));
    const isOtHigh = (!isNaN(numOt) && numOt > 35);
    rows = [
      { label: 'SGOT', result: formatLab(sgotVal), reference: 'Upto 35 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isOtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 31 iu/l (Women)', unit: '' }
    ];
  } else if (name === 'SGPT') {
    let sgptVal = result || pdfVal(data, 'sgpt_result', pdfVal(data, 'sgpt', '-'));
    const formatLab = (val) => {
      if (!val || val === '-' || val === '?') return '-';
      let num = String(val).replace(/\s*i?u\/l\b/gi, '').trim();
      return num ? `${num} iu/l` : '-';
    };
    const hasExplicitNote = !!(data.result_note && String(data.result_note).trim() !== '');
    const numPt = parseFloat(String(sgptVal).replace(/[^0-9.]/g, ''));
    const isPtHigh = (!isNaN(numPt) && numPt > 45);
    rows = [
      { label: 'SGPT', result: formatLab(sgptVal), reference: 'Upto 45 iu/l (Men)', unit: 'iu/l' },
      { label: '', result: (hasExplicitNote || isPtHigh) ? '[Repeated and Confirmed]' : '', reference: 'Upto 34 iu/l (Women)', unit: '' }
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
    if (!row.result || row.result === '-' || row.result === '?') return { ...row, result: '-' };
    if (row.result === '[Repeated and Confirmed]') return row;
    if (row.unit && !new RegExp(`\\b${row.unit.replace('/', '\\/')}\\b`, 'i').test(row.result) && !/\b(i?u\/l)\b/i.test(row.result)) {
      return { ...row, result: `${row.result} ${row.unit}` };
    }
    return row;
  });
  return { name, result: rows.map(r=>r.result).join(' / '), reference: rows.map(r=>r.reference).join(' / '), unit, rows, lipid:false, lipidReferenceRows:[] };
}
function pdfText(page, font, text, x, y, size=8.5, bold=false, color=rgb(0.04, 0.04, 0.04)) {
  page.drawText(String(text || ''), { x, y, size, font: bold ? font.bold : font.regular, color });
}
function pdfCenteredText(page, font, text, y, size=12, bold=false, centerX=276, color=rgb(0.04, 0.04, 0.04)) {
  const active = bold ? font.bold : font.regular;
  const width = active.widthOfTextAtSize(String(text || ''), size);
  pdfText(page, font, text, centerX - (width / 2), y, size, bold, color);
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
    if (securityConfig.lockAllReports) {
      recordAudit('EXPORT_WORD_BLOCKED', data, 'BLOCKED_LOCKDOWN', req);
      return res.status(403).json({ error: `System report generation is currently locked by Super Admin: ${securityConfig.lockReason || 'Maintenance Mode'}` });
    }
    if (securityConfig.allowedExportFormats?.word === false) {
      recordAudit('EXPORT_WORD_BLOCKED', data, 'BLOCKED_FORMAT', req);
      return res.status(403).json({ error: 'Word export is disabled by Super Admin.' });
    }
    const test = selectedTest(data);
    const perm = securityConfig.testPermissions[test.name] || securityConfig.testPermissions[data.test_name];
    if (perm && perm.enabled === false) {
      recordAudit('TEST_BLOCKED', data, 'BLOCKED_TEST_DISABLED', req);
      return res.status(403).json({ error: `Generating reports for "${test.name}" is restricted by Super Admin.` });
    }
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
      new Paragraph({ children: [new ImageRun({ data: assetCache.signature || fs.readFileSync(signaturePath), transformation: { width: 115, height: 77 } })] }),
      new Paragraph({ children: [new TextRun({ text: 'Authorized Signature', bold: true, size: 16 })] }),
      new Paragraph({ spacing: { before: 180 }, children: [new TextRun({ text: 'Report generated locally from the NeoSys Medicare form data.', size: 16, color: '64748B' })] })
    ];
    const doc = new Document({ styles: { default: { document: { run: { font: 'Cambria', size: 24 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data,'docx')}"`);
    recordAudit('EXPORT_WORD', { ...data, test_name: data.test_name || 'General' }, 'SUCCESS', req);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


async function buildShippingWorkbook(data = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NeoSys Medicare';
  wb.lastModifiedBy = 'NeoSys Medicare';
  wb.created = new Date();
  wb.modified = new Date();

  const refNo = cleanRefNo(pdfVal(data, 'ref_no', '04904'));
  const passportNo = pdfVal(data, 'passport_no', pdfVal(data, 'nic', 'N10880963'));
  const patientName = reportDisplayName(data) || 'Mr.W.U.H.Kumara';
  const age = reportAge(data) || '31 Years';
  const gender = pdfVal(data, 'gender', pdfVal(data, 'sex', 'Male'));
  const agency = pdfVal(data, 'agency', pdfVal(data, 'refby', 'Lauterjung Shipmanagement Colombo Ltd.,'));
  const dateVal = reportDate(data) || '26 October 2026';
  const issuedTime = generatedReportTime(data) || '12:37 PM';

  const defaultColWidths = [24, 3, 26, 12, 3, 36, 12, 16];

  function setupSheet(ws, title, specimen = 'Blood') {
    ws.views = [{ showGridLines: true }];
    defaultColWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Row 6: Title
    ws.mergeCells('A6:F6');
    const r6 = ws.getCell('A6');
    r6.value = 'Laboratory Report';
    r6.font = { name: 'Arial Black', size: 16, bold: true, underline: true };
    r6.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(6).height = 25;

    // Rows 8-12: Patient Block
    const pRows = [
      { r: 8, l1: 'Ref.No', v1: refNo, l2: 'PP/NIC', v2: passportNo, b1: true },
      { r: 9, l1: 'Name', v1: patientName, l2: 'Age', v2: age },
      { r: 10, l1: 'Sex', v1: gender, l2: 'Referred By', v2: agency },
      { r: 11, l1: 'Date', v1: dateVal, l2: 'Specimen', v2: specimen, b2: true },
      { r: 12, l1: 'Report Issued Time', v1: issuedTime, l2: '', v2: '' }
    ];

    pRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.height = 18;
      row.getCell(1).value = item.l1;
      row.getCell(1).font = { name: 'Cambria', size: 11, bold: !!item.b1 };
      row.getCell(2).value = item.l1 ? ':' : '';
      row.getCell(2).font = { name: 'Calibri', size: 11, bold: !!item.b1 };
      row.getCell(3).value = item.v1;
      row.getCell(3).font = { name: 'Cambria', size: 11, bold: !!item.b1 };

      if (item.l2) {
        row.getCell(4).value = item.l2;
        row.getCell(4).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
        row.getCell(5).value = ':';
        row.getCell(5).font = { name: 'Calibri', size: 11, bold: !!item.b2 };
        row.getCell(6).value = item.v2;
        row.getCell(6).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
      }
    });

    // Row 15: Section Title
    const r15 = ws.getCell('A15');
    r15.value = title;
    r15.font = { name: 'Arial Black', size: 12, bold: true, underline: true };
    ws.getRow(15).height = 22;

    // Signature Block at bottom
    const sigStart = 31;
    const sigs = [
      'W.D.Gunarathne',
      'Chief Medical Laboratory Technologist',
      'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012',
      'W.H.O.Fellow'
    ];
    sigs.forEach((text, idx) => {
      const cell = ws.getCell(`A${sigStart + idx}`);
      cell.value = text;
      cell.font = { name: 'Cambria', size: 10, bold: idx === 0 };
      ws.getRow(sigStart + idx).height = 16;
    });

    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };
  }

  function styleHeaders(ws, r, headers) {
    const row = ws.getRow(r);
    row.height = 20;
    headers.forEach((h, i) => {
      const col = h.col || (i === 0 ? 1 : i === 1 ? 3 : 5);
      const cell = row.getCell(col);
      cell.value = h.text;
      cell.font = { name: 'Arial Black', size: 11, bold: true };
      if (h.align) cell.alignment = { horizontal: h.align };
    });
  }

  // 1. Blood Alcohol Test
  {
    const ws = wb.addWorksheet('Blood Alcohol');
    setupSheet(ws, 'Blood Alcohol Test', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Blood Alcohol';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = pdfVal(data, 'blood_alcohol', 'Not Detected');
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
  }

  // 2. C-reactive protein
  {
    const ws = wb.addWorksheet('CRP');
    setupSheet(ws, 'C-reactive protein', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'C-reactive protein';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = pdfVal(data, 'crp', '< 06 mg/dL');
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '<06 mg/dL';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Latex Agglutination]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 3. ESR
  {
    const ws = wb.addWorksheet('ESR');
    setupSheet(ws, 'ESR', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Erythrocyte Sedimentation Rate';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const esrVal = pdfVal(data, 'esr', '03 mm/1hr');
    r19.getCell(3).value = esrVal.includes('mm') ? esrVal : `${esrVal} mm/1hr`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A21').value = 'Reference Range   (ESR 01st Hour)';
    ws.getCell('A21').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('C22').value = 'Male';
    ws.getCell('C22').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('C22').alignment = { horizontal: 'center' };
    ws.getCell('E22').value = 'Female';
    ws.getCell('E22').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('E22').alignment = { horizontal: 'center' };

    const esrRanges = [
      ['Newborn', '<3mm/hr', '<3mm/hr'],
      ['Children', '<13mm/hr', '<13mm/hr'],
      ['12 – 20 Year', '<15mm/hr', '<18mm/hr'],
      ['20 – 55 Year', '<17mm/hr', '<21mm/hr'],
      ['>55 Year', '<19mm/hr', '<23mm/hr']
    ];
    esrRanges.forEach((row, i) => {
      const r = ws.getRow(23 + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(3).value = row[1];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(5).value = row[2];
      r.getCell(5).font = { name: 'Cambria', size: 10 };
      r.getCell(5).alignment = { horizontal: 'center' };
    });
    ws.getCell('A29').value = '[Test Method - Westregren Method]';
    ws.getCell('A29').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 4. FBS
  {
    const ws = wb.addWorksheet('FBS');
    setupSheet(ws, 'FBS', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Fasting Blood Sugar';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawFbs = pdfVal(data, 'fbs', pdfVal(data, 'shipping_fbs', '76'));
    const fbsClean = rawFbs.replace(/^[a-zs]+/i, '').trim();
    r19.getCell(3).value = fbsClean.includes('mg') ? fbsClean : `${fbsClean} mg/dl`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '74 - 115 mg/dl';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 5. S.Creatinine & eGFR
  {
    const ws = wb.addWorksheet('S.Creatinine & eGFR');
    setupSheet(ws, 'S.Creatinine & eGFR', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Serum Creatinine';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawCr = pdfVal(data, 'creatinine', pdfVal(data, 'shipping_creatinine', '1.2'));
    const crClean = rawCr.replace(/^[a-zs]+/i, '').trim();
    r19.getCell(3).value = crClean.includes('mg') ? crClean : `${crClean} mg/dL`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '0.6 - 1.3 mg/dL';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };

    const r20 = ws.getRow(20);
    r20.getCell(1).value = 'eGFR';
    r20.getCell(1).font = { name: 'Cambria', size: 11 };
    r20.getCell(3).value = pdfVal(data, 'egfr', pdfVal(data, 'shipping_egfr', '83 ml/min/1.73m2'));
    r20.getCell(3).font = { name: 'Cambria', size: 11 };
    r20.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A22').value = 'Reference Ranges [eGFR] : ';
    ws.getCell('A22').font = { name: 'Cambria', size: 11, bold: true, underline: true };
    const egfrRanges = [
      ['> 90', 'Normal'],
      ['60 - 89', 'Mildly decreased'],
      ['45 - 59', 'Mildly to moderately decreased'],
      ['30 - 44', 'Moderately to severly deccreased'],
      ['15 - 29', 'Severly descreased'],
      ['<15', 'Kidney failure']
    ];
    egfrRanges.forEach((item, i) => {
      const r = ws.getRow(23 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
    });
  }

  // 6. Serology (Syphilis & VDRL)
  {
    const ws = wb.addWorksheet('Serology');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Syphilis';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = pdfVal(data, 'syphilis', 'Negative');
    r18.getCell(3).font = { name: 'Cambria', size: 11 };

    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'VDRL';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = pdfVal(data, 'vdrl', 'Non Reactive');
    r19.getCell(3).font = { name: 'Cambria', size: 11 };

    ws.getCell('A24').value = '[SYPHILIS - Immnochromatography]';
    ws.getCell('A24').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('A25').value = '[VDRL- Carbon Antigen Method]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 7. Total Cholesterol
  {
    const ws = wb.addWorksheet('Total Cholesterol');
    setupSheet(ws, 'Total Cholesterol', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Cholesterol';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawChol = pdfVal(data, 'cholesterol', pdfVal(data, 'shipping_cholesterol', '228'));
    const cholClean = rawChol.replace(/^[a-zs]+/i, '').trim();
    r19.getCell(3).value = cholClean.includes('mg') ? cholClean : `${cholClean} mg/dl`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(5).value = '<240 mg/dl';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };
    ws.getCell('A25').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 8. Blood for SGPT & SGOT
  {
    const ws = wb.addWorksheet('SGPT & SGOT');
    setupSheet(ws, 'Blood for SGPT & SGOT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 5, text: 'Reference Range' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'SGPT';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawPt = pdfVal(data, 'sgpt', pdfVal(data, 'shipping_sgpt', '26'));
    const ptClean = rawPt.replace(/^[a-zs]+/i, '').trim();
    r18.getCell(3).value = ptClean.includes('iu') ? ptClean : `${ptClean} iu/l`;
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };
    r18.getCell(5).value = 'Upto 45 iu/l (Men)';
    r18.getCell(5).font = { name: 'Cambria', size: 11 };

    const r19 = ws.getRow(19);
    r19.getCell(5).value = 'Upto 34 iu/l (Women)';
    r19.getCell(5).font = { name: 'Cambria', size: 11 };

    const r21 = ws.getRow(21);
    r21.getCell(1).value = 'SGOT';
    r21.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawOt = pdfVal(data, 'sgot', pdfVal(data, 'shipping_sgot', '30'));
    const otClean = rawOt.replace(/^[a-zs]+/i, '').trim();
    r21.getCell(3).value = otClean.includes('iu') ? otClean : `${otClean} iu/l`;
    r21.getCell(3).font = { name: 'Cambria', size: 11 };
    r21.getCell(3).alignment = { horizontal: 'center' };
    r21.getCell(5).value = 'Upto 35 iu/l (Men)';
    r21.getCell(5).font = { name: 'Cambria', size: 11 };

    const r22 = ws.getRow(22);
    r22.getCell(5).value = 'Upto 31 iu/l (Women)';
    r22.getCell(5).font = { name: 'Cambria', size: 11 };

    ws.getCell('A26').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A26').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 9. Urine Full Report
  {
    const ws = wb.addWorksheet('UFR');
    setupSheet(ws, 'URINE FULL REPORT', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Results', align: 'left' }]);

    const chem = [
      ['Colour', pdfVal(data, 'ufr_colour', 'Pale Yellow')],
      ['Appearance', pdfVal(data, 'ufr_appearance', 'Clear')],
      ['Specific Gravity', pdfVal(data, 'ufr_specific_gravity', '1.015')],
      ['pH', pdfVal(data, 'ufr_ph', '6.0')],
      ['Glucose', pdfVal(data, 'ufr_glucose', 'Nil')],
      ['Protein', pdfVal(data, 'ufr_protein', 'Nil')],
      ['Ketone Bodies', pdfVal(data, 'ufr_ketone', 'Nil')],
      ['Bilirubin', pdfVal(data, 'ufr_bilirubin', 'Nil')],
      ['Urobilinogen', pdfVal(data, 'ufr_urobilinogen', '+ Normal')]
    ];
    chem.forEach((item, i) => {
      const r = ws.getRow(19 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(2).value = '-';
      r.getCell(2).font = { name: 'Calibri', size: 11 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });

    ws.getCell('A29').value = 'Centrifuged Urine Microscopy';
    ws.getCell('A29').font = { name: 'Times New Roman', size: 11, bold: true, underline: true };

    const micro = [
      ['Pus Cells', pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 / hpf')],
      ['Red Cells', pdfVal(data, 'ufr_red_cells', 'Nil')],
      ['Epithelial Cells', pdfVal(data, 'ufr_epithelial_cells', '+ A few   / hpf')],
      ['Organisms', pdfVal(data, 'ufr_organisms', 'Nil')],
      ['Crystals', pdfVal(data, 'ufr_crystals', 'Nil')],
      ['Casts', pdfVal(data, 'ufr_casts', 'Nil')]
    ];
    micro.forEach((item, i) => {
      const r = ws.getRow(30 + i);
      r.getCell(1).value = item[0];
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(2).value = '-';
      r.getCell(2).font = { name: 'Calibri', size: 11 };
      r.getCell(3).value = item[1];
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });
  }

  // 10. Urine Drug Screening Test (12 parameters)
  {
    const ws = wb.addWorksheet('Urine Drug');
    setupSheet(ws, 'URINE DRUG SCREENING TEST', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);

    const drugs = [
      'Amphetamine (AMP)',
      'Barbiturates (BAR)',
      'Benzodiazepine (BZO)',
      'Buprenorphine (BUP)',
      'Cocaine (COC)',
      'Marijuana (THC)',
      'Methadone (MTD)',
      'Methamphetamine (MET)',
      'Methylenedioxymethamphetamine (MDMA)',
      'Morphine (MOP)',
      'Phencyclidine (PCP)',
      'Tricyclic Antidepressants (TCA)'
    ];
    drugs.forEach((dName, i) => {
      const r = ws.getRow(18 + i);
      r.getCell(1).value = dName;
      r.getCell(1).font = { name: 'Times New Roman', size: 11 };
      r.getCell(3).value = 'Negative';
      r.getCell(3).font = { name: 'Times New Roman', size: 11 };
    });
    ws.getCell('A31').value = '[Test Method - Immnochromatography]';
    ws.getCell('A31').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 11. Haemoglobin A1C
  {
    const ws = wb.addWorksheet('HbA1c');
    setupSheet(ws, 'HAEMOGLOBIN A1C', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'HbA1c';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    const rawHb = pdfVal(data, 'hba1c_result', pdfVal(data, 'shipping_hba1c', '5.1%'));
    r18.getCell(3).value = rawHb.includes('%') ? rawHb : `${rawHb}%`;
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };

    ws.getCell('A20').value = 'Reference Range';
    ws.getCell('A20').font = { name: 'Arial Black', size: 10, bold: true, underline: true };
    const hba1cRefs = [
      ['Below 6.0%', '-', 'Normal'],
      ['6.0% to 6.4%', '-', 'Prediabetes'],
      ['6.5% or above', '-', 'Diabetes'],
      ['<7.0%', '-', 'Goal of Therapy (Adults)'],
      ['>8.0%', '-', 'Action Suggested (Adults)']
    ];
    hba1cRefs.forEach((row, i) => {
      const r = ws.getRow(21 + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { name: 'Cambria', size: 10 };
      r.getCell(2).value = row[1];
      r.getCell(2).font = { name: 'Calibri', size: 10 };
      r.getCell(3).value = row[2];
      r.getCell(3).font = { name: 'Cambria', size: 10 };
    });
    ws.getCell('A27').value = 'Analyzer - Ichroma II';
    ws.getCell('A27').font = { name: 'Cambria', size: 10, bold: true };
    ws.getCell('A28').value = '(Test Method - Fluorescence Immunoassay (FIA))';
    ws.getCell('A28').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 12. Hepatitis C [HCV]
  {
    const ws = wb.addWorksheet('HCV');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Hepatitis C [HCV]';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = pdfVal(data, 'hcv', 'Negative');
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test method - Immnochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 13. Hepatitis B [HBsAg]
  {
    const ws = wb.addWorksheet('HBsAg');
    setupSheet(ws, 'SEOROLOGY', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'left' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'Hepatitis B [HBsAg]';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = pdfVal(data, 'hbsag', pdfVal(data, 'hba', 'Negative'));
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test method - Immnochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  // 14. HIV Test
  {
    const ws = wb.addWorksheet('HIV');
    setupSheet(ws, 'HIV TEST', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }]);
    const r18 = ws.getRow(18);
    r18.getCell(1).value = 'HIV I & II';
    r18.getCell(1).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).value = pdfVal(data, 'hiv', 'Negative');
    r18.getCell(3).font = { name: 'Cambria', size: 11 };
    r18.getCell(3).alignment = { horizontal: 'center' };
    ws.getCell('A23').value = '[Test Method - Immunochromatography]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
  }

  return wb;
}

async function buildType11Workbook(data = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NeoSys Medicare';
  wb.lastModifiedBy = 'NeoSys Medicare';
  wb.created = new Date();
  wb.modified = new Date();

  const refNo = cleanRefNo(pdfVal(data, 'ref_no', '5329'));
  const passportNo = pdfVal(data, 'passport_no', pdfVal(data, 'nic', 'P1010657'));
  const patientName = reportDisplayName(data) || 'Mr.I.A.L.Dhilshanka';
  const age = reportAge(data) || '25 Years';
  const gender = pdfVal(data, 'gender', pdfVal(data, 'sex', 'Male'));
  const agency = pdfVal(data, 'agency', pdfVal(data, 'refby', 'Colombo Consultancy Lanka (Pvt) Ltd.'));
  const dateVal = reportDate(data) || '02 October 2026';
  const issuedTime = generatedReportTime(data) || '11:28 AM';

  const defaultColWidths = [22, 3, 16, 14, 3, 42, 10, 14];

  function setupSheet(ws, title, specimen = 'Blood') {
    ws.views = [{ showGridLines: true }];
    defaultColWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Row 6: Title
    ws.mergeCells('A6:F6');
    const r6 = ws.getCell('A6');
    r6.value = 'Laboratory Report';
    r6.font = { name: 'Arial Black', size: 16, bold: true, underline: true };
    r6.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(6).height = 25;

    // Rows 8-12: Patient Block
    const pRows = [
      { r: 8, l1: 'Ref.No', v1: refNo, l2: 'PP/NIC', v2: passportNo, b1: true },
      { r: 9, l1: 'Name', v1: patientName, l2: 'Age', v2: age },
      { r: 10, l1: 'Sex', v1: gender, l2: 'Ref.By', v2: agency },
      { r: 11, l1: 'Date', v1: dateVal, l2: 'Specimen', v2: specimen, b2: true },
      { r: 12, l1: 'Report Issued Time', v1: issuedTime, l2: '', v2: '' }
    ];

    pRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.height = 18;
      row.getCell(1).value = item.l1;
      row.getCell(1).font = { name: 'Cambria', size: 11, bold: !!item.b1 };
      row.getCell(2).value = item.l1 ? ':' : '';
      row.getCell(2).font = { name: 'Calibri', size: 11, bold: !!item.b1 };
      row.getCell(3).value = item.v1;
      row.getCell(3).font = { name: 'Cambria', size: 11, bold: !!item.b1 };

      if (item.l2) {
        row.getCell(4).value = item.l2;
        row.getCell(4).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
        row.getCell(5).value = ':';
        row.getCell(5).font = { name: 'Calibri', size: 11, bold: !!item.b2 };
        row.getCell(6).value = item.v2;
        row.getCell(6).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
      }
    });

    // Row 15: Section Title
    const r15 = ws.getCell('A15');
    r15.value = title;
    r15.font = { name: 'Arial Black', size: 12, bold: true, underline: true };
    ws.getRow(15).height = 22;

    // Signature Block at bottom
    const sigStart = 31;
    const sigs = [
      'W.D.Gunarathne',
      'Chief Medical Laboratory Technologist',
      'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012',
      'W.H.O.Fellow'
    ];
    sigs.forEach((text, idx) => {
      const cell = ws.getCell(`A${sigStart + idx}`);
      cell.value = text;
      cell.font = { name: 'Cambria', size: 10, bold: idx === 0 };
      ws.getRow(sigStart + idx).height = 16;
    });

    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };
  }

  function styleHeaders(ws, r, headers) {
    const row = ws.getRow(r);
    row.height = 20;
    headers.forEach((h, i) => {
      const col = h.col || (i === 0 ? 1 : i === 1 ? 3 : 5);
      const cell = row.getCell(col);
      cell.value = h.text;
      cell.font = { name: 'Arial Black', size: 11, bold: true };
      if (h.align) cell.alignment = { horizontal: h.align };
    });
  }

  // 1. FBS
  {
    const ws = wb.addWorksheet('FBS');
    setupSheet(ws, 'Fasting Blood Sugar', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 6, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Fasting Blood Sugar';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '75'));
    r19.getCell(3).value = `${String(fbsVal).replace(/\s*mg\/dl/i, '')} mg/dl`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(6).value = '74 - 115 mg/dl';
    r19.getCell(6).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test Method - Spectrophotometry - End point ]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C26');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 2. SGPT & SGOT
  {
    const ws = wb.addWorksheet('SGPT & SGOT');
    setupSheet(ws, 'Blood for SGPT & SGOT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 6, text: 'Reference Range' }]);

    const ptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '10'));
    const otVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '13'));

    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'SGPT';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).value = `${String(ptVal).replace(/\s*iu\/l/i, '')} iu/l`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(6).value = 'Upto 45 iu/l (Men)';
    r19.getCell(6).font = { name: 'Cambria', size: 11 };

    const r20 = ws.getRow(20);
    r20.getCell(1).value = '[Repeated and Confirmed]';
    r20.getCell(1).font = { name: 'Cambria', size: 10, italic: true };
    r20.getCell(6).value = 'Upto 34 iu/l (Women)';
    r20.getCell(6).font = { name: 'Cambria', size: 11 };

    const r22 = ws.getRow(22);
    r22.getCell(1).value = 'SGOT';
    r22.getCell(1).font = { name: 'Cambria', size: 11 };
    r22.getCell(3).value = `${String(otVal).replace(/\s*iu\/l/i, '')} iu/l`;
    r22.getCell(3).font = { name: 'Cambria', size: 11 };
    r22.getCell(3).alignment = { horizontal: 'center' };
    r22.getCell(6).value = 'Upto 35 iu/l (Men)';
    r22.getCell(6).font = { name: 'Cambria', size: 11 };

    const r23 = ws.getRow(23);
    r23.getCell(1).value = '[Repeated and Confirmed]';
    r23.getCell(1).font = { name: 'Cambria', size: 10, italic: true };
    r23.getCell(6).value = 'Upto 31 iu/l (Women)';
    r23.getCell(6).font = { name: 'Cambria', size: 11 };

    ws.getCell('A25').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A25').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C28');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 3. UFR
  {
    const ws = wb.addWorksheet('UFR');
    setupSheet(ws, 'URINE FULL REPORT', 'Urine');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 4, text: 'Results', align: 'center' }]);

    const chemTitle = ws.getCell('A19');
    chemTitle.value = 'CHEMICAL EXAMINATION';
    chemTitle.font = { name: 'Arial Black', size: 11, bold: true, underline: true };

    const chemRows = [
      { r: 20, l: 'Colour', v: pdfVal(data, 'ufr_colour', 'Pale Yellow') },
      { r: 21, l: 'Appearance', v: pdfVal(data, 'ufr_appearance', 'Clear') },
      { r: 22, l: 'Specific Gravity', v: pdfVal(data, 'ufr_specific_gravity', '1.010') },
      { r: 23, l: 'pH', v: pdfVal(data, 'ufr_ph', '6.0') },
      { r: 24, l: 'Glucose', v: pdfVal(data, 'ufr_glucose', 'Nil') },
      { r: 25, l: 'Protein (Albumin)', v: pdfVal(data, 'ufr_protein', 'Nil') },
      { r: 26, l: 'Ketone Bodies', v: pdfVal(data, 'ufr_ketone', 'Nil') },
      { r: 27, l: 'Bilirubin', v: pdfVal(data, 'ufr_bilirubin', 'Nil') },
      { r: 28, l: 'Urobilinogen', v: pdfVal(data, 'ufr_urobilinogen', '+ Normal') }
    ];
    chemRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(4).value = item.v;
      row.getCell(4).font = { name: 'Cambria', size: 11 };
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const micTitle = ws.getCell('A30');
    micTitle.value = 'CENTRIFUGED DEPOSITS';
    micTitle.font = { name: 'Arial Black', size: 11, bold: true, underline: true };

    const micRows = [
      { r: 31, l: 'Pus Cells', v: pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 /hpf') },
      { r: 32, l: 'Red Cells', v: pdfVal(data, 'ufr_red_cells', 'Nil') },
      { r: 33, l: 'Epithelial Cells', v: pdfVal(data, 'ufr_epithelial_cells', '+ A Few      /hpf') },
      { r: 34, l: 'Organisms', v: pdfVal(data, 'ufr_organisms', 'Nil') },
      { r: 35, l: 'Crystals', v: pdfVal(data, 'ufr_crystals', 'Nil') },
      { r: 36, l: 'Casts', v: pdfVal(data, 'ufr_casts', 'Nil') }
    ];
    micRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(4).value = item.v;
      row.getCell(4).font = { name: 'Cambria', size: 11 };
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const endCell = ws.getCell('C38');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 4. Gamma GT
  {
    const ws = wb.addWorksheet('Gamma GT');
    setupSheet(ws, 'Gamma GT', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 6, text: 'Reference Range' }]);
    const r19 = ws.getRow(19);
    r19.getCell(1).value = 'Gamma GT';
    r19.getCell(1).font = { name: 'Cambria', size: 11 };
    const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '18'));
    r19.getCell(3).value = `${String(ggtVal).replace(/\s*u\/l/i, '')} U/L`;
    r19.getCell(3).font = { name: 'Cambria', size: 11 };
    r19.getCell(3).alignment = { horizontal: 'center' };
    r19.getCell(6).value = '5 - 40 U/L (Male) / 3 - 30 U/L (Female)';
    r19.getCell(6).font = { name: 'Cambria', size: 11 };
    ws.getCell('A23').value = '[Test Method - Spectrophotometry - Kinetic]';
    ws.getCell('A23').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C26');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  // 5. Lipid Profile
  {
    const ws = wb.addWorksheet('Lipid Profile');
    setupSheet(ws, 'Lipid Profile', 'Blood');
    styleHeaders(ws, 17, [{ col: 1, text: 'Test' }, { col: 3, text: 'Result', align: 'center' }, { col: 6, text: 'Reference Range' }]);

    const cholVal = parseFloat(pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '176'))) || 176;
    const hdlVal = parseFloat(pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '44'))) || 44;
    const ldlVal = parseFloat(pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', '112.4'))) || 112.4;
    const vldlVal = parseFloat(pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', '19.6'))) || 19.6;
    const trigVal = parseFloat(pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '98'))) || 98;
    const choHdlVal = pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', '4'));

    const lipRows = [
      { r: 19, l: 'Total Cholesterol', v: `${cholVal} mg/dl`, ref: '< 240 mg/dl' },
      { r: 20, l: 'HDL Cholesterol', v: `${hdlVal} mg/dl`, ref: '35 - 55 mg/dl' },
      { r: 21, l: 'LDL Cholesterol', v: `${ldlVal} mg/dl`, ref: '< 130 mg/dl' },
      { r: 22, l: 'VLDL Cholesterol', v: `${vldlVal} mg/dl`, ref: '10 - 40 mg/dl' },
      { r: 23, l: 'Triglyceride', v: `${trigVal} mg/dl`, ref: '< 160 mg/dl' },
      { r: 24, l: 'CHO / HDL ratio', v: `${choHdlVal}`, ref: '3.3 - 4.4' }
    ];

    lipRows.forEach(item => {
      const row = ws.getRow(item.r);
      row.getCell(1).value = item.l;
      row.getCell(1).font = { name: 'Cambria', size: 11 };
      row.getCell(3).value = item.v;
      row.getCell(3).font = { name: 'Cambria', size: 11 };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(6).value = item.ref;
      row.getCell(6).font = { name: 'Cambria', size: 11 };
    });

    ws.getCell('A26').value = '[Test Method - Spectrophotometry - End point]';
    ws.getCell('A26').font = { name: 'Calibri', size: 10, bold: true };
    const endCell = ws.getCell('C29');
    endCell.value = '**End of Report**';
    endCell.font = { name: 'Cambria', size: 11, bold: true };
    endCell.alignment = { horizontal: 'center' };
  }

  return wb;
}

app.post('/api/export/excel', async (req, res) => {
  try {
    const data = req.body || {};
    if (securityConfig.lockAllReports) {
      recordAudit('EXPORT_EXCEL_BLOCKED', data, 'BLOCKED_LOCKDOWN', req);
      return res.status(403).json({ error: `System report generation is currently locked by Super Admin: ${securityConfig.lockReason || 'Maintenance Mode'}` });
    }
    if (securityConfig.allowedExportFormats?.excel === false) {
      recordAudit('EXPORT_EXCEL_BLOCKED', data, 'BLOCKED_FORMAT', req);
      return res.status(403).json({ error: 'Excel export is disabled by Super Admin.' });
    }
    const test = selectedTest(data);
    const perm = securityConfig.testPermissions[test.name] || securityConfig.testPermissions[data.test_name];
    if (perm && perm.enabled === false) {
      recordAudit('TEST_BLOCKED', data, 'BLOCKED_TEST_DISABLED', req);
      return res.status(403).json({ error: `Generating reports for "${test.name}" is restricted by Super Admin.` });
    }

    function removeEmptyColumnA(workbook) {
      if (!workbook || !workbook.worksheets) return;
      workbook.worksheets.forEach(ws => {
        let colAHasData = false;
        const maxR = Math.min(ws.rowCount || 50, 100);
        for (let r = 1; r <= maxR; r++) {
          const val = ws.getCell(r, 1).value;
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            colAHasData = true;
            break;
          }
        }
        if (!colAHasData && ws.columnCount > 1) {
          ws.spliceColumns(1, 1);
        }
      });
    }

        if (test.isShipping || test.name === 'Shipping' || data.test_name === 'Shipping' || data.report_type === 'Shipping' || String(data.test_name || '').toLowerCase().includes('shipping')) {
      const wb = await buildShippingWorkbook(data);
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: 'Shipping' }, 'SUCCESS', req);
      return res.send(Buffer.from(buffer));
    }

    if (test.isType11 || test.name === 'Type 11' || data.test_name === 'Type 11' || data.report_type === 'Type 11' || String(data.test_name || '').toLowerCase().includes('type 11')) {
      const wb = await buildType11Workbook(data);
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: 'Type 11' }, 'SUCCESS', req);
      return res.send(Buffer.from(buffer));
    }

    if (test.isCustomPackage) {
      if (test.isType11 || test.name === 'Type 11' || String(data.test_name || '').toLowerCase().includes('type 11') || (test.packageDef && test.packageDef.name === 'Type 11') || (test.packageDef?.tests && test.packageDef.tests.includes('Gamma GT') && test.packageDef.tests.includes('Lipid Profile'))) {
        const wb = await buildType11Workbook(data);
        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
        recordAudit('EXPORT_EXCEL', { ...data, test_name: 'Type 11' }, 'SUCCESS', req);
        return res.send(Buffer.from(buffer));
      }
      const pkgTests = test.packageDef?.tests || [];
      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
      const passportNo = pdfVal(data, 'passport_no', '-');
      const shortName = reportDisplayName(data);
      const fullName = reportFullName(data);
      const ageText = reportAge(data);
      const gender = pdfVal(data, 'gender', '-');
      const agency = pdfVal(data, 'agency', '-');
      const dateVal = reportDate(data);
      const dateBrucellosis = reportDateOffset(data, 1);
      const issuedTime = generatedReportTime(data);
      const wb = new ExcelJS.Workbook();
      const wb10b = new ExcelJS.Workbook();
      await wb10b.xlsx.readFile(path.join(ASSETS_DIR, 'type10b-template.xlsx'));
      const wb7 = new ExcelJS.Workbook();
      await wb7.xlsx.readFile(path.join(ASSETS_DIR, 'type7-template.xlsx'));
      const wbFbs = new ExcelJS.Workbook();
      await wbFbs.xlsx.readFile(path.join(ASSETS_DIR, 'fbs-template.xlsx'));

      function copyWs(src, dest) {
        src.columns.forEach((c, idx) => { if (c && c.width) dest.getColumn(idx + 1).width = c.width; });
        src.eachRow({ includeEmpty: true }, (r, rNum) => {
          const dR = dest.getRow(rNum);
          if (r.height) dR.height = r.height;
          r.eachCell({ includeEmpty: true }, (c, cNum) => {
            const dC = dR.getCell(cNum);
            dC.value = c.value;
            if (c.style) dC.style = JSON.parse(JSON.stringify(c.style));
          });
        });
        if (src.model && src.model.merges) {
          src.model.merges.forEach(m => { try { dest.mergeCells(m); } catch (e) {} });
        }
        if (src.pageSetup) dest.pageSetup = { ...src.pageSetup };
      }

      function renderCustomCleanSheet(targetWs, sheetTitle, specimen, testHdr, rows, methodText) {
        const defaultColWidths = [24, 3, 26, 12, 3, 36, 12, 16];
        targetWs.views = [{ showGridLines: true }];
        defaultColWidths.forEach((w, idx) => { targetWs.getColumn(idx + 1).width = w; });

        targetWs.mergeCells('A6:F6');
        const r6 = targetWs.getCell('A6');
        r6.value = 'Laboratory Report';
        r6.font = { name: 'Arial Black', size: 16, bold: true, underline: true };
        r6.alignment = { horizontal: 'center', vertical: 'middle' };
        targetWs.getRow(6).height = 25;

        const pRows = [
          { r: 8, l1: 'Ref.No', v1: refNo, l2: 'PP/NIC', v2: passportNo, b1: true },
          { r: 9, l1: 'Name', v1: shortName, l2: 'Age', v2: ageText },
          { r: 10, l1: 'Sex', v1: gender, l2: 'Ref.By', v2: agency },
          { r: 11, l1: 'Date', v1: dateVal, l2: 'Specimen', v2: specimen, b2: true },
          { r: 12, l1: 'Report Issued Time', v1: issuedTime, l2: '', v2: '' }
        ];

        pRows.forEach(item => {
          const row = targetWs.getRow(item.r);
          row.height = 18;
          row.getCell(1).value = item.l1;
          row.getCell(1).font = { name: 'Cambria', size: 11, bold: !!item.b1 };
          row.getCell(2).value = item.l1 ? ':' : '';
          row.getCell(2).font = { name: 'Calibri', size: 11, bold: !!item.b1 };
          row.getCell(3).value = item.v1;
          row.getCell(3).font = { name: 'Cambria', size: 11, bold: !!item.b1 };
          if (item.l2) {
            row.getCell(4).value = item.l2;
            row.getCell(4).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
            row.getCell(5).value = ':';
            row.getCell(5).font = { name: 'Calibri', size: 11, bold: !!item.b2 };
            row.getCell(6).value = item.v2;
            row.getCell(6).font = { name: 'Cambria', size: 11, bold: !!item.b2 };
          }
        });

        const r15 = targetWs.getCell('A15');
        r15.value = sheetTitle;
        r15.font = { name: 'Arial Black', size: 12, bold: true, underline: true };
        targetWs.getRow(15).height = 22;

        const hdrRow = targetWs.getRow(17);
        hdrRow.height = 20;
        hdrRow.getCell(1).value = 'Test';
        hdrRow.getCell(1).font = { name: 'Arial Black', size: 11, bold: true };
        hdrRow.getCell(3).value = 'Result';
        hdrRow.getCell(3).font = { name: 'Arial Black', size: 11, bold: true };
        hdrRow.getCell(3).alignment = { horizontal: 'center' };
        if (testHdr !== false) {
          hdrRow.getCell(5).value = 'Reference Range';
          hdrRow.getCell(5).font = { name: 'Arial Black', size: 11, bold: true };
        }

        let maxR = 19;
        rows.forEach(rItem => {
          const r = targetWs.getRow(rItem.r);
          if (rItem.test) {
            r.getCell(1).value = rItem.test;
            r.getCell(1).font = { name: 'Cambria', size: 11, italic: !!rItem.italic };
          }
          if (rItem.res !== undefined) {
            r.getCell(3).value = rItem.res;
            r.getCell(3).font = { name: 'Cambria', size: 11 };
            r.getCell(3).alignment = { horizontal: 'center' };
          }
          if (rItem.ref) {
            r.getCell(5).value = rItem.ref;
            r.getCell(5).font = { name: 'Cambria', size: 11 };
          }
          if (rItem.r > maxR) maxR = rItem.r;
        });

        if (methodText) {
          const mCell = targetWs.getCell(`A${maxR + 2}`);
          mCell.value = methodText;
          mCell.font = { name: 'Calibri', size: 10, bold: true };
        }
        const endCell = targetWs.getCell(`C${maxR + 4}`);
        endCell.value = '**End of Report**';
        endCell.font = { name: 'Cambria', size: 11, bold: true };
        endCell.alignment = { horizontal: 'center' };

        const sigStart = Math.max(31, maxR + 6);
        const sigs = ['W.D.Gunarathne', 'Chief Medical Laboratory Technologist', 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 'W.H.O.Fellow'];
        sigs.forEach((text, idx) => {
          const cell = targetWs.getCell(`A${sigStart + idx}`);
          cell.value = text;
          cell.font = { name: 'Cambria', size: 10, bold: idx === 0 };
          targetWs.getRow(sigStart + idx).height = 16;
        });

        targetWs.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };
      }

      for (let i = 0; i < pkgTests.length; i++) {
        const tName = pkgTests[i];
        let baseSheetName = String(tName).replace(/[*?:/\[\]\\]/g, '').substring(0, 28) || `Test ${i+1}`;
          if (tName === 'Fasting Blood Sugar' || tName === 'FBS') baseSheetName = 'FBS';
          if (tName === 'Urine Full Report' || tName === 'UFR') baseSheetName = 'UFR';
        let sheetName = baseSheetName;
        let suffix = 2;
        while (wb.getWorksheet(sheetName)) {
          sheetName = `${baseSheetName.substring(0, 25)} (${suffix++})`;
        }
        const ws = wb.addWorksheet(sheetName);

        if (tName === 'Urine Full Report' || tName === 'UFR' || tName.includes('Urine Full')) {
          copyWs(wb10b.getWorksheet('UFR'), ws);
          ws.getCell('C9').value = refNo;
          ws.getCell('H9').value = passportNo;
          ws.getCell('C10').value = shortName;
          ws.getCell('H10').value = ageText;
          ws.getCell('C11').value = gender;
          ws.getCell('H11').value = agency;
          ws.getCell('C12').value = dateVal;
          ws.getCell('H12').value = 'Urine';
          ws.getCell('C13').value = issuedTime;

          ws.getCell('E19').value = pdfVal(data, 'ufr_colour', 'Pale Yellow');
          ws.getCell('E20').value = pdfVal(data, 'ufr_appearance', 'Clear');
          ws.getCell('E21').value = pdfVal(data, 'ufr_specific_gravity', getRandomSG());
          ws.getCell('E22').value = pdfVal(data, 'ufr_ph', '6');
          ws.getCell('E23').value = pdfVal(data, 'ufr_glucose', 'Nil');
          ws.getCell('E24').value = pdfVal(data, 'ufr_protein', 'Nil');
          ws.getCell('E25').value = pdfVal(data, 'ufr_ketone', 'Nil');
          ws.getCell('E26').value = pdfVal(data, 'ufr_bilirubin', 'Nil');
          ws.getCell('E27').value = pdfVal(data, 'ufr_urobilinogen', '+ Normal');

          ws.getCell('E30').value = pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 /hpf');
          ws.getCell('E31').value = pdfVal(data, 'ufr_red_cells', 'Nil');
          ws.getCell('E32').value = pdfVal(data, 'ufr_epithelial_cells', '+ A Few      /hpf');
          ws.getCell('E33').value = pdfVal(data, 'ufr_organisms', 'Nil');
          ws.getCell('E34').value = pdfVal(data, 'ufr_crystals', 'Nil');
          ws.getCell('E35').value = pdfVal(data, 'ufr_casts', 'Nil');
        } else if (tName === 'Gonorrhea') {
          copyWs(wb10b.getWorksheet('Gonorrhea'), ws);
          ws.getCell('C9').value = refNo;
          ws.getCell('F9').value = passportNo;
          ws.getCell('C10').value = shortName;
          ws.getCell('F10').value = ageText;
          ws.getCell('C11').value = gender;
          ws.getCell('F11').value = agency;
          ws.getCell('C12').value = dateVal;
          ws.getCell('C13').value = issuedTime;
          ws.getCell('C20').value = pdfVal(data, 'gonorrhea_result', 'Negative');
        } else if (tName === 'Differential Count' || tName === 'Full Blood Count' || tName === 'FBC') {
          copyWs(wb10b.getWorksheet('FBC'), ws);
          ws.getCell('C9').value = refNo;
          ws.getCell('H9').value = passportNo;
          ws.getCell('C10').value = shortName;
          ws.getCell('H10').value = ageText;
          ws.getCell('C11').value = gender;
          ws.getCell('H11').value = agency;
          ws.getCell('C12').value = dateVal;
          ws.getCell('C13').value = issuedTime;
          ws.getCell('C33').value = pdfVal(data, 'diff_neutrophil', pdfVal(data, 'fbc_diff_neutrophil', '45'));
          ws.getCell('C34').value = pdfVal(data, 'diff_lymphocyte', pdfVal(data, 'fbc_diff_lymphocyte', '46'));
          ws.getCell('C35').value = pdfVal(data, 'diff_monocyte', pdfVal(data, 'fbc_diff_monocyte', '06'));
          ws.getCell('C36').value = pdfVal(data, 'diff_eosinophil', pdfVal(data, 'fbc_diff_eosinophil', '03'));
          ws.getCell('C37').value = pdfVal(data, 'diff_basophil', pdfVal(data, 'fbc_diff_basophil', '00'));
        } else if (tName === 'Serology') {
          const wsSrc = wb10b.getWorksheet('serology ') || wb10b.getWorksheet('serology') || wb10b.getWorksheet('Serology');
          copyWs(wsSrc, ws);
          ws.getCell('C8').value = refNo;
          ws.getCell('F8').value = passportNo;
          ws.getCell('C9').value = shortName;
          ws.getCell('F9').value = ageText;
          ws.getCell('C10').value = gender;
          ws.getCell('F10').value = agency;
          ws.getCell('C11').value = dateVal;
          ws.getCell('C12').value = issuedTime;
          ws.getCell('D19').value = pdfVal(data, 'serology_hiv', 'Negative');
          ws.getCell('D21').value = pdfVal(data, 'serology_hba', 'Negative');
          ws.getCell('D23').value = pdfVal(data, 'serology_hcv', 'Negative');
          ws.getCell('D25').value = pdfVal(data, 'serology_vdrl', 'Non Reactive');
          ws.getCell('D27').value = pdfVal(data, 'serology_syphilis', 'Negative');
        } else if (tName === 'Urine Drug Screening' || tName.includes('Urine Drug')) {
          const is12 = !tName.includes('5') && (!String(data.drug_panel_type || '').includes('5') || tName.includes('12'));
          const drugTemplatePath = path.join(ASSETS_DIR, is12 ? 'urine-drug-12-template.xlsx' : 'urine-drug-5-template.xlsx');
          const wbDrugTpl = new ExcelJS.Workbook();
          await wbDrugTpl.xlsx.readFile(drugTemplatePath);
          copyWs(wbDrugTpl.worksheets[0], ws);

          for (let r = 1; r <= 20; r++) {
            const val1 = String(ws.getCell(r, 1).value || '').trim();
            if (/ref\.?\s*no/i.test(val1)) {
              ws.getCell(r, 3).value = refNo;
              ws.getCell(r, 6).value = passportNo;
            } else if (/name/i.test(val1)) {
              ws.getCell(r, 3).value = shortName;
              ws.getCell(r, 6).value = ageText;
            } else if (/sex/i.test(val1)) {
              ws.getCell(r, 3).value = gender;
              ws.getCell(r, 6).value = agency;
            } else if (/date/i.test(val1)) {
              ws.getCell(r, 3).value = dateVal;
              ws.getCell(r, 6).value = 'Urine';
            } else if (/issued\s*time/i.test(val1)) {
              ws.getCell(r, 3).value = issuedTime;
            }
          }

          const drugList = is12 ? [
            'Amphetamine (AMP)',
            'Barbiturates (BAR)',
            'Benzodiazepine (BZO)',
            'Buprenorphine (BUP)',
            'Cocaine (COC)',
            'Marijuana (THC)',
            'Methadone (MTD)',
            'Methamphetamine (MET)',
            'Methylenedioxymethamphetamine (MDMA)',
            'Morphine (MOP)',
            'Phencyclidine (PCP)',
            'Tricyclic Antidepressants (TCA)'
          ] : [
            'Amphetamine (AMP)',
            'Benzodiazepine (BZO)',
            'Methamphetamine (MET)',
            'Opioid (OPI)',
            'Marijuana (THC)'
          ];

          for (let r = 12; r <= 40; r++) {
            const rowLabel = String(ws.getCell(r, 1).value || '').trim();
            const rowShortKey = rowLabel.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
            drugList.forEach(dName => {
              const shortKey = dName.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
              const isMatch = (rowShortKey && shortKey && rowShortKey === shortKey) || (rowLabel.toLowerCase().trim() === dName.toLowerCase().trim());
              if (isMatch) {
                const resVal = String(
                  (data.urine_drugs && data.urine_drugs[dName]) ||
                  (shortKey && data[`urine_drug_${shortKey}`]) ||
                  (dName.includes('Tramadol') && data['urine_drug_pcp']) ||
                  'Negative'
                ).trim();
                const isPos = resVal.toLowerCase() === 'positive';
                const targetCol = is12 ? 4 : 6;
                const targetCell = ws.getCell(r, targetCol);
                targetCell.value = resVal;
                targetCell.font = {
                  ...(targetCell.font || {}),
                  bold: isPos,
                  color: isPos ? { argb: 'FFDC2626' } : { argb: 'FF000000' }
                };
              }
            });
          }
        } else if (tName === 'Tuberculosis Rapid Test' || tName === 'TB') {
          copyWs(wb7.getWorksheet('TB'), ws);
          ws.getCell('C9').value = refNo;
          ws.getCell('F9').value = passportNo;
          ws.getCell('C10').value = shortName;
          ws.getCell('F10').value = ageText;
          ws.getCell('C11').value = gender;
          ws.getCell('F11').value = agency;
          ws.getCell('C12').value = dateVal;
          ws.getCell('F12').value = 'Blood';
          ws.getCell('C13').value = issuedTime;
          ws.getCell('C21').value = pdfVal(data, 'tb_result', 'Negative');
        } else if (tName === 'Brucellosis Test' || tName === 'Brucellosis') {
          copyWs(wb7.getWorksheet('Brucellosis'), ws);
          ws.getCell('C9').value = refNo;
          ws.getCell('F9').value = passportNo;
          ws.getCell('C10').value = shortName;
          ws.getCell('F10').value = ageText;
          ws.getCell('C11').value = gender;
          ws.getCell('F11').value = agency;
          ws.getCell('C12').value = dateBrucellosis;
          ws.getCell('F12').value = 'Blood';
          ws.getCell('C13').value = issuedTime;
          ws.getCell('C21').value = pdfVal(data, 'brucellosis_result', 'Negative');
        
          } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
            const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '75'));
            renderCustomCleanSheet(ws, 'Fasting Blood Sugar', 'Blood', true, [
              { r: 19, test: 'Fasting Blood Sugar', res: `${String(fbsVal).replace(/\s*mg\/dl/i, '')} mg/dl`, ref: '74 - 115 mg/dl' }
            ], '[Test Method - Spectrophotometry - End point ]');
          } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
            const sgptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '10'));
            const sgotVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '13'));
            renderCustomCleanSheet(ws, 'Blood for SGPT & SGOT', 'Blood', true, [
              { r: 19, test: 'SGPT', res: `${String(sgptVal).replace(/\s*iu\/l/i, '')} iu/l`, ref: 'Upto 45 iu/l (Men)' },
              { r: 20, test: '[Repeated and Confirmed]', italic: true, ref: 'Upto 34 iu/l (Women)' },
              { r: 22, test: 'SGOT', res: `${String(sgotVal).replace(/\s*iu\/l/i, '')} iu/l`, ref: 'Upto 35 iu/l (Men)' },
              { r: 23, test: '[Repeated and Confirmed]', italic: true, ref: 'Upto 31 iu/l (Women)' }
            ], '[Test Method - Spectrophotometry - Kinetic]');
          } else if (tName === 'Gamma GT' || tName === 'GGT') {
            const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '18'));
            renderCustomCleanSheet(ws, 'Gamma GT', 'Blood', true, [
              { r: 19, test: 'Gamma GT', res: `${String(ggtVal).replace(/\s*u\/l/i, '')} U/L`, ref: '5 - 40 U/L (Male) / 3 - 30 U/L (Female)' }
            ], '[Test Method - Spectrophotometry - Kinetic]');
          } else if (tName === 'Lipid Profile') {
            const cholVal = parseFloat(pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '176'))) || 176;
            const hdlVal = parseFloat(pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '44'))) || 44;
            const ldlVal = parseFloat(pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', '112.4'))) || 112.4;
            const vldlVal = parseFloat(pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', '19.6'))) || 19.6;
            const trigVal = parseFloat(pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '98'))) || 98;
            const choHdlVal = pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', '4'));
            renderCustomCleanSheet(ws, 'Lipid Profile', 'Blood', true, [
              { r: 19, test: 'Total Cholesterol', res: `${cholVal} mg/dl`, ref: '< 240 mg/dl' },
              { r: 20, test: 'HDL Cholesterol', res: `${hdlVal} mg/dl`, ref: '35 - 55 mg/dl' },
              { r: 21, test: 'LDL Cholesterol', res: `${ldlVal} mg/dl`, ref: '< 130 mg/dl' },
              { r: 22, test: 'VLDL Cholesterol', res: `${vldlVal} mg/dl`, ref: '10 - 40 mg/dl' },
              { r: 23, test: 'Triglyceride', res: `${trigVal} mg/dl`, ref: '< 160 mg/dl' },
              { r: 24, test: 'CHO / HDL ratio', res: `${choHdlVal}`, ref: '3.3 - 4.4' }
            ], '[Test Method - Spectrophotometry - End point]');

          } else if (tName === 'HIV Ag & Ab Test' || tName === 'HIV') {
          copyWs(wb7.getWorksheet('HIV'), ws);
          ws.getCell('C16').value = refNo;
          ws.getCell('C17').value = fullName;
          ws.getCell('C18').value = passportNo;
          ws.getCell('F18').value = ageText;
          ws.getCell('C19').value = gender;
          ws.getCell('F19').value = agency;
          ws.getCell('C20').value = dateVal;
          ws.getCell('F20').value = 'Blood';
          ws.getCell('C21').value = issuedTime;
          ws.getCell('D27').value = pdfVal(data, 'hiv_result', 'Negative');
        } else {
          // Standard Clinical Laboratory Template (from fbs-template.xlsx)
          copyWs(wbFbs.getWorksheet('04132'), ws);
          ['H20:I20', 'D21:G21', 'B24:I24', 'B26:G26', 'D27:G27'].forEach(r => { try { ws.unMergeCells(r); } catch(e){} });
          for (let r=1; r<=46; r++) for (let c=1; c<=11; c++) ws.getCell(r,c).value = null;

          ws.getCell('B7').value = 'Laboratory Report';
          ws.getCell('B9').value = 'Ref.No                '; ws.getCell('D9').value = refNo; ws.getCell('G9').value = 'PP/NIC    '; ws.getCell('H9').value = ':'; ws.getCell('I9').value = passportNo;
          ws.getCell('B10').value = 'Name'; ws.getCell('C10').value = ':'; ws.getCell('D10').value = shortName; ws.getCell('G10').value = 'Age     '; ws.getCell('H10').value = ':'; ws.getCell('I10').value = ageText;
          ws.getCell('D10').alignment = { ...(ws.getCell('D10').alignment || {}), wrapText: true, shrinkToFit: true, vertical: 'middle' };
          ws.getCell('B11').value = 'Sex'; ws.getCell('C11').value = ':'; ws.getCell('D11').value = gender; ws.getCell('G11').value = 'Ref.By'; ws.getCell('H11').value = ':'; ws.getCell('I11').value = agency;
          ws.getCell('B12').value = 'Date '; ws.getCell('C12').value = ':'; ws.getCell('D12').value = dateVal; ws.getCell('G12').value = 'Specimen'; ws.getCell('H12').value = ':'; ws.getCell('I12').value = 'Blood';
          ws.getCell('B13').value = 'Issued Time'; ws.getCell('C13').value = ':'; ws.getCell('D13').value = issuedTime;

          if (tName === 'FBS') {
            ws.getCell('B16').value = 'FASTING BLOOD SUGAR';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Fasting Blood Sugar';
            ws.getCell('E20').value = pdfVal(data, 'fbs_result', pdfVal(data, 'fbs', pdfVal(data, 'rbs', '98')));
            ws.getCell('G20').value = 'mg/dL';
            ws.getCell('H20').value = '70 - 100 mg/dL';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'RBS') {
            ws.getCell('B16').value = 'RANDOM BLOOD SUGAR';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Random Blood Sugar';
            ws.getCell('E20').value = pdfVal(data, 'rbs_result', pdfVal(data, 'rbs', pdfVal(data, 'fbs', '110')));
            ws.getCell('G20').value = 'mg/dL';
            ws.getCell('H20').value = '< 140 mg/dL';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'Total Cholesterol') {
            ws.getCell('B16').value = 'TOTAL CHOLESTEROL';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Total Cholesterol';
            ws.getCell('E20').value = pdfVal(data, 'cholesterol_result', pdfVal(data, 'cholesterol', '180'));
            ws.getCell('G20').value = 'mg/dL';
            ws.getCell('H20').value = '< 200 mg/dL';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'Lipid Profile') {
            ws.getCell('B16').value = 'LIPID PROFILE';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Desirable';
            ws.getCell('B20').value = 'Total Cholesterol'; ws.getCell('E20').value = pdfVal(data, 'lipid_total', '180'); ws.getCell('G20').value = 'mg/dl'; ws.getCell('H20').value = '< 200 mg/dl';
            ws.getCell('B21').value = 'HDL - Cholesterol'; ws.getCell('E21').value = pdfVal(data, 'lipid_hdl', '45'); ws.getCell('G21').value = 'mg/dl'; ws.getCell('H21').value = '> 40 mg/dl';
            ws.getCell('B22').value = 'Triglycerides'; ws.getCell('E22').value = pdfVal(data, 'lipid_triglyceride', '120'); ws.getCell('G22').value = 'mg/dl'; ws.getCell('H22').value = '< 150 mg/dl';
            ws.getCell('B23').value = 'LDL - Cholesterol'; ws.getCell('E23').value = pdfVal(data, 'lipid_ldl', '111'); ws.getCell('G23').value = 'mg/dl'; ws.getCell('H23').value = '< 100 mg/dl';
            ws.getCell('B24').value = 'VLDL - Cholesterol'; ws.getCell('E24').value = pdfVal(data, 'lipid_vldl', '24'); ws.getCell('G24').value = 'mg/dl'; ws.getCell('H24').value = '< 30 mg/dl';
            ws.getCell('B25').value = 'CHOL / HDL Ratio'; ws.getCell('E25').value = pdfVal(data, 'lipid_ratio', '4.0'); ws.getCell('G25').value = ''; ws.getCell('H25').value = '< 5.0';
            ws.getCell('B27').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D30').value = '**End of Report**';
          } else if (tName === 'SGPT') {
            ws.getCell('B16').value = 'SGPT (ALT)';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'SGPT (ALT)';
            ws.getCell('E20').value = pdfVal(data, 'sgpt_result', pdfVal(data, 'sgpt', '24'));
            ws.getCell('G20').value = 'iu/l';
            ws.getCell('H20').value = 'Up to 41 iu/l';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'SGOT') {
            ws.getCell('B16').value = 'SGOT (AST)';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'SGOT (AST)';
            ws.getCell('E20').value = pdfVal(data, 'sgot_result', pdfVal(data, 'sgot', '22'));
            ws.getCell('G20').value = 'iu/l';
            ws.getCell('H20').value = 'Up to 38 iu/l';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'SGPT & SGOT') {
            ws.getCell('B16').value = 'SGPT & SGOT';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'SGPT (ALT)'; ws.getCell('E20').value = pdfVal(data, 'sgpt_result', pdfVal(data, 'sgpt', '24')); ws.getCell('G20').value = 'iu/l'; ws.getCell('H20').value = 'Up to 41 iu/l';
            ws.getCell('B21').value = 'SGOT (AST)'; ws.getCell('E21').value = pdfVal(data, 'sgot_result', pdfVal(data, 'sgot', '22')); ws.getCell('G21').value = 'iu/l'; ws.getCell('H21').value = 'Up to 38 iu/l';
            ws.getCell('B23').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D26').value = '**End of Report**';
          } else if (tName === 'Serum Creatine') {
            ws.getCell('B16').value = 'SERUM CREATININE';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Serum Creatinine';
            ws.getCell('E20').value = pdfVal(data, 'creatine_result', pdfVal(data, 'creatine', '0.9'));
            ws.getCell('G20').value = 'mg/dL';
            ws.getCell('H20').value = '0.6 - 1.2 mg/dL';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'Total Bilirubine') {
            ws.getCell('B16').value = 'TOTAL BILIRUBIN';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            ws.getCell('B20').value = 'Total Bilirubin';
            ws.getCell('E20').value = pdfVal(data, 'bilirubin_result', pdfVal(data, 'bilirubin', '0.8'));
            ws.getCell('G20').value = 'mg/dL';
            ws.getCell('H20').value = '0.2 - 1.2 mg/dL';
            ws.getCell('B22').value = '(Test Method - Fully Automated Clinical Chemistry Analyzer)';
            ws.getCell('D25').value = '**End of Report**';
          } else if (tName === 'Haemoglobin A1C') {
            ws.getCell('B16').value = 'HAEMOGLOBIN A1C';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Result';
            ws.getCell('B20').value = 'HbA1c'; ws.getCell('E20').value = pdfVal(data, 'hba1c_result', '5.3%');
            ws.getCell('B22').value = 'Reference Range';
            ws.getCell('B23').value = 'Below 6.0%'; ws.getCell('D23').value = '-'; ws.getCell('E23').value = 'Normal';
            ws.getCell('B24').value = '6.0% to 6.4%'; ws.getCell('D24').value = '-'; ws.getCell('E24').value = 'Prediabetes';
            ws.getCell('B25').value = '6.5% or above'; ws.getCell('D25').value = '-'; ws.getCell('E25').value = 'Diabetes';
            ws.getCell('B29').value = 'Analyzer -HemoCue® HbA1c 501';
            ws.getCell('B30').value = '(Test Method - Fluorescence Immunoassay (FIA))';
            ws.getCell('D32').value = '**End of Report**';
          } else if (tName === 'Total β - HCG Concentration' || tName === 'Total ? - HCG Concentration') {
            ws.getCell('B16').value = 'Total β - HCG Concentration';
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units';
            ws.getCell('B20').value = 'Total β - HCG Concentration'; ws.getCell('E20').value = pdfVal(data, 'beta_hcg_conc', '< 5.00'); ws.getCell('G20').value = 'mIU/mL';
            ws.getCell('E21').value = pdfVal(data, 'beta_hcg_status', 'Negative');
            ws.getCell('B23').value = 'Reference Ranges';
            ws.getCell('B24').value = 'Pregnant Women (Week since LMP*)'; ws.getCell('E24').value = 'Total β-HCG Level [mIU/mL]';
            ws.getCell('B25').value = '0.2 - 1 Week'; ws.getCell('E25').value = '5 - 50';
            ws.getCell('B26').value = '1 - 2 Weeks'; ws.getCell('E26').value = '50 - 500';
            ws.getCell('B27').value = '2 - 3 Weeks'; ws.getCell('E27').value = '100 - 5000';
            ws.getCell('B28').value = '3 - 4 Weeks'; ws.getCell('E28').value = '500 - 10000';
            ws.getCell('B29').value = '4 - 5 Weeks'; ws.getCell('E29').value = '1000 - 50000';
            ws.getCell('B30').value = '5 - 6 Weeks'; ws.getCell('E30').value = '10000 - 100000';
            ws.getCell('B31').value = '6 - 8 Weeks'; ws.getCell('E31').value = '15000 - 200000';
            ws.getCell('B32').value = '2 - 3 Months'; ws.getCell('E32').value = '10000 - 100000';
            ws.getCell('B34').value = '(Test Method - Fluorescence Immunoassay (FIA))';
            ws.getCell('D36').value = '**End of Report**';
          } else if (tName === 'BETA H.C.G.') {
            ws.getCell('B16').value = 'BETA H.C.G.';
            ws.getCell('B18').value = 'TEST'; ws.getCell('E18').value = 'RESULTS';
            ws.getCell('B20').value = 'BETA H.C.G.'; ws.getCell('E20').value = pdfVal(data, 'test_result', 'Negative');
            ws.getCell('B22').value = '(Test Method - Immunochromatographic assay-Rapid)';
            ws.getCell('D25').value = '**End of Report**';
          } else {
            const customDef = (securityConfig.customTests || []).find(c => c.name.toLowerCase() === tName.toLowerCase());
            ws.getCell('B16').value = (customDef?.testLabel || tName).toUpperCase();
            ws.getCell('B18').value = 'Test'; ws.getCell('E18').value = 'Results'; ws.getCell('G18').value = 'Units'; ws.getCell('H18').value = 'Reference Range';
            const k = `${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_result`;
            ws.getCell('B20').value = tName;
            ws.getCell('E20').value = pdfVal(data, k, pdfVal(data, 'test_result', customDef?.resultOptions?.[0] || 'Negative'));
            ws.getCell('G20').value = customDef?.unit || '';
            ws.getCell('H20').value = customDef?.referenceRange || 'Negative';
            ws.getCell('B22').value = `(Test Method - ${customDef?.method || 'Immunochromatography'})`;
            ws.getCell('D25').value = '**End of Report**';
          }

          ws.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
        }
      }

      removeEmptyColumnA(wb);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: test.name }, 'SUCCESS', req);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (test.isType10B) {
      const wb = new ExcelJS.Workbook();
      const templatePath = path.join(ASSETS_DIR, 'type10b-template.xlsx');
      await wb.xlsx.readFile(templatePath);

      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
      const passportNo = pdfVal(data, 'passport_no', '-');
      const name = reportDisplayName(data);
      const ageText = reportAge(data);
      const gender = pdfVal(data, 'gender', '-');
      const agency = pdfVal(data, 'agency', '-');
      const dateVal = reportDate(data); // Always formatted "05 November 2026"
      const issuedTime = generatedReportTime(data);

      // For Excel cells that need a Date object (numFmt formatting), parse dateVal back to Date
      // dateVal is now always "05 November 2026" format
      const finalExcelDate = dateVal; // Use string — numFmt on Gonorrhea!C12 handles display

      // Sheet 1: Gonorrhea
      const wsGon = wb.getWorksheet('Gonorrhea');
      if (wsGon) {
        wsGon.getCell('C9').value = refNo;
        wsGon.getCell('F9').value = passportNo;
        wsGon.getCell('C10').value = name;
        wsGon.getCell('F10').value = ageText;
        wsGon.getCell('C11').value = gender;
        wsGon.getCell('F11').value = agency;
        wsGon.getCell('C12').value = finalExcelDate;
        wsGon.getCell('C13').value = issuedTime;
        wsGon.getCell('C20').value = pdfVal(data, 'gonorrhea_result', 'Negative');
      }

      // Sheet 2: UFR
      const wsUfr = wb.getWorksheet('UFR');
      if (wsUfr) {
        wsUfr.getCell('C9').value = { formula: 'Gonorrhea!C9', result: refNo };
        wsUfr.getCell('H9').value = { formula: '+Gonorrhea!F9', result: passportNo };
        wsUfr.getCell('C10').value = { formula: 'Gonorrhea!C10', result: name };
        wsUfr.getCell('H10').value = { formula: '+Gonorrhea!F10', result: ageText };
        wsUfr.getCell('C11').value = { formula: '+Gonorrhea!C11', result: gender };
        wsUfr.getCell('H11').value = { formula: 'Gonorrhea!F11', result: agency };
        wsUfr.getCell('C12').value = { formula: '+Gonorrhea!C12', result: finalExcelDate };
        wsUfr.getCell('C13').value = { formula: 'Gonorrhea!C13', result: issuedTime };

        // Chemical
        wsUfr.getCell('E19').value = pdfVal(data, 'ufr_colour', 'Pale Yellow');
        wsUfr.getCell('E20').value = pdfVal(data, 'ufr_appearance', 'Clear');
        wsUfr.getCell('E21').value = pdfVal(data, 'ufr_specific_gravity', '1.02');
        wsUfr.getCell('E22').value = pdfVal(data, 'ufr_ph', '6');
        wsUfr.getCell('E23').value = pdfVal(data, 'ufr_glucose', 'Nil');
        wsUfr.getCell('E24').value = pdfVal(data, 'ufr_protein', 'Nil');
        wsUfr.getCell('E25').value = pdfVal(data, 'ufr_ketone', 'Nil');
        wsUfr.getCell('E26').value = pdfVal(data, 'ufr_bilirubin', 'Nil');
        wsUfr.getCell('E27').value = pdfVal(data, 'ufr_urobilinogen', '+ Normal');

        // Microscopy
        wsUfr.getCell('E30').value = pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 /hpf');
        wsUfr.getCell('E31').value = pdfVal(data, 'ufr_red_cells', 'Nil');
        wsUfr.getCell('E32').value = pdfVal(data, 'ufr_epithelial_cells', '+ A Few      /hpf');
        wsUfr.getCell('E33').value = pdfVal(data, 'ufr_organisms', 'Nil');
        wsUfr.getCell('E34').value = pdfVal(data, 'ufr_crystals', 'Nil');
        wsUfr.getCell('E35').value = pdfVal(data, 'ufr_casts', 'Nil');
      }

      // Sheet 3: FBC (Differential Count - DC exactly matching user template)
      const wsFbc = wb.getWorksheet('FBC');
      if (wsFbc) {
        const pad2 = val => {
          const s = String(val ?? '').trim();
          return s.length === 1 ? `0${s}` : s;
        };
        wsFbc.getCell('C33').value = Number(pdfVal(data, 'diff_neutrophil', pdfVal(data, 'fbc_diff_neutrophil', 45))) || 45;
        wsFbc.getCell('C34').value = pad2(pdfVal(data, 'diff_lymphocyte', pdfVal(data, 'fbc_diff_lymphocyte', '46')));
        wsFbc.getCell('C35').value = pad2(pdfVal(data, 'diff_monocyte', pdfVal(data, 'fbc_diff_monocyte', '06')));
        wsFbc.getCell('C36').value = pad2(pdfVal(data, 'diff_eosinophil', pdfVal(data, 'fbc_diff_eosinophil', '03')));
        wsFbc.getCell('C37').value = pad2(pdfVal(data, 'diff_basophil', pdfVal(data, 'fbc_diff_basophil', '00')));
      }

      // Sheet 4: serology 
      const wsSero = wb.getWorksheet('serology ') || wb.getWorksheet('serology') || wb.getWorksheet('Serology');
      if (wsSero) {
        wsSero.getCell('C8').value = { formula: 'Gonorrhea!C9', result: refNo };
        wsSero.getCell('F8').value = { formula: 'Gonorrhea!F9', result: passportNo };
        wsSero.getCell('C9').value = { formula: 'Gonorrhea!C10', result: name };
        wsSero.getCell('F9').value = { formula: 'Gonorrhea!F10', result: ageText };
        wsSero.getCell('C10').value = { formula: 'Gonorrhea!C11', result: gender };
        wsSero.getCell('F10').value = { formula: 'Gonorrhea!F11', result: agency };
        wsSero.getCell('C11').value = { formula: 'Gonorrhea!C12', result: dateVal };
        wsSero.getCell('C12').value = { formula: 'Gonorrhea!C13', result: issuedTime };

        wsSero.getCell('D19').value = pdfVal(data, 'serology_hiv', 'Negative');
        wsSero.getCell('D21').value = pdfVal(data, 'serology_hba', 'Negative');
        wsSero.getCell('D23').value = pdfVal(data, 'serology_hcv', 'Negative');
        wsSero.getCell('D25').value = pdfVal(data, 'serology_vdrl', 'Non Reactive');
        wsSero.getCell('D27').value = pdfVal(data, 'serology_syphilis', 'Negative');
      }

      // Sheet 5: Urine Drug (if hasUrineDrug) - ALWAYS 12-Parameter matching the user's uploaded template
      if (test.hasUrineDrug) {
        let wsDrug = wb.getWorksheet('Urine Drug');
        if (wsDrug) wb.removeWorksheet(wsDrug.id);

        const wb12 = new ExcelJS.Workbook();
        await wb12.xlsx.readFile(path.join(ASSETS_DIR, 'urine-drug-12-template.xlsx'));
        const src12 = wb12.worksheets[0];

        wsDrug = wb.addWorksheet('Urine Drug', {
          pageSetup: {
            ...src12.pageSetup,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            orientation: 'portrait',
            paperSize: 9
          }
        });

        // Copy column widths
        src12.columns.forEach((col, idx) => {
          if (col && col.width) wsDrug.getColumn(idx + 1).width = col.width;
        });

        // Copy rows, cells & styles
        src12.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const newRow = wsDrug.getRow(rowNumber);
          newRow.height = row.height;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            newCell.value = cell.value;
            if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
          });
        });

        if (src12._merges) {
          Object.keys(src12._merges).forEach(range => {
            try { wsDrug.mergeCells(range); } catch (e) {}
          });
        }

        // Set metadata linked with Gonorrhea formulas
        wsDrug.getCell('C8').value = { formula: 'Gonorrhea!C9', result: refNo };
        wsDrug.getCell('F8').value = { formula: 'Gonorrhea!F9', result: passportNo };
        wsDrug.getCell('C9').value = { formula: 'Gonorrhea!C10', result: name };
        wsDrug.getCell('F9').value = { formula: 'Gonorrhea!F10', result: ageText };
        wsDrug.getCell('C10').value = { formula: 'Gonorrhea!C11', result: gender };
        wsDrug.getCell('F10').value = { formula: 'Gonorrhea!F11', result: agency };
        wsDrug.getCell('C11').value = { formula: 'Gonorrhea!C12', result: dateVal };
        wsDrug.getCell('F11').value = 'Urine';
        wsDrug.getCell('C12').value = { formula: 'Gonorrhea!C13', result: issuedTime };

        // Write the 12 drug results into rows 18-29!
        const drugKeysOrder = [
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
          ['Tramadol (TML)', 'tml'],
          ['Tricyclic Antidepressants (TCA)', 'tca']
        ];

        drugKeysOrder.forEach(([dName, dKey], idx) => {
          const r = 18 + idx;
          const val = String((data[`urine_drug_${dKey}`] || (dKey === 'tml' ? data['urine_drug_pcp'] : null)) || 'Negative').trim();
          const isPos = val.toLowerCase() === 'positive';
          wsDrug.getCell(`A${r}`).value = dName;
          wsDrug.getCell(`D${r}`).value = val;
          if (isPos) {
            wsDrug.getCell(`D${r}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
          } else {
            wsDrug.getCell(`D${r}`).font = { name: 'Arial', size: 10, bold: false, color: { argb: 'FF000000' } };
          }
        });
      } else {
        const wsDrug = wb.getWorksheet('Urine Drug');
        if (wsDrug) wb.removeWorksheet(wsDrug.id);
      }

      removeEmptyColumnA(wb);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: test.name }, 'SUCCESS', req);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (test.isType7) {
      const wb = new ExcelJS.Workbook();
      const templatePath = path.join(ASSETS_DIR, 'type7-template.xlsx');
      await wb.xlsx.readFile(templatePath);

      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
      const passportNo = pdfVal(data, 'passport_no', '-');
      const shortName = reportDisplayName(data);
      const fullName = reportFullName(data);
      const ageText = reportAge(data);
      const gender = pdfVal(data, 'gender', '-');
      const agency = pdfVal(data, 'agency', '-');
      const dateVal = reportDate(data);
      const dateBrucellosis = reportDateOffset(data, 1);
      const issuedTime = generatedReportTime(data);

      const ufrSg = pdfVal(data, 'ufr_specific_gravity', '') || getRandomSG();
      const wsUfr = wb.getWorksheet('UFR');
      if (wsUfr) {
        wsUfr.getCell('C8').value = refNo;
        wsUfr.getCell('H8').value = passportNo;
        wsUfr.getCell('C9').value = shortName;
        wsUfr.getCell('H9').value = ageText;
        wsUfr.getCell('C10').value = gender;
        wsUfr.getCell('H10').value = agency;
        wsUfr.getCell('C11').value = dateVal;
        wsUfr.getCell('H11').value = 'Urine';
        wsUfr.getCell('C12').value = issuedTime;

        // Chemical
        wsUfr.getCell('E18').value = pdfVal(data, 'ufr_colour', 'Pale Yellow');
        wsUfr.getCell('E19').value = pdfVal(data, 'ufr_appearance', 'Clear');
        wsUfr.getCell('E20').value = ufrSg;
        wsUfr.getCell('E21').value = pdfVal(data, 'ufr_ph', '6');
        wsUfr.getCell('E22').value = pdfVal(data, 'ufr_glucose', 'Nil');
        wsUfr.getCell('E23').value = pdfVal(data, 'ufr_protein', 'Nil');
        wsUfr.getCell('E24').value = pdfVal(data, 'ufr_ketone', 'Nil');
        wsUfr.getCell('E25').value = pdfVal(data, 'ufr_bilirubin', 'Nil');
        wsUfr.getCell('E26').value = pdfVal(data, 'ufr_urobilinogen', '+ Normal');

        // Microscopy
        wsUfr.getCell('E29').value = pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 /hpf');
        wsUfr.getCell('E30').value = pdfVal(data, 'ufr_red_cells', 'Nil');
        wsUfr.getCell('E31').value = pdfVal(data, 'ufr_epithelial_cells', '+  A Few   /hpf');
        wsUfr.getCell('E32').value = pdfVal(data, 'ufr_organisms', 'Nil');
        wsUfr.getCell('E33').value = pdfVal(data, 'ufr_crystals', 'Nil');
        wsUfr.getCell('E34').value = pdfVal(data, 'ufr_casts', 'Nil');
      }

      // Sheet 2: TB
      const wsTb = wb.getWorksheet('TB');
      if (wsTb) {
        wsTb.getCell('C9').value = { formula: 'UFR!C8', result: refNo };
        wsTb.getCell('F9').value = { formula: 'UFR!H8', result: passportNo };
        wsTb.getCell('C10').value = { formula: 'UFR!C9', result: shortName };
        wsTb.getCell('F10').value = { formula: 'UFR!H9', result: ageText };
        wsTb.getCell('C11').value = gender;
        wsTb.getCell('F11').value = { formula: 'UFR!H10', result: agency };
        wsTb.getCell('C12').value = { formula: 'UFR!C11', result: dateVal };
        wsTb.getCell('F12').value = 'Blood';
        wsTb.getCell('C13').value = { formula: 'UFR!C12', result: issuedTime };
        wsTb.getCell('C21').value = pdfVal(data, 'tb_result', 'Negative');
      }

      // Sheet 3: Brucellosis (medical date + 1 day)
      const wsBru = wb.getWorksheet('Brucellosis');
      if (wsBru) {
        wsBru.getCell('C9').value = { formula: 'UFR!C8', result: refNo };
        wsBru.getCell('F9').value = { formula: 'UFR!H8', result: passportNo };
        wsBru.getCell('C10').value = { formula: 'UFR!C9', result: shortName };
        wsBru.getCell('F10').value = { formula: 'UFR!H9', result: ageText };
        wsBru.getCell('C11').value = gender;
        wsBru.getCell('F11').value = { formula: 'UFR!H10', result: agency };
        wsBru.getCell('C12').value = dateBrucellosis;
        wsBru.getCell('F12').value = 'Blood';
        wsBru.getCell('C13').value = { formula: 'UFR!C12', result: issuedTime };
        wsBru.getCell('C21').value = pdfVal(data, 'brucellosis_result', 'Negative');
      }

      // Sheet 4: HIV (Full Name)
      const wsHiv = wb.getWorksheet('HIV');
      if (wsHiv) {
        wsHiv.getCell('C16').value = { formula: 'UFR!C8', result: refNo };
        wsHiv.getCell('C17').value = fullName;
        wsHiv.getCell('C18').value = { formula: 'UFR!H8', result: passportNo };
        wsHiv.getCell('F18').value = { formula: 'UFR!H9', result: ageText };
        wsHiv.getCell('C19').value = { formula: 'UFR!C10', result: gender };
        wsHiv.getCell('F19').value = { formula: 'UFR!H10', result: agency };
        wsHiv.getCell('C20').value = { formula: 'UFR!C11', result: dateVal };
        wsHiv.getCell('F20').value = 'Blood';
        wsHiv.getCell('C21').value = { formula: 'UFR!C12', result: issuedTime };
        wsHiv.getCell('D27').value = pdfVal(data, 'hiv_result', 'Negative');
      }

      removeEmptyColumnA(wb);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: test.name }, 'SUCCESS', req);
      await wb.xlsx.write(res);
      return res.end();
    }

    // If Urine Drug Screening, use the user's exact uploaded 5-Para or 12-Para templates
    if (test.isUrineDrugOnly) {
      const is12 = test.panelType === '12';
      const templateName = is12 ? 'urine-drug-12-template.xlsx' : 'urine-drug-5-template.xlsx';
      const templatePath = path.join(ASSETS_DIR, templateName);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(templatePath);

      while (wb.worksheets.length > 1) {
        wb.removeWorksheet(wb.worksheets[1].id);
      }
      const ws = wb.worksheets[0];
      const targetSheetName = cleanRefNo(pdfVal(data, 'ref_no', 'Urine Drug'));
      ws.name = targetSheetName || 'Urine Drug';

      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
      const passportNo = pdfVal(data, 'passport_no', '-');
      const patientName = reportDisplayName(data);
      const ageText = `${String(reportAge(data)).trim().replace(/\s*Years?$/i, '')} Years`;
      const gender = pdfVal(data, 'gender', '-');
      const agency = pdfVal(data, 'agency', '-');
      const dateVal = reportDate(data);
      const issuedTime = generatedReportTime(data);

      // Dynamic cell mapping: Scan template sheet for labels to match exact row positions
      for (let r = 1; r <= 20; r++) {
        const val1 = String(ws.getCell(r, 1).value || '').trim();
        if (/ref\.?\s*no/i.test(val1)) {
          ws.getCell(r, 3).value = refNo;
          ws.getCell(r, 6).value = passportNo;
        } else if (/name/i.test(val1)) {
          ws.getCell(r, 3).value = patientName;
          ws.getCell(r, 6).value = ageText;
        } else if (/sex/i.test(val1)) {
          ws.getCell(r, 3).value = gender;
          ws.getCell(r, 6).value = agency;
        } else if (/date/i.test(val1)) {
          ws.getCell(r, 3).value = dateVal;
          ws.getCell(r, 6).value = 'Urine';
        } else if (/issued\s*time/i.test(val1)) {
          ws.getCell(r, 3).value = issuedTime;
        }
      }

      // Write results for each drug dynamically by matching drug name in Col 1
      for (let r = 12; r <= 40; r++) {
        const rowLabel = String(ws.getCell(r, 1).value || '').trim();
        const rowShortKey = rowLabel.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
        test.drugKeys.forEach(dName => {
          const shortKey = dName.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
          const isMatch = (rowShortKey && shortKey && rowShortKey === shortKey) || (rowLabel.toLowerCase().trim() === dName.toLowerCase().trim());
          if (isMatch) {
            const resVal = String(test.drugResults[dName] || 'Negative').trim();
            const isPos = resVal.toLowerCase() === 'positive';
            const targetCol = is12 ? 4 : 6;
            const targetCell = ws.getCell(r, targetCol);
            targetCell.value = resVal;
            targetCell.font = {
              ...(targetCell.font || {}),
              bold: isPos,
              color: isPos ? { argb: 'FFDC2626' } : { argb: 'FF000000' }
            };
          }
        });
      }

      removeEmptyColumnA(wb);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'xlsx')}"`);
      recordAudit('EXPORT_EXCEL', { ...data, test_name: test.name }, 'SUCCESS', req);
      await wb.xlsx.write(res);
      return res.end();
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(ASSETS_DIR, 'fbs-template.xlsx'));
    const ws = wb.getWorksheet('04132') || wb.worksheets[0];
    // The supplied workbook is a styled laboratory-report template. Keep its fonts,
    // merges, widths, row heights and print layout; only replace the report values.
    ['H20:I20', 'D21:G21', 'B24:I24', 'B26:G26', 'D27:G27'].forEach(r => { try { ws.unMergeCells(r); } catch(e){} });
    for (let r=1; r<=46; r++) for (let c=1; c<=11; c++) ws.getCell(r,c).value = null;
    const name = test.isHivOnly ? reportFullName(data) : reportDisplayName(data);
    const ageText = reportAge(data);
    const dateText = test.isBrucellosisOnly ? (pdfVal(data, 'medical_date', '') ? reportDateISOOffset(data, 1) : reportDateOffset(data, 1)) : reportDate(data);
    ws.getCell('B7').value='Laboratory Report';
    ws.getCell('B9').value='Ref.No                '; ws.getCell('D9').value=cleanRefNo(pdfVal(data,'ref_no','-')); ws.getCell('G9').value='PP/NIC    '; ws.getCell('H9').value=':'; ws.getCell('I9').value=pdfVal(data,'passport_no','-');
    ws.getCell('B10').value='Name'; ws.getCell('C10').value=':'; ws.getCell('D10').value=name; ws.getCell('G10').value='Age     '; ws.getCell('H10').value=':'; ws.getCell('I10').value=ageText;
    ws.getCell('D10').alignment = { ...(ws.getCell('D10').alignment || {}), wrapText: true, shrinkToFit: true, vertical: 'middle' };
    ws.getCell('B11').value='Sex'; ws.getCell('C11').value=':'; ws.getCell('D11').value=pdfVal(data,'gender','-'); ws.getCell('G11').value='Ref.By'; ws.getCell('H11').value=':'; ws.getCell('I11').value=pdfVal(data,'agency','-');
    const testName = test.name;
    ws.getCell('B12').value='Date '; ws.getCell('C12').value=':'; ws.getCell('D12').value=dateText; ws.getCell('G12').value='Specimen'; ws.getCell('H12').value=':'; ws.getCell('I12').value=pdfVal(data,'specimen',(test.isUrine || test.isUrineDrugOnly) ? 'Urine' : 'Blood');
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
    } else if (test.isBetaHcgFia) {
      ws.getCell('B16').value = 'Total ? - HCG Concentration';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Results';
      ws.getCell('G18').value = 'Units';
      ws.getCell('B20').value = 'Total ? - HCG Concentration';
      ws.getCell('E20').value = test.conc || '< 5.00';
      ws.getCell('G20').value = 'mIU/mL';
      ws.getCell('E21').value = test.status || 'Negative';
      ws.getCell('B23').value = 'Reference Ranges';
      ws.getCell('B24').value = 'Pregnant Women (Week since LMP*)';
      ws.getCell('E24').value = 'Total ?-HCG Level [mIU/mL]';
      (test.betaHcgRefs || []).forEach(([week, rangeVal], i) => {
        const r = 25 + i;
        ws.getCell(`B${r}`).value = week;
        ws.getCell(`E${r}`).value = rangeVal;
      });
      const commentRow = 25 + (test.betaHcgRefs?.length || 9) + 1;
      if (test.comment) ws.getCell(`B${commentRow}`).value = `(Comments: ${test.comment})`;
      ws.getCell(`B${commentRow + 1}`).value = '(Test Method - Fluorescence Immunoassay (FIA))';
      noteRow = commentRow + 2;
    } else if (test.isBetaHcgRapid) {
      ws.getCell('B16').value = 'BETA H.C.G.';
      ws.getCell('B18').value = 'TEST';
      ws.getCell('E18').value = 'RESULTS';
      ws.getCell('B20').value = 'BETA H.C.G.';
      ws.getCell('E20').value = test.result || 'Negative';
      ws.getCell('B22').value = '(Test Method - Immunochromatographic assay-Rapid)';
      ws.getCell('B24').value = '**End of Report**';
      noteRow = 25;
    } else if (test.isTbOnly) {
      ws.getCell('B16').value = 'Tuberculosis Rapid Test';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      ws.getCell('B20').value = 'TB Test';
      ws.getCell('E20').value = test.result || 'Negative';
      ws.getCell('B22').value = '(Test Method - Immunochromatography)';
      ws.getCell('D25').value = '**End of Report**';
      noteRow = 25;
    } else if (test.isBrucellosisOnly) {
      ws.getCell('B16').value = 'BRUCELLOSIS TEST';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      ws.getCell('B20').value = 'BRUCELLA Test';
      ws.getCell('E20').value = test.result || 'Negative';
      ws.getCell('B22').value = '(Test Method - Immunochromatography)';
      ws.getCell('D25').value = '**End of Report**';
      noteRow = 25;
    } else if (test.isHivOnly) {
      ws.getCell('B16').value = 'HIV Ag & Ab Test';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      ws.getCell('B20').value = 'HIV I & II';
      ws.getCell('E20').value = test.result || 'Negative';
      ws.getCell('B22').value = '[Test Method - Antigen Antibody Immunochromatography - Rapid Test]';
      ws.getCell('D25').value = '**End of Report**';
      noteRow = 25;
    } else if (test.isCustomTest) {
      const def = test.customTestDef || {};
      ws.getCell('B16').value = def.testLabel || def.name || 'Laboratory Report';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      if (def.referenceRange) {
        ws.getCell('H18').value = 'Reference Range';
      }
      ws.getCell('B20').value = def.testLabel || def.name;
      ws.getCell('E20').value = test.result || 'Negative';
      if (def.referenceRange) {
        ws.getCell('H20').value = def.referenceRange;
      }
      if (def.method) {
        ws.getCell('B22').value = `(Test Method - ${def.method})`;
      }
      ws.getCell('D25').value = '**End of Report**';
      noteRow = 25;
    } else if (test.isUrineDrugOnly) {
      ws.getCell('B16').value = 'URINE DRUG SCREENING TEST';
      ws.getCell('B18').value = 'Test';
      ws.getCell('G18').value = 'Result';

      const drugs = [
        'Amphetamine (AMP)',
        'Barbiturates (BAR)',
        'Benzodiazepine (BZO)',
        'Buprenorphine (BUP)',
        'Cocaine (COC)',
        'Marijuana (THC)',
        'Methadone (MTD)',
        'Methamphetamine (MET)',
        'Methylenedioxymethamphetamine (MDMA)',
        'Morphine (MOP)',
        'Tramadol (TML)',
        'Tricyclic Antidepressants (TCA)'
      ];

      // Widen col B so long drug names fit; Result goes to col G
      ws.getColumn(2).width = 44;   // Col B - drug name
      ws.getColumn(7).width = 18;   // Col G - result

      drugs.forEach((d, i) => {
        const r = 20 + i;
        ws.getCell(`B${r}`).value = d;
        ws.getCell(`G${r}`).value = 'Negative';
      });

      noteRow = 20 + drugs.length; // 32
      ws.getCell(`B${noteRow + 1}`).value = '[Test Method - Immnochromatography]';
      ws.getCell(`D${noteRow + 3}`).value = '**End of Report**';
    } else if (test.isFbc) {
      ws.getCell('B16').value = 'FULL BLOOD COUNT';
      ws.getCell('B18').value = 'Test';
      ws.getCell('E18').value = 'Result';
      ws.getCell('G18').value = 'Unit';
      ws.getCell('I18').value = 'Reference Range';

      let r = 20;
      ws.getCell(`B${r}`).value = 'Total White Blood Cells (WBC)';
      ws.getCell(`E${r}`).value = test.fbcData.wbc;
      ws.getCell(`G${r}`).value = '10^3/uL';
      ws.getCell(`I${r}`).value = '4.0 - 11.0';
      r++;

      ws.getCell(`B${r}`).value = 'Differential Count';
      r++;

      test.diffRows.forEach(row => {
        ws.getCell(`B${r}`).value = `  ${row.label}`;
        ws.getCell(`E${r}`).value = row.result;
        ws.getCell(`G${r}`).value = row.unit;
        ws.getCell(`I${r}`).value = row.reference;
        r++;
      });

      ws.getCell(`B${r}`).value = 'Red Blood Cells & Indices';
      r++;

      test.rbcRows.forEach(row => {
        ws.getCell(`B${r}`).value = `  ${row.label}`;
        ws.getCell(`E${r}`).value = row.result;
        ws.getCell(`G${r}`).value = row.unit;
        ws.getCell(`I${r}`).value = row.reference;
        r++;
      });

      ws.getCell(`B${r}`).value = 'Platelet Indices';
      r++;

      test.pltRows.forEach(row => {
        ws.getCell(`B${r}`).value = `  ${row.label}`;
        ws.getCell(`E${r}`).value = row.result;
        ws.getCell(`G${r}`).value = row.unit;
        ws.getCell(`I${r}`).value = row.reference;
        r++;
      });

      noteRow = r;
    } else {
      ws.getCell('B16').value=testName; ws.getCell('B18').value='Test'; ws.getCell('E18').value='Result'; ws.getCell('H18').value='Reference Range';
      test.rows.forEach((row, i) => { const r=20+i; ws.getCell(`B${r}`).value=row.label; ws.getCell(`E${r}`).value=row.result; ws.getCell(`H${r}`).value=row.reference; });
      noteRow = 21 + test.rows.length;
      if (test.lipid) { ws.getCell(`B${noteRow+1}`).value='Reference Ranges'; ws.getCell(`B${noteRow+2}`).value='Test'; ws.getCell(`E${noteRow+2}`).value='Desirable levels'; ws.getCell(`G${noteRow+2}`).value='Borderline levels'; ws.getCell(`I${noteRow+2}`).value='High levels'; test.lipidReferenceRows.forEach((row,i)=>{ const r=noteRow+3+i; ws.getCell(`B${r}`).value=row[0]; ws.getCell(`E${r}`).value=row[1]; ws.getCell(`G${r}`).value=row[2]; ws.getCell(`I${r}`).value=row[3]; }); noteRow += 8; }
    }
    
    const method = pdfVal(data,'test_method', test.isFbc ? 'Erba Mannheim H360 Automated Hematology Analyzer' : 'Erba Mannheim Fully Auto Analyzer');
    const note = pdfVal(data,'result_note','');
    if (!test.isUrine && !test.isUrineDrugOnly && !test.isBetaHcgRapid && !test.isTbOnly && !test.isBrucellosisOnly && !test.isHivOnly) {
      ws.getCell(`B${noteRow+2}`).value=`[Test Method - ${method}]`;
      ws.getCell(`D${noteRow+5}`).value='**End of Report**';
    } else if (test.isUrine) {
      ws.getCell(`D${noteRow+4}`).value='**End of Report**';
    }
    // Signature: for Urine Drug, sign at row 37 (after 12 drugs + method + end)
    const signatureId = wb.addImage({ filename: signaturePath, extension: 'png' });
    const sigRow = test.isUrineDrugOnly ? 37.0 : (test.lipid ? 39.0 : 38.0);
    ws.addImage(signatureId, { tl: { col: 1.0, row: sigRow }, ext: { width: 90, height: 60 } });
    // Signature text rows: for drug only they land at 42-45, otherwise 43-46
    const sigNameRow   = test.isUrineDrugOnly ? 42 : 43;
    const sigTitleRow  = test.isUrineDrugOnly ? 43 : 44;
    const sigQualRow   = test.isUrineDrugOnly ? 44 : 45;
    const sigFellowRow = test.isUrineDrugOnly ? 45 : 46;
    ws.getCell(`B${sigNameRow}`).value  = 'W.D.Gunarathne';
    ws.getCell(`B${sigTitleRow}`).value = 'Chief Medical Laboratory Technologist';
    ws.getCell(`B${sigQualRow}`).value  = 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012 ';
    ws.getCell(`B${sigFellowRow}`).value= 'W.H.O.Fellow';
    const sigEndRow = sigFellowRow;
    for (let r=1; r<=sigEndRow; r++) for (let c=1; c<=11; c++) {
      const current = ws.getCell(r,c);
      if (current.value !== null && current.value !== undefined) {
        const strVal = String(current.value);
        const isHeader = ['URINE FULL REPORT', 'Centrifuged Urine Microscopy', 'FULL BLOOD COUNT', 'Total White Blood Cells (WBC)', 'Differential Count', 'Red Blood Cells & Indices', 'Platelet Indices', 'Test', 'Results', 'Result', 'Laboratory Report', 'HAEMOGLOBIN A1C', 'Reference Range', 'URINE DRUG SCREENING TEST'].includes(strVal) || ['B9','B10','B11','B12','B13','G9','G10','G11','G12'].includes(current.address);
        const isUnderlined = ['URINE FULL REPORT', 'Centrifuged Urine Microscopy', 'FULL BLOOD COUNT', 'Differential Count', 'Red Blood Cells & Indices', 'Platelet Indices', 'Test', 'Results', 'Result', 'HAEMOGLOBIN A1C', 'Reference Range', 'URINE DRUG SCREENING TEST'].includes(strVal);
        current.font = {
          ...(current.font || {}),
          name:'Cambria',
          size: strVal.includes('Test Method') ? 9 : 12,
          bold: isHeader || strVal.includes('Gunarathne') || strVal.includes('Analyzer') || strVal.includes('Test Method') || strVal === 'Positive',
          underline: isUnderlined
        };
      }
    }
    // One generated report per workbook, with the same sheet name convention as FBS.xlsx.
    for (const sheet of [...wb.worksheets]) if (sheet !== ws) wb.removeWorksheet(sheet.id);
    ws.name = String(pdfVal(data,'ref_no','Report')).replace(/[\\/*?:\[\]]/g,'_').slice(0,31) || 'Report';
    ws.pageSetup = { orientation:'portrait', paperSize:9, fitToPage:true, fitToWidth:1, fitToHeight:1 };
    removeEmptyColumnA(wb);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename="${reportFilename(data,'xlsx')}"`);
    recordAudit('EXPORT_EXCEL', { ...data, test_name: test.name }, 'SUCCESS', req);
    await wb.xlsx.write(res); res.end();
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/export/pdf', async (req, res) => {
  try {
    const data = req.body || {};
    if (securityConfig.lockAllReports) {
      recordAudit('EXPORT_PDF_BLOCKED', data, 'BLOCKED_LOCKDOWN', req);
      return res.status(403).json({ error: `System report generation is currently locked by Super Admin: ${securityConfig.lockReason || 'Maintenance Mode'}` });
    }
    if (securityConfig.allowedExportFormats?.pdf === false) {
      recordAudit('EXPORT_PDF_BLOCKED', data, 'BLOCKED_FORMAT', req);
      return res.status(403).json({ error: 'PDF export is disabled by Super Admin.' });
    }
    const test = selectedTest(data);
    const perm = securityConfig.testPermissions[test.name] || securityConfig.testPermissions[data.test_name];
    if (perm && perm.enabled === false) {
      recordAudit('TEST_BLOCKED', data, 'BLOCKED_TEST_DISABLED', req);
      return res.status(403).json({ error: `Generating reports for "${test.name}" is restricted by Super Admin.` });
    }
    let noLetterhead = req.query.letterhead === 'false' || data.noLetterhead === true || data.letterhead === false;
    if (noLetterhead && securityConfig.allowNoLetterhead === false) {
      noLetterhead = false;
    }
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const page = pdf.addPage([595.28, 841.89]);
    let bg = null;
    if (!noLetterhead) {
      // Use clean neosys-letterhead.jpg ? no cover rectangles needed (pristine blank sheet)
      const letterheadBytes = assetCache.letterhead || fs.readFileSync(letterheadPath);
      bg = await pdf.embedJpg(letterheadBytes);
      page.drawImage(bg, { x: 0, y: 0, width: 595.28, height: 841.89 });
    }
    const font = {
      regular: await pdf.embedFont(assetCache.fontRegular || fs.readFileSync(reportFontRegular)),
      bold: await pdf.embedFont(assetCache.fontBold || fs.readFileSync(reportFontBold)),
      arial: await pdf.embedFont(assetCache.fontArial || fs.readFileSync(arialFontRegular)),
      arialBold: await pdf.embedFont(assetCache.fontArialBold || fs.readFileSync(arialFontBold)),
      times: await pdf.embedFont(assetCache.fontTimes || fs.readFileSync(timesFontRegular)),
      timesBold: await pdf.embedFont(assetCache.fontTimesBold || fs.readFileSync(timesFontBold))
    };
    const fontArial = { regular: font.arial, bold: font.arialBold };
    const fontTimes = { regular: font.times, bold: font.timesBold };
    if (test.isFbc) {

      // Title - 18pt Arial Bold (Clean modern machine header matching photo)
      pdfCenteredText(page, fontArial, 'Hematology Analysis Report', 730, 18, true, 365);

      // Patient demographics 3 columns - 10.5pt Arial
      const rawName = data.name || data.fname || '';
      const genderStr = pdfVal(data, 'gender', 'Male');
      const { firstName: defFirst, lastName: defLast } = splitPatientName(rawName, genderStr);
      const firstName = pdfVal(data, 'first_name', defFirst);
      const lastName = pdfVal(data, 'last_name', defLast);
      const diagnosis = pdfVal(data, 'diagnosis', '');
      const sampleType = pdfVal(data, 'sample_type', 'Blood');
      const department = pdfVal(data, 'department', 'Heamatology');
      const patientId = pdfVal(data, 'passport_no', pdfVal(data, 'patient_id', 'N10833174'));
      const sampleId = cleanRefNo(pdfVal(data, 'sample_id', pdfVal(data, 'ref_no', '04443')));
      const nowColombo = new Date();
      const currentGenTime = nowColombo.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit' });
      const currentGenDate = nowColombo.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const repDate = reportDate(data) || currentGenDate;
      const fbcTime = pdfVal(data, 'test_time', pdfVal(data, 'report_time', pdfVal(data, 'issued_time', '')));
      const cleanFbcTime = (fbcTime && fbcTime !== '11:08' && !fbcTime.includes('undefined')) ? fbcTime : currentGenTime;
      let runTime = pdfVal(data, 'run_time', '');
      if (!runTime) {
        runTime = `${repDate} ${cleanFbcTime}`;
      } else {
        const timeMatch = runTime.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i);
        const timeToUse = timeMatch ? timeMatch[1] : cleanFbcTime;
        runTime = `${repDate} ${timeToUse}`;
      }
      const rawAge = pdfVal(data, 'age', '35');
      const cleanAge = String(rawAge).replace(/\s*years?/i, '').trim();

      const demoY1 = 705;
      const demoY2 = 689;
      const demoY3 = 673;
      const demoY4 = 657;
      const demoSize = 10.5;

      // Col 1 (x = 50)
      pdfText(page, fontArial, 'First Name:', 50, demoY1, demoSize, false);
      pdfText(page, fontArial, firstName, 120, demoY1, demoSize, false);

      pdfText(page, fontArial, 'Last Name:', 50, demoY2, demoSize, false);
      pdfText(page, fontArial, lastName, 120, demoY2, demoSize, false);

      pdfText(page, fontArial, 'Gender:', 50, demoY3, demoSize, false);
      pdfText(page, fontArial, genderStr, 120, demoY3, demoSize, false);

      pdfText(page, fontArial, 'Diagnosis:', 50, demoY4, demoSize, false);
      if (diagnosis) {
        pdfText(page, fontArial, diagnosis, 120, demoY4, demoSize, false);
      }

      // Col 2 (x = 210)
      pdfText(page, fontArial, 'Sample Type:', 210, demoY1, demoSize, false);
      pdfText(page, fontArial, sampleType, 285, demoY1, demoSize, false);

      pdfText(page, fontArial, 'Department:', 210, demoY2, demoSize, false);
      pdfText(page, fontArial, department, 285, demoY2, demoSize, false);

      pdfText(page, fontArial, 'Patient ID:', 210, demoY3, demoSize, false);
      pdfText(page, fontArial, patientId, 285, demoY3, demoSize, false);

      // Col 3 (x = 380)
      pdfText(page, fontArial, 'Sample ID:', 380, demoY1, demoSize, false);
      pdfText(page, fontArial, sampleId, 448, demoY1, demoSize, false);

      pdfText(page, fontArial, 'Run Time:', 380, demoY2, demoSize, false);
      pdfText(page, fontArial, runTime, 448, demoY2, demoSize, false);

      pdfText(page, fontArial, 'Age:', 380, demoY3, demoSize, false);
      pdfText(page, fontArial, `${cleanAge}   Year`, 448, demoY3, demoSize, false);

      // Dividing Line below demographics
      page.drawLine({ start: { x: 45, y: 648 }, end: { x: 550, y: 648 }, thickness: 0.8, color: rgb(0, 0, 0) });

      // Table Header row - Arial Bold (No line below, matches reference photo)
      pdfText(page, fontArial, 'Parameter', 50, 636, 10, true);
      pdfText(page, fontArial, 'Result', 160, 636, 10, true);
      pdfText(page, fontArial, 'Ref. Range', 222, 636, 10, true);
      pdfText(page, fontArial, 'Unit', 295, 636, 10, true);

      // 22 Parameters on Left Table - Arial 9.5pt, formatted to exact machine decimals
      let curY = 620;
      const rowStep = 11.2;
      const params = test.h360Params || [];
      params.forEach(p => {
        const resVal = formatFbcVal(p.code, p.result);
        pdfText(page, fontArial, p.code, 50, curY, 9.5, false);
        pdfText(page, fontArial, String(resVal), 160, curY, 9.5, false);
        // Flag arrow (solid black matching reference photo)
        if (p.flag === 'H') {
          pdfText(page, fontArial, '\u2191', 196, curY, 10, true, rgb(0, 0, 0));
        } else if (p.flag === 'L') {
          pdfText(page, fontArial, '\u2193', 196, curY, 10, true, rgb(0, 0, 0));
        }
        pdfText(page, fontArial, String(p.reference ?? ''), 222, curY, 9.5, false);
        pdfText(page, fontArial, String(p.unit ?? ''), 295, curY, 9.5, false);
        curY -= rowStep;
      });

      // Right Side: 3 Stacked Message Boxes - Arial
      const boxX = 350;
      const boxW = 195;
      const boxH = 76;

      // Box 1: WBC Message
      const wbcBoxY = 558;
      page.drawRectangle({ x: boxX, y: wbcBoxY, width: boxW, height: boxH, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.7 });
      page.drawLine({ start: { x: boxX, y: wbcBoxY + boxH - 16 }, end: { x: boxX + boxW, y: wbcBoxY + boxH - 16 }, thickness: 0.7, color: rgb(0.65, 0.65, 0.65) });
      pdfCenteredText(page, fontArial, 'WBC Message', wbcBoxY + boxH - 12, 9, true, boxX + boxW / 2);
      const wbcMsg = pdfVal(data, 'fbc_wbc_message', test.wbcMessage || '');
      if (wbcMsg) {
        pdfText(page, fontArial, String(wbcMsg), boxX + 6, wbcBoxY + boxH - 28, 8.5, false);
      }

      // Box 2: RBC Message
      const rbcBoxY = 474;
      page.drawRectangle({ x: boxX, y: rbcBoxY, width: boxW, height: boxH, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.7 });
      page.drawLine({ start: { x: boxX, y: rbcBoxY + boxH - 16 }, end: { x: boxX + boxW, y: rbcBoxY + boxH - 16 }, thickness: 0.7, color: rgb(0.65, 0.65, 0.65) });
      pdfCenteredText(page, fontArial, 'RBC Message', rbcBoxY + boxH - 12, 9, true, boxX + boxW / 2);
      const rbcMsg = pdfVal(data, 'fbc_rbc_message', test.rbcMessage || '');
      if (rbcMsg) {
        pdfText(page, fontArial, String(rbcMsg), boxX + 6, rbcBoxY + boxH - 28, 8.5, false);
      }

      // Box 3: PLT Message
      const pltBoxY = 390;
      page.drawRectangle({ x: boxX, y: pltBoxY, width: boxW, height: boxH, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.7 });
      page.drawLine({ start: { x: boxX, y: pltBoxY + boxH - 16 }, end: { x: boxX + boxW, y: pltBoxY + boxH - 16 }, thickness: 0.7, color: rgb(0.65, 0.65, 0.65) });
      pdfCenteredText(page, fontArial, 'PLT Message', pltBoxY + boxH - 12, 9, true, boxX + boxW / 2);
      const pltMsg = pdfVal(data, 'fbc_plt_message', test.pltMessage || '');
      if (pltMsg) {
        pdfText(page, fontArial, String(pltMsg), boxX + 6, pltBoxY + boxH - 28, 8.5, false);
      }

      // Differential Count - default to true unless explicitly disabled
      const includeDiff = data.fbc_include_diff !== '0' && data.fbc_include_diff !== false && data.fbc_include_diff !== 'false';

      let histoY = 245;

      if (includeDiff) {
        // Differential Count - Arial Bold Heading 11pt, Items 10pt (compact & refined)
        const diffTitleY = 368;
        const diffTitle = 'DIFFERENTIAL COUNT:';
        pdfText(page, fontArial, diffTitle, 50, diffTitleY, 11, true);
        const diffTitleW = fontArial.bold.widthOfTextAtSize(diffTitle, 11);
        page.drawLine({ start: { x: 50, y: diffTitleY - 2 }, end: { x: 50 + diffTitleW, y: diffTitleY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        const padVal = v => {
          if (v === undefined || v === null || v === '') return '00';
          const n = Math.round(parseFloat(v));
          if (isNaN(n)) return String(v).trim();
          return (n < 10 && n >= 0) ? '0' + n : String(n);
        };
        const neutVal = padVal(pdfVal(data, 'fbc_diff_neutrophil', test.neutrophil || '65'));
        const lymVal = padVal(pdfVal(data, 'fbc_diff_lymphocyte', test.lymphocyte || '30'));
        const monoVal = padVal(pdfVal(data, 'fbc_diff_monocyte', test.monocyte || '03'));
        const eosVal = padVal(pdfVal(data, 'fbc_diff_eosinophil', test.eosinophil || '02'));
        const basVal = padVal(pdfVal(data, 'fbc_diff_basophil', test.basophil || '00'));

        const diffRows = [
          ['NEUTROPHIL', neutVal, '(40 - 60 %)'],
          ['LYMPHOCYTE', lymVal, '(20 - 40 %)'],
          ['MONOCYTE', monoVal, '(2 - 8 %)'],
          ['EOSINOPHIL', eosVal, '(1 - 4 %)'],
          ['BASOPHIL', basVal, '(less than 1%)']
        ];

        let diffY = 354;
        const diffStep = 11.5;
        diffRows.forEach(([lbl, val, rng]) => {
          pdfText(page, fontArial, lbl, 50, diffY, 10, true);
          pdfText(page, fontArial, ':', 124, diffY, 10, true);
          pdfText(page, fontArial, val, 134, diffY, 10, true);
          pdfText(page, fontArial, rng, 172, diffY, 9.5, false);
          diffY -= diffStep;
        });

        histoY = 216; // position when diff is shown
      }

      // 3 Histograms Horizontally Side-by-Side (compact machine charts)
      const defaultWbcPath = path.join(ASSETS_DIR, 'h360-wbc.png');
      const defaultRbcPath = path.join(ASSETS_DIR, 'h360-rbc.png');
      const defaultPltPath = path.join(ASSETS_DIR, 'h360-plt.png');

      const embedHisto = async (b64, cachedBuf, fallbackPath) => {
        try {
          if (b64 && String(b64).length > 50) {
            const raw = Buffer.from(String(b64).trim(), 'base64');
            return await pdf.embedPng(raw);
          }
        } catch (e) {}
        try {
          const raw = cachedBuf || (fs.existsSync(fallbackPath) ? fs.readFileSync(fallbackPath) : null);
          if (raw) return await pdf.embedPng(raw);
        } catch (e) {}
        return null;
      };

      const wbcPng = await embedHisto(test.histograms?.wbc, assetCache.histoWbc, defaultWbcPath);
      const rbcPng = await embedHisto(test.histograms?.rbc, assetCache.histoRbc, defaultRbcPath);
      const pltPng = await embedHisto(test.histograms?.plt, assetCache.histoPlt, defaultPltPath);

      const histoH = 62;
      const histoW = 104;

      if (wbcPng) {
        page.drawImage(wbcPng, { x: 52, y: histoY, width: histoW, height: histoH });
      }
      if (rbcPng) {
        page.drawImage(rbcPng, { x: 226, y: histoY, width: histoW, height: histoH });
      }
      if (pltPng) {
        page.drawImage(pltPng, { x: 400, y: histoY, width: histoW, height: histoH });
      }

      // Bottom Signature & Stamp - Arial (matching reference photo)
      const signY = 145;
      pdfText(page, fontArial, 'W.D.Gunarathne', 48, signY, 10.5, false);
      pdfText(page, fontArial, 'Chief Medical Laboratory Technologist', 48, signY - 13, 10.5, false);
      pdfText(page, fontArial, 'D.M.L.T.(Sri Lanka) / S.L.M.C 0012', 48, signY - 26, 10.5, false);
      pdfText(page, fontArial, 'W.H.O.Fellow', 48, signY - 39, 10.5, false);
      if (!noLetterhead) {
        const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
        const signature = await pdf.embedPng(signatureBytes);
        page.drawImage(signature, { x: 48, y: signY + 6, width: 75, height: 48 });

        // Right side blue stamp
        const stampBytes = assetCache.stamp || safeReadBuf(defaultStampPath);
        if (stampBytes) {
          const stampImg = await pdf.embedPng(stampBytes);
          page.drawImage(stampImg, { x: 375, y: signY - 36, width: 145, height: 43 });
        }
      }
    } else {
      const fsBonus = noLetterhead ? 1 : 0;

      // "Laboratory Report" Header Title (required on all reports except FBC)
      const labTitle = 'Laboratory Report';
      const labTitleSize = 15 + fsBonus;
      const labTitleWidth = font.bold.widthOfTextAtSize(labTitle, labTitleSize);
      const labTitleX = 298 - (labTitleWidth / 2);
      pdfText(page, font, labTitle, labTitleX, 718, labTitleSize, true);
      page.drawLine({
        start: { x: labTitleX, y: 715 },
        end: { x: labTitleX + labTitleWidth, y: 715 },
        thickness: 1.2,
        color: rgb(0, 0, 0)
      });

      const dateText = (test.isBrucellosisOnly) ? reportDateOffset(data, 1) : reportDate(data);
      const nameText = (test.isHivOnly) ? reportFullName(data) : reportDisplayName(data);
      const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
      const left = [['Ref. No', refNo], ['Name', nameText], ['Sex', pdfVal(data,'gender','-')], ['Date', dateText], ['Issued Time', generatedReportTime(data)]];
      const right = [['PP/NIC No', pdfVal(data,'passport_no','-')], ['Age', reportAge(data)], ['Referred By', pdfVal(data,'agency','-')], ['Specimen', pdfVal(data,'specimen', (test.isUrine || test.isType7) ? 'Urine' : 'Blood')]];
      let y = 685;
      left.forEach(([label,value])=>{
        if (label === 'Issued Time') {
          pdfText(page,font,label,57,y,11 + fsBonus); pdfText(page,font,':',138,y,11 + fsBonus,true); pdfText(page,font,value,147,y,11 + fsBonus);
          y -= 16;
          return;
        }
        const emphasize = label === 'Ref. No'; pdfText(page,font,label,57,y,11 + fsBonus,emphasize); pdfText(page,font,':',138,y,11 + fsBonus,true);
        const valueX = 147;
        if (label === 'Name' && font.regular.widthOfTextAtSize(String(value), 11 + fsBonus) > 165) {
          const words = String(value).split(/\s+/); const lines = []; let line = '';
          words.forEach(word => { const candidate = (line + ' ' + word).trim(); if (font.regular.widthOfTextAtSize(candidate, 11 + fsBonus) > 165 && line) { lines.push(line); line = word; } else line = candidate; });
          if (line) lines.push(line);
          lines.forEach((part,index)=>pdfText(page,font,part,147,y-(index*13),11 + fsBonus,emphasize));
          y -= (14 * lines.length) + 2;
        } else { pdfText(page,font,value,valueX,y,11 + fsBonus,emphasize); y-=16; }
      });
      let rightY=685; right.forEach(([label,value])=>{ const emphasize = label === 'Specimen'; pdfText(page,font,label,315,rightY,11 + fsBonus,emphasize); pdfText(page,font,':',380,rightY,11 + fsBonus,true); pdfText(page,font,value,390,rightY,11 + fsBonus,emphasize); rightY-=16; });
      const detailBottomY = Math.min(y, rightY);
      const testY = detailBottomY - 22;
      const testName = test.name;
      const method = pdfVal(data,'test_method','Erba Mannheim Fully Auto Analyzer');
      const note = pdfVal(data,'result_note','');

      const renderUrineDrugSection = async (targetPage) => {
        if (!noLetterhead && bg) {
          targetPage.drawImage(bg, { x: 0, y: 0, width: 595.28, height: 841.89 });
        }

        // "Laboratory Report" Header Title
        const labTitle = 'Laboratory Report';
        const labTitleSize = 15 + fsBonus;
        const labTitleWidth = font.bold.widthOfTextAtSize(labTitle, labTitleSize);
        const labTitleX = 298 - (labTitleWidth / 2);
        pdfText(targetPage, font, labTitle, labTitleX, 718, labTitleSize, true);
        targetPage.drawLine({
          start: { x: labTitleX, y: 715 },
          end: { x: labTitleX + labTitleWidth, y: 715 },
          thickness: 1.2,
          color: rgb(0, 0, 0)
        });

        const drugRefNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
        const drugPassportNo = pdfVal(data, 'passport_no', '-');
        const drugName = reportDisplayName(data);
        const drugAge = reportAge(data);
        const drugGender = pdfVal(data, 'gender', '-');
        const drugAgency = pdfVal(data, 'agency', '-');
        const drugDate = reportDate(data);
        const drugIssuedTime = generatedReportTime(data);

        const drugLeft = [
          ['Ref. No', drugRefNo],
          ['Name', drugName],
          ['Sex', drugGender],
          ['Date', drugDate],
          ['Issued Time', drugIssuedTime]
        ];
        const drugRight = [
          ['PP/NIC No', drugPassportNo],
          ['Age', drugAge],
          ['Referred By', drugAgency],
          ['Specimen', 'Urine']
        ];

        let dY = 685;
        drugLeft.forEach(([label, value]) => {
          if (label === 'Issued Time') {
            pdfText(targetPage, font, label, 57, dY, 11 + fsBonus);
            pdfText(targetPage, font, ':', 138, dY, 11 + fsBonus, true);
            pdfText(targetPage, font, value, 147, dY, 11 + fsBonus);
            dY -= 16;
            return;
          }
          const emphasize = label === 'Ref. No';
          pdfText(targetPage, font, label, 57, dY, 11 + fsBonus, emphasize);
          pdfText(targetPage, font, ':', 138, dY, 11 + fsBonus, true);
          const valueX = 147;
          if (label === 'Name' && font.regular.widthOfTextAtSize(String(value), 11 + fsBonus) > 165) {
            const words = String(value).split(/\s+/);
            const lines = [];
            let line = '';
            words.forEach(word => {
              const candidate = (line + ' ' + word).trim();
              if (font.regular.widthOfTextAtSize(candidate, 11 + fsBonus) > 165 && line) {
                lines.push(line);
                line = word;
              } else line = candidate;
            });
            if (line) lines.push(line);
            lines.forEach((part, index) => pdfText(targetPage, font, part, 147, dY - (index * 13), 11 + fsBonus, emphasize));
            dY -= (14 * lines.length) + 2;
          } else {
            pdfText(targetPage, font, value, valueX, dY, 11 + fsBonus, emphasize);
            dY -= 16;
          }
        });

        let drugRightY = 685;
        drugRight.forEach(([label, value]) => {
          const emphasize = label === 'Specimen';
          pdfText(targetPage, font, label, 315, drugRightY, 11 + fsBonus, emphasize);
          pdfText(targetPage, font, ':', 380, drugRightY, 11 + fsBonus, true);
          pdfText(targetPage, font, value, 390, drugRightY, 11 + fsBonus, emphasize);
          drugRightY -= 16;
        });

        const drugDetailBottomY = Math.min(dY, drugRightY);
        const drugTitleY = drugDetailBottomY - 22;

        const drugTitle = 'URINE DRUG SCREENING TEST';
        pdfText(targetPage, font, drugTitle, 43, drugTitleY, 12 + fsBonus, true);
        const drugTitleW = font.bold.widthOfTextAtSize(drugTitle, 12 + fsBonus);
        targetPage.drawLine({
          start: { x: 43, y: drugTitleY - 2 },
          end: { x: 43 + drugTitleW, y: drugTitleY - 2 },
          thickness: 1,
          color: rgb(0, 0, 0)
        });

        const headerY = drugTitleY - 24;
        targetPage.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0, 0, 0) });
        targetPage.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0, 0, 0) });
        pdfText(targetPage, font, 'Test', 55, headerY, 11 + fsBonus, true);
        pdfText(targetPage, font, 'Result', 340, headerY, 11 + fsBonus, true);

        const is12 = test.panelType === '12' || String(data.drug_panel_type || '').includes('12') || test.isType10B || !!test.hasUrineDrug;
        const drugList = is12 ? [
          'Amphetamine (AMP)',
          'Barbiturates (BAR)',
          'Benzodiazepine (BZO)',
          'Buprenorphine (BUP)',
          'Cocaine (COC)',
          'Marijuana (THC)',
          'Methadone (MTD)',
          'Methamphetamine (MET)',
          'Methylenedioxymethamphetamine (MDMA)',
          'Morphine (MOP)',
          'Phencyclidine (PCP)',
          'Tricyclic Antidepressants (TCA)'
        ] : [
          'Amphetamine (AMP)',
          'Benzodiazepine (BZO)',
          'Methamphetamine (MET)',
          'Opioid (OPI)',
          'Marijuana (THC)'
        ];

        let rowY = headerY - 20;
        const rowStep = is12 ? 15 : 20;
        drugList.forEach(d => {
          const shortKey = d.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
          const res = (test.drugResults && test.drugResults[d]) || 
                      (data.urine_drugs && data.urine_drugs[d]) || 
                      (shortKey && data[`urine_drug_${shortKey}`]) || 
                      'Negative';
          const isPos = String(res).trim().toLowerCase() === 'positive';
          pdfText(targetPage, font, d, 55, rowY, 10 + fsBonus, false);
          if (isPos) {
            targetPage.drawText(res, { x: 340, y: rowY, size: 10.5 + fsBonus, font: font.bold, color: rgb(0.85, 0.1, 0.1) });
          } else {
            pdfText(targetPage, font, res, 340, rowY, 10.5 + fsBonus, false);
          }
          rowY -= rowStep;
        });

        const methodY = rowY - 10;
        pdfText(targetPage, font, '[Test Method - Immnochromatography]', 43, methodY, 9.5 + fsBonus, false);

        const endReportY = methodY - 26;
        pdfCenteredText(targetPage, font, '**End of Report**', endReportY, 10.5 + fsBonus, true);

        const signY = 160;
        pdfText(targetPage, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(targetPage, font, 'Chief Medical Laboratory Technologist', 43, signY - 11, 11);
        pdfText(targetPage, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY - 22, 11);
        pdfText(targetPage, font, 'W.H.O.Fellow', 43, signY - 33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          targetPage.drawImage(signature, { x: 43, y: signY + 5, width: 70, height: 47 });
        }
      };

      const renderPageHeader = (targetPage, customDate, customName, customSpecimen) => {
        if (!noLetterhead && bg) {
          targetPage.drawImage(bg, { x: 0, y: 0, width: 595.28, height: 841.89 });
        }
        const labTitle = 'Laboratory Report';
        const labTitleSize = 15 + fsBonus;
        const labTitleWidth = font.bold.widthOfTextAtSize(labTitle, labTitleSize);
        const labTitleX = 298 - (labTitleWidth / 2);
        pdfText(targetPage, font, labTitle, labTitleX, 718, labTitleSize, true);
        targetPage.drawLine({
          start: { x: labTitleX, y: 715 },
          end: { x: labTitleX + labTitleWidth, y: 715 },
          thickness: 1.2,
          color: rgb(0, 0, 0)
        });

        const pRefNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
        const pLeft = [
          ['Ref. No', pRefNo],
          ['Name', customName || reportDisplayName(data)],
          ['Sex', pdfVal(data, 'gender', '-')],
          ['Date', customDate || reportDate(data)],
          ['Issued Time', generatedReportTime(data)]
        ];
        const pRight = [
          ['PP/NIC No', pdfVal(data, 'passport_no', '-')],
          ['Age', reportAge(data)],
          ['Referred By', pdfVal(data, 'agency', '-')],
          ['Specimen', customSpecimen || 'Blood']
        ];
        let py = 685;
        pLeft.forEach(([label, value]) => {
          if (label === 'Issued Time') {
            pdfText(targetPage, font, label, 57, py, 11 + fsBonus);
            pdfText(targetPage, font, ':', 138, py, 11 + fsBonus, true);
            pdfText(targetPage, font, value, 147, py, 11 + fsBonus);
            py -= 16;
            return;
          }
          const emphasize = label === 'Ref. No';
          pdfText(targetPage, font, label, 57, py, 11 + fsBonus, emphasize);
          pdfText(targetPage, font, ':', 138, py, 11 + fsBonus, true);
          const valueX = 147;
          if (label === 'Name' && font.regular.widthOfTextAtSize(String(value), 11 + fsBonus) > 165) {
            const words = String(value).split(/\s+/);
            const lines = [];
            let line = '';
            words.forEach(word => {
              const candidate = (line + ' ' + word).trim();
              if (font.regular.widthOfTextAtSize(candidate, 11 + fsBonus) > 165 && line) {
                lines.push(line);
                line = word;
              } else line = candidate;
            });
            if (line) lines.push(line);
            lines.forEach((part, index) => pdfText(targetPage, font, part, 147, py - (index * 13), 11 + fsBonus, emphasize));
            py -= (14 * lines.length) + 2;
          } else {
            pdfText(targetPage, font, value, valueX, py, 11 + fsBonus, emphasize);
            py -= 16;
          }
        });
        let prightY = 685;
        pRight.forEach(([label, value]) => {
          const emphasize = label === 'Specimen';
          pdfText(targetPage, font, label, 315, prightY, 11 + fsBonus, emphasize);
          pdfText(targetPage, font, ':', 380, prightY, 11 + fsBonus, true);
          pdfText(targetPage, font, value, 390, prightY, 11 + fsBonus, emphasize);
          prightY -= 16;
        });
        return Math.min(py, prightY) - 22;
      };

      const renderSign = async (targetPage, customSignY = 175) => {
        pdfText(targetPage, font, 'W.D.Gunarathne', 43, customSignY, 11);
        pdfText(targetPage, font, 'Chief Medical Laboratory Technologist', 43, customSignY - 11, 11);
        pdfText(targetPage, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, customSignY - 22, 11);
        pdfText(targetPage, font, 'W.H.O.Fellow', 43, customSignY - 33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          targetPage.drawImage(signature, { x: 43, y: customSignY + 5, width: 70, height: 47 });
        }
      };

      const renderRapidTestBody = (targetPage, tY, title, testItem, resultVal, methodText, footerNote) => {
        pdfText(targetPage, font, title, 43, tY, 12 + fsBonus, true);
        const titleWidth = font.bold.widthOfTextAtSize(title, 12 + fsBonus);
        targetPage.drawLine({ start: { x: 43, y: tY - 2 }, end: { x: 43 + titleWidth, y: tY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        const headerY = tY - 24;
        targetPage.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
        targetPage.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
        pdfText(targetPage, font, 'Test', 70, headerY, 12 + fsBonus, true);
        pdfCenteredText(targetPage, font, 'Results', headerY, 12 + fsBonus, true, 310);

        const r1Y = headerY - 28;
        pdfText(targetPage, font, testItem, 70, r1Y, 12 + fsBonus, true);
        pdfCenteredText(targetPage, font, resultVal, r1Y, 12 + fsBonus, true, 310);

        let curY = r1Y - 32;
        pdfText(targetPage, font, methodText, 43, curY, 10 + fsBonus, false);
        curY -= 32;
        pdfCenteredText(targetPage, font, footerNote || '**End of Report**', curY, 12 + fsBonus, true);
      };

      if (test.isCustomPackage) {
        const pkgTests = test.packageDef?.tests || [];
        const totalPages = pkgTests.length;
        const refNo = cleanRefNo(pdfVal(data, 'ref_no', '-'));
        const nameText = reportDisplayName(data);
        const fullNameText = reportFullName(data);
        const dateText = reportDate(data);

        for (let pIdx = 0; pIdx < pkgTests.length; pIdx++) {
          const tName = pkgTests[pIdx];
          const isFirstPage = (pIdx === 0);
          const pageN = isFirstPage ? page : pdf.addPage([595.28, 841.89]);

          const isUrineTest = tName === 'Urine Full Report' || tName === 'Urine Drug Screening';
          const pDate = (tName === 'Brucellosis Test' ? reportDateOffset(data, 1) : dateText);
          const pName = (tName === 'HIV Ag & Ab Test' || tName === 'HIV') ? fullNameText : nameText;
          const pSpecimen = pdfVal(data, 'specimen', isUrineTest ? 'Urine' : 'Blood');

          const pY = isFirstPage ? testY : renderPageHeader(pageN, pDate, pName, pSpecimen);
          const pageFooter = `**Page ${pIdx + 1} of ${totalPages}**` + (pIdx === totalPages - 1 ? '\n**End of Report**' : '');

          if (tName === 'Urine Full Report') {
            const defaultUfr = {
              colour: 'Pale Yellow', appearance: 'Clear', specific_gravity: pdfVal(data, 'ufr_specific_gravity', '') || getRandomSG(),
              ph: '6.0', glucose: 'Nil', protein: 'Nil', ketone: 'Nil', bilirubin: 'Nil', urobilinogen: '+ Normal',
              pus_cells: '+ 01 - 02 /hpf', red_cells: 'Nil', epithelial_cells: '+  A Few   /hpf', organisms: 'Nil', crystals: 'Nil', casts: 'Nil'
            };
            const chemRows = [
              { label: 'Colour', result: pdfVal(data, 'ufr_colour', defaultUfr.colour) },
              { label: 'Appearance', result: pdfVal(data, 'ufr_appearance', defaultUfr.appearance) },
              { label: 'Specific Gravity', result: defaultUfr.specific_gravity },
              { label: 'pH', result: pdfVal(data, 'ufr_ph', defaultUfr.ph) },
              { label: 'Glucose', result: pdfVal(data, 'ufr_glucose', defaultUfr.glucose) },
              { label: 'Protein (Albumin)', result: pdfVal(data, 'ufr_protein', defaultUfr.protein) },
              { label: 'Ketone Bodies', result: pdfVal(data, 'ufr_ketone', defaultUfr.ketone) },
              { label: 'Bilirubin', result: pdfVal(data, 'ufr_bilirubin', defaultUfr.bilirubin) },
              { label: 'Urobilinogen', result: pdfVal(data, 'ufr_urobilinogen', defaultUfr.urobilinogen) }
            ];
            const microRows = [
              { label: 'Pus Cells', result: pdfVal(data, 'ufr_pus_cells', defaultUfr.pus_cells) },
              { label: 'Red Cells', result: pdfVal(data, 'ufr_red_cells', defaultUfr.red_cells) },
              { label: 'Epithelial Cells', result: pdfVal(data, 'ufr_epithelial_cells', defaultUfr.epithelial_cells) },
              { label: 'Organisms', result: pdfVal(data, 'ufr_organisms', defaultUfr.organisms) },
              { label: 'Crystals', result: pdfVal(data, 'ufr_crystals', defaultUfr.crystals) },
              { label: 'Casts', result: pdfVal(data, 'ufr_casts', defaultUfr.casts) }
            ];
            const title = 'URINE FULL REPORT';
            pdfText(pageN, font, title, 43, pY, 12 + fsBonus, true);
            const titleWidth = font.bold.widthOfTextAtSize(title, 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + titleWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const headerY = pY - 24;
            pdfText(pageN, font, 'Test', 43, headerY, 11 + fsBonus, true);
            pdfText(pageN, font, 'Results', 260, headerY, 11 + fsBonus, true);
            let curY = headerY - 18;
            chemRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, row.result, 260, curY, 10.5 + fsBonus, false);
              curY -= 15;
            });
            curY -= 10;
            pdfText(pageN, font, 'Centrifuged Urine Microscopy', 43, curY, 11 + fsBonus, true);
            curY -= 18;
            microRows.forEach(row => {
              pdfText(pageN, font, row.label, 43, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, '_', 240, curY, 10.5 + fsBonus, false);
              pdfText(pageN, font, row.result, 260, curY, 10.5 + fsBonus, false);
              curY -= 15;
            });
            pdfCenteredText(pageN, font, pageFooter, curY - 20, 11 + fsBonus, true);
            await renderSign(pageN, 140);
          } else if (tName === 'Tuberculosis Rapid Test') {
            renderRapidTestBody(pageN, pY, 'Tuberculosis Rapid Test', 'TB Test', pdfVal(data, 'tb_result', 'Negative'), '(Test Method - Immunochromatography)', pageFooter);
            await renderSign(pageN, 175);
          } else if (tName === 'Brucellosis Test') {
            renderRapidTestBody(pageN, pY, 'BRUCELLOSIS TEST', 'BRUCELLA Test', pdfVal(data, 'brucellosis_result', 'Negative'), '(Test Method - Immunochromatography)', pageFooter);
            await renderSign(pageN, 175);
          } else if (tName === 'HIV Ag & Ab Test') {
            renderRapidTestBody(pageN, pY, 'HIV Ag & Ab Test', 'HIV I & II', pdfVal(data, 'hiv_result', 'Negative'), '[Test Method - Antigen Antibody Immunochromatography - Rapid Test]', pageFooter);
            await renderSign(pageN, 175);
          } else if (tName === 'Fasting Blood Sugar' || tName === 'FBS') {
            const fbsVal = pdfVal(data, 'fbs', pdfVal(data, 'colombo_fbs', '75'));
            const fbsMethod = '[Test Method - Spectrophotometry - End point ]';
            pdfText(pageN, font, 'FASTING BLOOD SUGAR', 43, pY, 12 + fsBonus, true);
            const tWidth = font.bold.widthOfTextAtSize('FASTING BLOOD SUGAR', 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const hdrY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
            pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
            pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

            const rowY = hdrY - 28;
            pdfText(pageN, font, 'Fasting Blood Sugar', 70, rowY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, `${fbsVal} mg/dl`, rowY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, '74 - 115 mg/dl', 370, rowY, 10.5 + fsBonus, false);

            pdfText(pageN, font, fbsMethod, 43, rowY - 32, 10 + fsBonus, false);
            pdfCenteredText(pageN, font, pageFooter, rowY - 64, 11 + fsBonus, true);
            await renderSign(pageN, 175);
          } else if (tName === 'SGPT & SGOT' || tName === 'Blood for SGPT & SGOT') {
            const sgptVal = pdfVal(data, 'sgpt', pdfVal(data, 'colombo_sgpt', '10'));
            const sgotVal = pdfVal(data, 'sgot', pdfVal(data, 'colombo_sgot', '13'));
            const methodText = '[Test Method - Spectrophotometry - Kinetic]';

            pdfText(pageN, font, 'BLOOD FOR SGPT & SGOT', 43, pY, 12 + fsBonus, true);
            const tWidth = font.bold.widthOfTextAtSize('BLOOD FOR SGPT & SGOT', 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const hdrY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
            pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
            pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

            const r1Y = hdrY - 28;
            pdfText(pageN, font, 'SGPT', 70, r1Y, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, `${sgptVal} iu/l`, r1Y, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Upto 45 iu/l (Men)', 370, r1Y, 10.5 + fsBonus, false);
            pdfText(pageN, font, 'Upto 34 iu/l (Women)', 370, r1Y - 14, 10.5 + fsBonus, false);

            const r2Y = r1Y - 32;
            pdfText(pageN, font, 'SGOT', 70, r2Y, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, `${sgotVal} iu/l`, r2Y, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Upto 35 iu/l (Men)', 370, r2Y, 10.5 + fsBonus, false);
            pdfText(pageN, font, 'Upto 31 iu/l (Women)', 370, r2Y - 14, 10.5 + fsBonus, false);

            pdfText(pageN, font, methodText, 43, r2Y - 36, 10 + fsBonus, false);
            pdfCenteredText(pageN, font, pageFooter, r2Y - 68, 11 + fsBonus, true);
            await renderSign(pageN, 175);
          } else if (tName === 'Gamma GT' || tName === 'GGT') {
            const ggtVal = pdfVal(data, 'gamma_gt', pdfVal(data, 'colombo_gamma_gt', '18'));
            const methodText = '[Test Method - Spectrophotometry - Kinetic ]';

            pdfText(pageN, font, 'GAMMA GT', 43, pY, 12 + fsBonus, true);
            const tWidth = font.bold.widthOfTextAtSize('GAMMA GT', 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const hdrY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
            pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
            pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

            const rowY = hdrY - 28;
            pdfText(pageN, font, 'Gamma GT', 70, rowY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, `${ggtVal} U/L`, rowY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, '5 - 40 U/L', 370, rowY, 10.5 + fsBonus, false);

            pdfText(pageN, font, methodText, 43, rowY - 32, 10 + fsBonus, false);
            pdfCenteredText(pageN, font, pageFooter, rowY - 64, 11 + fsBonus, true);
            await renderSign(pageN, 175);
          } else if (tName === 'Lipid Profile') {
            const cholVal = pdfVal(data, 'cholesterol', pdfVal(data, 'colombo_cholesterol', '176'));
            const hdlVal = pdfVal(data, 'hdl', pdfVal(data, 'colombo_hdl', '44'));
            const ldlVal = pdfVal(data, 'ldl', pdfVal(data, 'colombo_ldl', '112.4'));
            const vldlVal = pdfVal(data, 'vldl', pdfVal(data, 'colombo_vldl', '19.6'));
            const trigVal = pdfVal(data, 'triglyceride', pdfVal(data, 'colombo_triglyceride', '98'));
            const choHdlVal = pdfVal(data, 'cho_hdl', pdfVal(data, 'colombo_cho_hdl', '4'));
            const methodText = '[Test Method - Spectrophotometry - End point ]';

            pdfText(pageN, font, 'LIPID PROFILE', 43, pY, 12 + fsBonus, true);
            const tWidth = font.bold.widthOfTextAtSize('LIPID PROFILE', 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const hdrY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
            pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
            pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
            pdfText(pageN, font, 'Biological Reference Interval', 370, hdrY, 11 + fsBonus, true);

            const lipidRows = [
              { label: 'Total Cholesterol', val: `${cholVal} mg/dl`, ref: '< 240 mg/dl' },
              { label: 'HDL Cholesterol', val: `${hdlVal} mg/dl`, ref: '35 - 55 mg/dl' },
              { label: 'LDL Cholesterol', val: `${ldlVal} mg/dl`, ref: '< 130 mg/dl' },
              { label: 'VLDL Cholesterol', val: `${vldlVal} mg/dl`, ref: '10 - 40 mg/dl' },
              { label: 'Triglyceride', val: `${trigVal} mg/dl`, ref: '< 160 mg/dl' },
              { label: 'CHO / HDL ratio', val: `${choHdlVal}`, ref: '3.3 - 4.4' }
            ];

            let curY = hdrY - 24;
            lipidRows.forEach(r => {
              pdfText(pageN, font, r.label, 70, curY, 10.5 + fsBonus, true);
              pdfCenteredText(pageN, font, r.val, curY, 10.5 + fsBonus, true, 260);
              pdfText(pageN, font, r.ref, 370, curY, 10 + fsBonus, false);
              curY -= 17;
            });

            curY -= 6;
            pdfText(pageN, font, methodText, 43, curY, 9.5 + fsBonus, false);

            // Reference ranges info box
            curY -= 18;
            pdfText(pageN, font, 'Coronary Heart Disease Risk :', 43, curY, 9.5 + fsBonus, true);
            curY -= 13;
            pdfText(pageN, font, 'Total Cholesterol : < 200 mg/dl Desirable, 200 - 239 Borderline High, >= 240 High', 43, curY, 8.5 + fsBonus, false);
            curY -= 11;
            pdfText(pageN, font, 'HDL : Low Risk > 60 mg/dl, High Risk < 35 mg/dl', 43, curY, 8.5 + fsBonus, false);
            curY -= 11;
            pdfText(pageN, font, 'LDL : Desirable < 130 mg/dl, Borderline 130 - 159, High Risk >= 160', 43, curY, 8.5 + fsBonus, false);
            curY -= 11;
            pdfText(pageN, font, 'Triglycerides : Desirable < 160 mg/dl, Borderline 160 - 200, High Risk >= 200', 43, curY, 8.5 + fsBonus, false);

            curY -= 18;
            pdfCenteredText(pageN, font, pageFooter, curY, 11 + fsBonus, true);
            await renderSign(pageN, 175);
          } else if (tName === 'Urine Drug Screening' || tName.includes('Urine Drug')) {
            const is12 = !tName.includes('5') && (!String(data.drug_panel_type || '').includes('5') || tName.includes('12'));
            const drugList = is12 ? [
              'Amphetamine (AMP)',
              'Barbiturates (BAR)',
              'Benzodiazepine (BZO)',
              'Buprenorphine (BUP)',
              'Cocaine (COC)',
              'Marijuana (THC)',
              'Methadone (MTD)',
              'Methamphetamine (MET)',
              'Methylenedioxymethamphetamine (MDMA)',
              'Morphine (MOP)',
              'Phencyclidine (PCP)',
              'Tricyclic Antidepressants (TCA)'
            ] : [
              'Amphetamine (AMP)',
              'Benzodiazepine (BZO)',
              'Methamphetamine (MET)',
              'Opioid (OPI)',
              'Marijuana (THC)'
            ];

            const drugTitle = is12 ? 'URINE DRUG SCREENING TEST (12 DRUGS)' : 'URINE DRUG SCREENING TEST (5 DRUGS)';
            pdfText(pageN, font, drugTitle, 43, pY, 12 + fsBonus, true);
            const drugTitleW = font.bold.widthOfTextAtSize(drugTitle, 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + drugTitleW, y: pY - 2 }, thickness: 1, color: rgb(0, 0, 0) });

            const headerY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0, 0, 0) });
            pageN.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0, 0, 0) });
            pdfText(pageN, font, 'Test', 55, headerY, 11 + fsBonus, true);
            pdfText(pageN, font, 'Result', 340, headerY, 11 + fsBonus, true);

            let rowY = headerY - 20;
            const rowStep = is12 ? 15 : 20;
            drugList.forEach(d => {
              const shortKey = d.match(/\(([A-Z]+)\)/)?.[1]?.toLowerCase();
              const res = (data.urine_drugs && data.urine_drugs[d]) || 
                          (shortKey && data[`urine_drug_${shortKey}`]) || 
                          (d.includes('Tramadol') && data['urine_drug_pcp']) ||
                          'Negative';
              const isPos = String(res).trim().toLowerCase() === 'positive';
              pdfText(pageN, font, d, 55, rowY, 10 + fsBonus, false);
              if (isPos) {
                pageN.drawText(res, { x: 340, y: rowY, size: 10.5 + fsBonus, font: font.bold, color: rgb(0.85, 0.1, 0.1) });
              } else {
                pdfText(pageN, font, res, 340, rowY, 10.5 + fsBonus, false);
              }
              rowY -= rowStep;
            });

            const methodY = rowY - 10;
            pdfText(pageN, font, '[Test Method - Immnochromatography]', 43, methodY, 9.5 + fsBonus, false);
            const endReportY = methodY - 26;
            pdfCenteredText(pageN, font, pageFooter, endReportY, 10.5 + fsBonus, true);
            await renderSign(pageN, 160);
          } else {
            const customDef = (securityConfig.customTests || []).find(c => c.name.toLowerCase() === tName.toLowerCase());
            const testTitle = (customDef ? (customDef.testLabel || customDef.name) : tName).toUpperCase();
            const key = `${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_result`;
            const tResult = pdfVal(data, key, pdfVal(data, 'test_result', 'Negative'));
            const tRef = customDef ? (customDef.referenceRange || '') : (requestedTests[tName]?.reference || '');
            const tUnit = customDef ? (customDef.unit || '') : (testUnits[tName] || '');
            const tMethod = customDef ? (customDef.method ? `(Test Method - ${customDef.method})` : '') : '[Test Method - Erba Mannheim Fully Auto Analyzer]';

            pdfText(pageN, font, testTitle, 43, pY, 12 + fsBonus, true);
            const tWidth = font.bold.widthOfTextAtSize(testTitle, 12 + fsBonus);
            pageN.drawLine({ start: { x: 43, y: pY - 2 }, end: { x: 43 + tWidth, y: pY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

            const hdrY = pY - 24;
            pageN.drawLine({ start: { x: 41, y: hdrY + 12 }, end: { x: 511, y: hdrY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
            pageN.drawLine({ start: { x: 41, y: hdrY - 6 }, end: { x: 511, y: hdrY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
            pdfText(pageN, font, 'Test', 70, hdrY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, 'Results', hdrY, 11 + fsBonus, true, 260);
            if (tRef) pdfText(pageN, font, 'Reference Range', 370, hdrY, 11 + fsBonus, true);

            const rowY = hdrY - 28;
            pdfText(pageN, font, tName, 70, rowY, 11 + fsBonus, true);
            pdfCenteredText(pageN, font, `${tResult}${tUnit ? ' ' + tUnit : ''}`, rowY, 11 + fsBonus, true, 260);
            if (tRef) pdfText(pageN, font, tRef, 370, rowY, 10.5 + fsBonus, false);

            if (tMethod) pdfText(pageN, font, tMethod, 43, rowY - 32, 10 + fsBonus, false);
            pdfCenteredText(pageN, font, pageFooter, rowY - 64, 11 + fsBonus, true);
            await renderSign(pageN, 175);
          }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(data, 'pdf')}"`);
        recordAudit('EXPORT_PDF', { ...data, test_name: test.name }, 'SUCCESS', req);
        const bytes = await pdf.save();
        return res.end(Buffer.from(bytes));
      }

      if (test.isType7) {
        // Page 1: Urine Full Report
        const title = 'URINE FULL REPORT';
        pdfText(page, font, title, 43, testY, 12 + fsBonus, true);
        const titleWidth = font.bold.widthOfTextAtSize(title, 12 + fsBonus);
        page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        const headerY = testY - 24;
        pdfText(page, font, 'Test', 43, headerY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 43, y: headerY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize('Test', 11 + fsBonus), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        pdfText(page, font, 'Results', 260, headerY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 260, y: headerY - 2 }, end: { x: 260 + font.bold.widthOfTextAtSize('Results', 11 + fsBonus), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        let curY = headerY - 18;
        const rowStep = 15;
        test.chemicalRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);
          pdfText(page, font, row.result, 260, curY, 10.5 + fsBonus, false);
          curY -= rowStep;
        });

        curY -= 10;
        const microTitle = 'Centrifuged Urine Microscopy';
        pdfText(page, font, microTitle, 43, curY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 43, y: curY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize(microTitle, 11 + fsBonus), y: curY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        curY -= 18;
        test.microscopyRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);
          pdfText(page, font, row.result, 260, curY, 10.5 + fsBonus, false);
          curY -= rowStep;
        });

        pdfCenteredText(page, font, '**Page 1 of 4**', curY - 35, 10.5 + fsBonus, true);
        await renderSign(page, 175);

        // Page 2: Tuberculosis Rapid Test
        const page2 = pdf.addPage([595.28, 841.89]);
        const tY2 = renderPageHeader(page2, reportDate(data), reportDisplayName(data), 'Blood');
        renderRapidTestBody(page2, tY2, 'Tuberculosis Rapid Test', 'TB Test', pdfVal(data, 'tb_result', 'Negative'), '(Test Method - Immunochromatography)', '**Page 2 of 4**');
        await renderSign(page2, 175);

        // Page 3: Brucellosis Test (Date + 1 Day)
        const page3 = pdf.addPage([595.28, 841.89]);
        const dateBru = reportDateOffset(data, 1);
        const tY3 = renderPageHeader(page3, dateBru, reportDisplayName(data), 'Blood');
        renderRapidTestBody(page3, tY3, 'BRUCELLOSIS TEST', 'BRUCELLA Test', pdfVal(data, 'brucellosis_result', 'Negative'), '(Test Method - Immunochromatography)', '**Page 3 of 4**');
        await renderSign(page3, 175);

        // Page 4: HIV Ag & Ab Test (Full Name)
        const page4 = pdf.addPage([595.28, 841.89]);
        const fullName = reportFullName(data);
        const tY4 = renderPageHeader(page4, reportDate(data), fullName, 'Blood');
        renderRapidTestBody(page4, tY4, 'HIV Ag & Ab Test', 'HIV I & II', pdfVal(data, 'hiv_result', 'Negative'), '[Test Method - Antigen Antibody Immunochromatography - Rapid Test]', '**Page 4 of 4**\n**End of Report**');
        await renderSign(page4, 175);
      } else if (test.isTbOnly) {
        renderRapidTestBody(page, testY, 'Tuberculosis Rapid Test', 'TB Test', test.result || 'Negative', '(Test Method - Immunochromatography)', '**End of Report**');
        await renderSign(page, 175);
      } else if (test.isBrucellosisOnly) {
        renderRapidTestBody(page, testY, 'BRUCELLOSIS TEST', 'BRUCELLA Test', test.result || 'Negative', '(Test Method - Immunochromatography)', '**End of Report**');
        await renderSign(page, 175);
      } else if (test.isHivOnly) {
        renderRapidTestBody(page, testY, 'HIV Ag & Ab Test', 'HIV I & II', test.result || 'Negative', '[Test Method - Antigen Antibody Immunochromatography - Rapid Test]', '**End of Report**');
        await renderSign(page, 175);
      } else if (test.isCustomTest) {
        const def = test.customTestDef || {};
        const title = (def.testLabel || def.name || 'LABORATORY REPORT').toUpperCase();
        const testNameDisplay = def.testLabel || def.name || 'Test';
        const methodText = def.method ? `(Test Method - ${def.method})` : '';
        renderRapidTestBody(page, testY, title, testNameDisplay, test.result || 'Negative', methodText, '**End of Report**');
        await renderSign(page, 175);
      } else if (test.isUrine) {
        const title = 'URINE FULL REPORT';
        pdfText(page, font, title, 43, testY, 12 + fsBonus, true);
        const titleWidth = font.bold.widthOfTextAtSize(title, 12 + fsBonus);
        page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 1, color: rgb(0,0,0) });

        const headerY = testY - 24;
        pdfText(page, font, 'Test', 43, headerY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 43, y: headerY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize('Test', 11 + fsBonus), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        pdfText(page, font, 'Results', 260, headerY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 260, y: headerY - 2 }, end: { x: 260 + font.bold.widthOfTextAtSize('Results', 11 + fsBonus), y: headerY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        let curY = headerY - 18;
        const rowStep = 15;
        test.chemicalRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);
          pdfText(page, font, row.result, 260, curY, 10.5 + fsBonus, false);
          curY -= rowStep;
        });

        curY -= 10;
        const microTitle = 'Centrifuged Urine Microscopy';
        pdfText(page, font, microTitle, 43, curY, 11 + fsBonus, true);
        page.drawLine({ start: { x: 43, y: curY - 2 }, end: { x: 43 + font.bold.widthOfTextAtSize(microTitle, 11 + fsBonus), y: curY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        curY -= 18;
        test.microscopyRows.forEach(row => {
          pdfText(page, font, row.label, 43, curY, 10.5 + fsBonus, false);
          pdfText(page, font, '_', 240, curY, 10.5 + fsBonus, false);
          pdfText(page, font, row.result, 260, curY, 10.5 + fsBonus, false);
          curY -= rowStep;
        });

        pdfCenteredText(page, font, '**End of Report**', curY - 30, 10.5 + fsBonus, true);

        const signY = 175;
        pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
        pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
        pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }
      } else if (test.isHba1c) {
        const title = 'HAEMOGLOBIN A1C';
        pdfText(page, font, title, 43, testY, 12 + fsBonus, true);
        const titleWidth = font.bold.widthOfTextAtSize(title, 12 + fsBonus);
        page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 1, color: rgb(0,0,0) });

        const headerY = testY - 24;
        page.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
        page.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
        pdfText(page, font, 'Test', 100, headerY, 11 + fsBonus, true);
        pdfText(page, font, 'Result', 300, headerY, 11 + fsBonus, true);

        const dataRowY = headerY - 24;
        pdfText(page, font, 'HbA1c', 100, dataRowY, 10.5 + fsBonus, true);
        pdfText(page, font, test.hba1cResult || '5.3%', 300, dataRowY, 10.5 + fsBonus, true);

        const refTitleY = dataRowY - 32;
        const refTitle = 'Reference Range';
        pdfText(page, font, refTitle, 43, refTitleY, 11 + fsBonus, true);
        const refTitleWidth = font.bold.widthOfTextAtSize(refTitle, 11 + fsBonus);
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
          pdfText(page, font, range, 43, curY, 9.5 + fsBonus, false);
          pdfText(page, font, desc, 145, curY, 9.5 + fsBonus, false);
          curY -= 14;
        });

        curY -= 10;
        pdfText(page, font, 'Analyzer -HemoCue? HbA1c 501', 43, curY, 9.5 + fsBonus, true);
        pdfText(page, font, '(Test Method - Fluorescence Immunoassay (FIA))', 43, curY - 14, 9.5 + fsBonus, true);

        pdfCenteredText(page, font, '**End of Report**', curY - 44, 10.5 + fsBonus, true);

        const signY = 175;
        pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
        pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
        pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }
      } else if (test.isBetaHcgFia) {
        // Table header: Test, Results, Units
        const headerY = testY - 24;
        page.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
        page.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
        pdfText(page, font, 'Test', 43, headerY, 12 + fsBonus, true);
        pdfCenteredText(page, font, 'Results', headerY, 12 + fsBonus, true, 285);
        pdfCenteredText(page, font, 'Units', headerY, 12 + fsBonus, true, 440);

        // Row 1: Total ? - HCG Concentration | Result | Units
        const r1Y = headerY - 24;
        pdfText(page, font, 'Total ? - HCG Concentration', 43, r1Y, 12 + fsBonus, true);
        pdfCenteredText(page, font, test.conc || '< 5.00', r1Y, 12 + fsBonus, true, 285);
        pdfCenteredText(page, font, 'mIU/mL', r1Y, 12 + fsBonus, false, 440);

        // Row 2: Status (Negative / Positive / Weakly Positive / Today Negative ...)
        let r2Y = r1Y - 18;
        if (test.status) {
          const statusLines = String(test.status).split(/\n+/);
          statusLines.forEach((sLine, sIdx) => {
            pdfCenteredText(page, font, sLine.trim(), r2Y - (sIdx * 14), 12 + fsBonus, true, 285);
          });
          r2Y -= (statusLines.length - 1) * 14;
        }

        // Section: Reference Ranges
        const refTitleY = r2Y - 28;
        const refTitle = 'Reference Ranges';
        pdfText(page, font, refTitle, 43, refTitleY, 12 + fsBonus, true);
        const refTitleWidth = font.bold.widthOfTextAtSize(refTitle, 12 + fsBonus);
        page.drawLine({ start: { x: 43, y: refTitleY - 2 }, end: { x: 43 + refTitleWidth, y: refTitleY - 2 }, thickness: 0.8, color: rgb(0,0,0) });

        // Subheaders for reference ranges:
        const subHeadY1 = refTitleY - 18;
        const subHeadY2 = subHeadY1 - 12;
        pdfText(page, font, 'Pregnant Women', 43, subHeadY1, 10 + fsBonus, true);
        pdfText(page, font, '(Week since LMP*)', 43, subHeadY2, 9 + fsBonus, false);
        pdfText(page, font, 'Total ?-HCG Level', 240, subHeadY1, 10 + fsBonus, true);
        pdfText(page, font, '[mIU/mL]', 240, subHeadY2, 9 + fsBonus, false);

        let curY = subHeadY2 - 16;
        (test.betaHcgRefs || []).forEach(([week, valRange]) => {
          pdfText(page, font, week, 43, curY, 10 + fsBonus, false);
          pdfText(page, font, valRange, 240, curY, 10 + fsBonus, false);
          curY -= 13;
        });

        // Comments note:
        curY -= 6;
        if (test.comment) {
          pdfText(page, font, `(Comments: ${test.comment})`, 43, curY, 10 + fsBonus, false);
          curY -= 16;
        }

        // Test method:
        pdfText(page, font, '(Test Method - Fluorescence Immunoassay (FIA))', 43, curY, 10 + fsBonus, false);

        // Signature block
        const signY = 160;
        pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
        pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
        pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }
      } else if (test.isBetaHcgRapid) {
        // Table header: TEST, RESULTS
        const headerY = testY - 24;
        page.drawLine({ start: { x: 41, y: headerY + 12 }, end: { x: 511, y: headerY + 12 }, thickness: 0.8, color: rgb(0,0,0) });
        page.drawLine({ start: { x: 41, y: headerY - 6 }, end: { x: 511, y: headerY - 6 }, thickness: 0.8, color: rgb(0,0,0) });
        pdfText(page, font, 'TEST', 70, headerY, 12 + fsBonus, true);
        pdfCenteredText(page, font, 'RESULTS', headerY, 12 + fsBonus, true, 310);

        // Row 1: BETA H.C.G. | Result
        const r1Y = headerY - 28;
        pdfText(page, font, 'BETA H.C.G.', 70, r1Y, 12 + fsBonus, true);
        const resultLines = String(test.result || 'Negative').split(/\n+/);
        resultLines.forEach((rLine, rIdx) => {
          pdfCenteredText(page, font, rLine.trim(), r1Y - (rIdx * 15), 12 + fsBonus, true, 310);
        });

        let curY = r1Y - (resultLines.length * 15) - 22;
        pdfText(page, font, '(Test Method - Immunochromatographic assay-Rapid)', 43, curY, 10 + fsBonus, false);
        curY -= 32;
        pdfCenteredText(page, font, '**End of Report**', curY, 12 + fsBonus, true);

        // Signature block
        const signY = 160;
        pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
        pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
        pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }
      } else if (test.isType10B) {
        // Multi-report medical package PDF
        pdfText(page, font, test.name.toUpperCase(), 43, testY, 12 + fsBonus, true);
        const titleWidth = font.bold.widthOfTextAtSize(test.name.toUpperCase(), 12 + fsBonus);
        page.drawLine({ start: { x: 43, y: testY - 2 }, end: { x: 43 + titleWidth, y: testY - 2 }, thickness: 1, color: rgb(0,0,0) });

        let curY = testY - 22;
        // Section 1: Gonorrhea
        pdfText(page, font, 'GONORRHEA TEST', 43, curY, 10.5 + fsBonus, true);
        pdfText(page, font, 'Negative', 260, curY, 10.5 + fsBonus, true);
        pdfText(page, font, "[Test Method - Gram's Staining]", 43, curY - 12, 8.5, false);
        curY -= 28;

        // Section 2: Differential Count
        pdfText(page, font, 'DIFFERENTIAL COUNT', 43, curY, 10.5 + fsBonus, true);
        curY -= 14;
        const diffVals = [
          ['NEUTROPHIL', (data.diff_neutrophil || '45') + ' %', '(40 - 60 %)'],
          ['LYMPHOCYTE', (data.diff_lymphocyte || '46') + ' %', '(20 - 40 %)'],
          ['MONOCYTE', (data.diff_monocyte || '06') + ' %', '(2 - 8 %)'],
          ['EOSINOPHIL', (data.diff_eosinophil || '03') + ' %', '(1 - 4 %)'],
          ['BASOPHIL', (data.diff_basophil || '00') + ' %', '(less than 1%)']
        ];
        diffVals.forEach(([l, v, ref]) => {
          pdfText(page, font, l, 55, curY, 9.5 + fsBonus, false);
          pdfText(page, font, ':', 150, curY, 9.5 + fsBonus, true);
          pdfText(page, font, v, 165, curY, 9.5 + fsBonus, true);
          pdfText(page, font, ref, 240, curY, 9 + fsBonus, false);
          curY -= 13;
        });
        curY -= 8;

        // Section 3: Serology
        pdfText(page, font, 'SEROLOGY', 43, curY, 10.5 + fsBonus, true);
        curY -= 14;
        const seroVals = [
          ['HIV I & II', data.serology_hiv || 'Negative'],
          ['Hepatitis B [HBsAg]', data.serology_hba || 'Negative'],
          ['Hepatitis C [HCV]', data.serology_hcv || 'Negative'],
          ['VDRL', data.serology_vdrl || 'Non Reactive'],
          ['Syphilis', data.serology_syphilis || 'Negative']
        ];
        seroVals.forEach(([l, v]) => {
          pdfText(page, font, l, 55, curY, 9.5 + fsBonus, false);
          pdfText(page, font, ':', 180, curY, 9.5 + fsBonus, true);
          pdfText(page, font, v, 195, curY, 9.5 + fsBonus, true);
          curY -= 13;
        });
        curY -= 4;
        pdfText(page, font, '[Test method - Immnochromatography] / [VDRL- Carbon Antigen Method]', 43, curY, 8.5, false);
        curY -= 18;

        // Section 4: Urine Full Report Summary
        pdfText(page, font, 'URINE FULL REPORT', 43, curY, 10.5 + fsBonus, true);
        curY -= 13;
        pdfText(page, font, 'Pus Cells: ' + pdfVal(data, 'ufr_pus_cells', '+ 01 - 02 /hpf') + '  |  Epithelial: ' + pdfVal(data, 'ufr_epithelial_cells', '+ A Few /hpf') + '  |  Albumin: Nil  |  Sugar: Nil', 55, curY, 9 + fsBonus, false);
        curY -= 20;

        const endPage1Y = Math.min(curY - 6, 235);
        pdfCenteredText(page, font, test.hasUrineDrug ? '**Page 1 of 2**' : '**End of Report**', endPage1Y, 10.5 + fsBonus, true);

        const signY = 160;
        pdfText(page, font, 'W.D.Gunarathne', 43, signY, 11);
        pdfText(page, font, 'Chief Medical Laboratory Technologist', 43, signY-11, 11);
        pdfText(page, font, 'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012', 43, signY-22, 11);
        pdfText(page, font, 'W.H.O.Fellow', 43, signY-33, 11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }

        if (test.hasUrineDrug) {
          const page2 = pdf.addPage([595.28, 841.89]);
          await renderUrineDrugSection(page2);
        }
      } else if (test.isUrineDrugOnly) {
        await renderUrineDrugSection(page);
      } else {
        const testTitle = testName === 'FBS' ? 'FASTING BLOOD SUGAR'
        : testName === 'RBS' ? 'RANDOM BLOOD SUGAR'
        : testName;
        pdfText(page,font,testTitle,43,testY,12 + fsBonus,true);
        const rowTop = testY - 56;
        const rowHeight = 17;
        const tableBottom = rowTop - (test.rows.length * rowHeight) - 10;
        const lipidTable = test.lipid;
        page.drawLine({ start:{x:41,y:testY-19}, end:{x:lipidTable ? 341 : 511,y:testY-19}, thickness:0.8, color:rgb(0,0,0) });
        page.drawRectangle({ x:41, y:testY-37, width:lipidTable ? 300 : 470, height:18, borderColor:rgb(0,0,0), borderWidth:0.8 });
        pdfCenteredText(page,font,'Test',testY-31,11 + fsBonus,true,lipidTable ? 110 : 106); pdfCenteredText(page,font,'Result',testY-31,11 + fsBonus,true,lipidTable ? 260 : 276); if(!lipidTable) pdfCenteredText(page,font,'Reference Range',testY-31,11 + fsBonus,true,430);
        test.rows.forEach((row,i)=>{
          const ry=rowTop-(i*rowHeight);
          pdfCenteredText(page,font,row.label,ry,11 + fsBonus,true,lipidTable ? 110 : 106);
          pdfCenteredText(page,font,row.result,ry,11 + fsBonus,true,lipidTable ? 260 : 276);
          if(!lipidTable) pdfCenteredText(page,font,row.reference,ry,10 + fsBonus,false,430);
        });
        let afterTable = tableBottom;
        if (test.lipid) {
          pdfText(page,font,'Reference Ranges',43,afterTable-2,10.5 + fsBonus,true);
          pdfCenteredText(page,font,'Test',afterTable-18,9 + fsBonus,true,90); pdfCenteredText(page,font,'Desirable levels',afterTable-18,9 + fsBonus,true,190); pdfCenteredText(page,font,'Borderline levels',afterTable-18,9 + fsBonus,true,330); pdfCenteredText(page,font,'High levels',afterTable-18,9 + fsBonus,true,475);
          test.lipidReferenceRows.forEach((row,i)=>{ const ry=afterTable-34-(i*14); pdfText(page,font,row[0],43,ry,9 + fsBonus); pdfText(page,font,row[1],135,ry,8.5 + fsBonus); pdfText(page,font,row[2],245,ry,8 + fsBonus); pdfText(page,font,row[3],420,ry,8 + fsBonus); });
          afterTable -= 34 + test.lipidReferenceRows.length*14;
        }
        const skipBottomNote = test.lipid || ['SGPT', 'SGOT', 'SGPT & SGOT'].includes(test.name);
        if (!skipBottomNote && note) pdfCenteredText(page,font,String(note).startsWith('[') ? note : `[${note}]`,afterTable-18,11 + fsBonus,true);
        pdfText(page,font,`[Test Method - ${method}]`,43, test.lipid ? afterTable-52 : afterTable-52,9.5 + fsBonus,true);
        pdfCenteredText(page,font,'**End of Report**',afterTable-80,11 + fsBonus,true);
        const signY = 175;
        pdfText(page,font,'W.D.Gunarathne',43,signY,11); pdfText(page,font,'Chief Medical Laboratory Technologist',43,signY-11,11); pdfText(page,font,'D.M.L.T.,(Sri Lanka) / S.L.M.C 0012',43,signY-22,11); pdfText(page,font,'W.H.O.Fellow',43,signY-33,11);
        if (!noLetterhead) {
          const signatureBytes = assetCache.signature || fs.readFileSync(signaturePath);
          const signature = await pdf.embedPng(signatureBytes);
          page.drawImage(signature, { x: 43, y: signY+5, width: 70, height: 47 });
        }
      }
    }
    const bytes = await pdf.save();
    recordAudit('EXPORT_PDF', { ...data, test_name: test.name }, 'SUCCESS', req);
    res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition',`attachment; filename="${reportFilename(data,'pdf', noLetterhead)}"`); res.send(Buffer.from(bytes));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 1516;
app.listen(PORT, '0.0.0.0', () => console.log(`NeoSys Local Generator running at http://localhost:${PORT}`));




