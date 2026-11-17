const sqlite3 = require('sqlite3').verbose();
const dbPath = 'neosys_local.db';
const db = new sqlite3.Database(dbPath);
db.all("SELECT id, ref_no, full_name, passport_no, nic, medical_type_name, package_name, agency, gender, age_years, test_name, created_at FROM patients WHERE ref_no LIKE '%4239%' OR ref_no LIKE '%18176%'", (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});
