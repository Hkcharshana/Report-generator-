const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'backend', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const target = "referenceRecords['5329'] = rec5329;";
const patient05125 = `// Reference Patient 05125 (Type 10 B with Urine Drug sample)
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

    referenceRecords['5329'] = rec5329;`;

code = code.replace(target, patient05125);
fs.writeFileSync(serverFile, code, 'utf8');
console.log('Added patient record 05125 to server.js!');
