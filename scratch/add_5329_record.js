const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const targetMarker = 'const rec5330 = {';
const rec5329Def = `// Colombo Consultancy Reference Patient 5329 (User Sample)
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
    records['5329'] = rec5329;
    records['05329'] = rec5329;
    records['MRD5329'] = rec5329;
    records['MRD05329'] = rec5329;
    recordList.unshift(rec5329);

    const rec5330 = {`;

code = code.replace(targetMarker, rec5329Def);
fs.writeFileSync(serverFile, code, 'utf8');
console.log('Added 5329 patient record successfully!');
