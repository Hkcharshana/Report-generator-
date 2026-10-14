(() => {
  const APP = 'http://localhost:1516';
  if (window.__neosysBridgeRunning) { alert('NeoSys bridge is already running on this page.'); return; }
  window.__neosysBridgeRunning = true;
  const badge = document.createElement('div'); badge.id='__neosys_bridge_badge';
  Object.assign(badge.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:2147483647,background:'#103b46',color:'#fff',padding:'10px 14px',borderRadius:'8px',font:'12px Arial',boxShadow:'0 4px 18px #0005'});
  badge.textContent='NeoSys bridge connected'; document.body.appendChild(badge);
  const clean=v=>String(v??'').trim();
  const toRecord=p=>({
    ref_no: clean(p.ref_no),
    passport_no: clean(p.passport_no),
    fname: clean(p.fname),
    lname: clean(p.lname),
    gender: clean(p.gender),
    agency: clean(p.agency_name||p.agency),
    agency_name: clean(p.agency_name||p.agency),
    country_name: clean(p.country_name||p.country),
    medical_date: clean(p.reg_date||p.medical_date),
    reg_date: clean(p.reg_date||p.medical_date),
    specimen: 'Blood',
    report_time: new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),
    age: clean(p.age),
    dob: clean(p.dob),
    marital_status: clean(p.marital_status),
    telephone: clean(p.telephone),
    position: clean(p.position),
    agency_refno: clean(p.agency_refno),
    gcc_no: clean(p.gcc_no),
    height: clean(p.height),
    weight: clean(p.weight),
    general_note: clean(p.general_note),
    patient_status_note: clean(p.patient_status_note),
    lab_note: clean(p.lab_note),
    photo: p.pic ? `https://neosys.lk/sys/upload/patient/photo/${p.pic}` : '',
    // Lab test values:
    fbs: clean(p.fbs || p.rbs),
    rbs: clean(p.rbs),
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
    phosphatase: clean(p.phosphatase)
  });
  async function tick(){
    try{
      await fetch(`${APP}/api/bridge/heartbeat`,{method:'POST'});
      const pending=await fetch(`${APP}/api/bridge/pending`,{cache:'no-store'}).then(r=>r.json());
      const ref=clean(pending.ref);
      if(!ref)return;
      badge.textContent=`NeoSys bridge: searching ${ref}...`;
      const body=new URLSearchParams({search:ref,type:'patient_doctor_report'});
      const result=await fetch('/sys/find',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body}).then(r=>r.json());
      const rows=Array.isArray(result.data)?result.data:[];
      const exact=rows.filter(p=>clean(p.ref_no).toLowerCase()===ref.toLowerCase()||clean(p.passport_no).toLowerCase()===ref.toLowerCase());
      const selected=exact.length?exact:rows;
      const records=selected.map(toRecord).filter(p=>p.ref_no);
      if(!records.length)throw Error('Reference not found in NeoSys');
      await fetch(`${APP}/api/bridge/push`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref,records})});
      badge.textContent=`NeoSys bridge: ${records.length} result${records.length===1?'':'s'} loaded`;
      setTimeout(()=>badge.textContent='NeoSys bridge connected',2500);
    }catch(e){
      badge.textContent=`NeoSys bridge: ${e.message||'search error'}`;
    }
  }
  tick(); setInterval(tick,1200);
})();
