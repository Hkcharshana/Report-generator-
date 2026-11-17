const fs = require('fs');

const shippingNavTab = `<a href="#shipping" id="navShipping"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:7px;"><path d="M2 21h20M2 17h20M4 17l2-10h12l2 10M12 7V3M9 3h6"/></svg><span>Shipping</span></a>`;

const shippingReportTypeOption = `<option value="Shipping">Shipping (Type 12 - 1: 14 Reports Medical Package)</option>`;

const shippingResultsHtml = `
            <!-- Shipping Medical Package (Type 12 - 1: 14 Reports) -->
            <div id="shippingResults" class="type10b-inputs" hidden>
              <div class="colombo-package-card" style="border: 2px solid #0284c7; background: #f0f9ff; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #bae6fd; padding-bottom: 8px;">
                  <div>
                    <h4 style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 800;">
                      🚢 Shipping Medical Package (Type 12 - 1 • 14 Reports)
                    </h4>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #0284c7;">
                      Pre-employment Medical Examination Package for Seafarers &amp; Marine Shipping Crews (ILO / MLC Standard).
                    </p>
                  </div>
                  <span class="fbc-badge" style="background: #0284c7; color: #fff; font-weight: 700; padding: 4px 10px; border-radius: 6px;">14 Sheets Multi-Excel</span>
                </div>

                <div class="package-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                  <!-- 1. Blood Alcohol -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">1. Blood Alcohol Test</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_blood_alcohol">Result</label>
                      <input id="shipping_blood_alcohol" name="shipping_blood_alcohol" value="Not Detected">
                      <span class="field-hint">Specimen: Blood</span>
                    </div>
                  </div>

                  <!-- 2. CRP -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">2. C-reactive protein (CRP)</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_crp">Result (mg/dL)</label>
                      <input id="shipping_crp" name="shipping_crp" value="< 06 mg/dL">
                      <span class="field-hint">Ref: &lt;06 mg/dL • Latex Agglutination</span>
                    </div>
                  </div>

                  <!-- 3. ESR -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">3. ESR</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_esr">Result (mm/1hr)</label>
                      <input id="shipping_esr" name="shipping_esr" value="03 mm/1hr">
                      <span class="field-hint">Westregren Method</span>
                    </div>
                  </div>

                  <!-- 4. FBS -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">4. Fasting Blood Sugar</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_fbs">Result (mg/dl)</label>
                      <input id="shipping_fbs" name="shipping_fbs" value="76 mg/dl">
                      <span class="field-hint">Ref: 74 - 115 mg/dl</span>
                    </div>
                  </div>

                  <!-- 5. Creatinine & eGFR -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">5. S.Creatinine &amp; eGFR</span>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
                      <div class="field">
                        <label for="shipping_creatinine">Creatinine</label>
                        <input id="shipping_creatinine" name="shipping_creatinine" value="1.2 mg/dL">
                      </div>
                      <div class="field">
                        <label for="shipping_egfr">eGFR</label>
                        <input id="shipping_egfr" name="shipping_egfr" value="83 ml/min/1.73m2">
                      </div>
                    </div>
                    <span class="field-hint">Ref: 0.6 - 1.3 mg/dL</span>
                  </div>

                  <!-- 6. Serology (Syphilis & VDRL) -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">6. Serology (Syphilis &amp; VDRL)</span>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
                      <div class="field">
                        <label for="shipping_syphilis">Syphilis</label>
                        <select id="shipping_syphilis" name="shipping_syphilis">
                          <option value="Negative" selected>Negative</option>
                          <option value="Positive">Positive</option>
                        </select>
                      </div>
                      <div class="field">
                        <label for="shipping_vdrl">VDRL</label>
                        <select id="shipping_vdrl" name="shipping_vdrl">
                          <option value="Non Reactive" selected>Non Reactive</option>
                          <option value="Reactive">Reactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- 7. Total Cholesterol -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">7. Total Cholesterol</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_cholesterol">Result (mg/dl)</label>
                      <input id="shipping_cholesterol" name="shipping_cholesterol" value="228 mg/dl">
                      <span class="field-hint">Ref: &lt;240 mg/dl</span>
                    </div>
                  </div>

                  <!-- 8. SGPT & SGOT -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">8. Blood for SGPT &amp; SGOT</span>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
                      <div class="field">
                        <label for="shipping_sgpt">SGPT (iu/l)</label>
                        <input id="shipping_sgpt" name="shipping_sgpt" value="26 iu/l">
                      </div>
                      <div class="field">
                        <label for="shipping_sgot">SGOT (iu/l)</label>
                        <input id="shipping_sgot" name="shipping_sgot" value="30 iu/l">
                      </div>
                    </div>
                  </div>

                  <!-- 9. Urine Full Report -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">9. Urine Full Report (UFR)</span>
                    <div style="margin-top:6px; font-size:12px; line-height:1.5; color:#334155;">
                      <div>Sugar: <b>Nil</b> • Albumin: <b>Nil</b></div>
                      <div>Pus Cells: <b>+ 01 - 02 / hpf</b> • Epi: <b>+ A few / hpf</b></div>
                      <span class="field-hint">Auto-synced with UFR form parameters</span>
                    </div>
                  </div>

                  <!-- 10. Urine Drug Screening (12 Drugs) -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">10. Urine Drug (12-Para Panel)</span>
                    <div style="margin-top:6px; font-size:12px; line-height:1.5; color:#059669; font-weight:700;">
                      ✓ All 12 Parameters Negative
                    </div>
                    <span class="field-hint">AMP, BAR, BZO, BUP, COC, THC, MTD, MET, MDMA, MOP, PCP, TCA</span>
                  </div>

                  <!-- 11. HbA1c -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">11. Haemoglobin A1C</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_hba1c">HbA1c (%)</label>
                      <input id="shipping_hba1c" name="shipping_hba1c" value="5.1%">
                      <span class="field-hint">Ref: &lt;6.0% Normal • Ichroma II FIA</span>
                    </div>
                  </div>

                  <!-- 12. HCV -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">12. Hepatitis C [HCV]</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_hcv">Result</label>
                      <select id="shipping_hcv" name="shipping_hcv">
                        <option value="Negative" selected>Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      <span class="field-hint">Immnochromatography</span>
                    </div>
                  </div>

                  <!-- 13. HBsAg -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">13. Hepatitis B [HBsAg]</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_hbsag">Result</label>
                      <select id="shipping_hbsag" name="shipping_hbsag">
                        <option value="Negative" selected>Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      <span class="field-hint">Immnochromatography</span>
                    </div>
                  </div>

                  <!-- 14. HIV Test -->
                  <div class="fbc-group-card" style="background:#fff; border:1px solid #e0f2fe; border-radius:8px; padding:10px;">
                    <span class="fbc-badge" style="background:#e0f2fe; color:#0369a1;">14. HIV I &amp; II Test</span>
                    <div class="field" style="margin-top:6px;">
                      <label for="shipping_hiv">Result</label>
                      <select id="shipping_hiv" name="shipping_hiv">
                        <option value="Negative" selected>Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      <span class="field-hint">Immunochromatography</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>`;

const shippingPreviewHtml = `
            <!-- Shipping Package Preview Container -->
            <div id="shippingPreviewContainer" class="type10b-report-preview" hidden>
              <div class="fbc-status-banner" style="display:flex; justify-content:space-between; align-items:center; background:#f0f9ff; border:1px solid #bae6fd; color:#0369a1; padding:12px 16px; border-radius:8px; margin-bottom:14px;">
                <span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M2 21h20M2 17h20M4 17l2-10h12l2 10M12 7V3M9 3h6"/></svg>
                  <strong>Shipping Medical Package (Type 12 - 1)</strong> &mdash; 14 test reports bundled into multi-sheet Excel &amp; PDF.
                </span>
                <button type="button" class="btn primary btn-xs" onclick="document.getElementById('excelBtn').click()" style="padding:6px 14px; font-weight:700;">&#8595; Download 14-Sheet Excel</button>
              </div>
              <div class="type10b-preview-grid" id="shippingPrevGrid">
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">1. Blood Alcohol</span><h4>Alcohol Test</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevAlcohol" style="color:#059669;">Not Detected</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">2. CRP</span><h4>C-reactive protein</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevCrp" style="color:#059669;">&lt; 06 mg/dL</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">3. ESR</span><h4>ESR</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevEsr" style="color:#059669;">03 mm/1hr</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">4. FBS</span><h4>Fasting Blood Sugar</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevFbs" style="color:#059669;">76 mg/dl</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">5. S.Creatinine</span><h4>Creatinine &amp; eGFR</h4></div>
                  <div style="display:flex; justify-content:space-between;"><span>Creatinine:</span> <b id="shipPrevCreatinine">1.2 mg/dL</b></div>
                  <div style="display:flex; justify-content:space-between;"><span>eGFR:</span> <b id="shipPrevEgfr">83 ml/min/1.73m2</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">6. Serology</span><h4>Syphilis &amp; VDRL</h4></div>
                  <div style="display:flex; justify-content:space-between;"><span>Syphilis:</span> <b id="shipPrevSyphilis">Negative</b></div>
                  <div style="display:flex; justify-content:space-between;"><span>VDRL:</span> <b id="shipPrevVdrl">Non Reactive</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">7. Cholesterol</span><h4>Total Cholesterol</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevChol">228 mg/dl</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">8. Liver Enzymes</span><h4>SGPT &amp; SGOT</h4></div>
                  <div style="display:flex; justify-content:space-between;"><span>SGPT:</span> <b id="shipPrevSgpt">26 iu/l</b></div>
                  <div style="display:flex; justify-content:space-between;"><span>SGOT:</span> <b id="shipPrevSgot">30 iu/l</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">9. UFR</span><h4>Urine Full Report</h4></div>
                  <div style="font-size:12px;">Pus: <b>+ 01-02/hpf</b> • Sugar: <b>Nil</b> • Albumin: <b>Nil</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">10. Urine Drug</span><h4>12-Para Drug Panel</h4></div>
                  <div style="color:#059669; font-weight:700; font-size:12px;">✓ 12 Drugs All Negative</div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">11. HbA1c</span><h4>Haemoglobin A1C</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevHba1c" style="color:#059669;">5.1%</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">12. HCV</span><h4>Hepatitis C</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevHcv" style="color:#059669;">Negative</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">13. HBsAg</span><h4>Hepatitis B</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevHbsag" style="color:#059669;">Negative</b></div>
                </div>
                <div class="type10b-preview-card">
                  <div class="type10b-card-header"><span class="type10b-badge">14. HIV</span><h4>HIV I &amp; II</h4></div>
                  <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="shipPrevHiv" style="color:#059669;">Negative</b></div>
                </div>
              </div>
            </div>`;

['public/index.html', 'frontend/index.html'].forEach(f => {
  let s = fs.readFileSync(f, 'utf8');

  // 1. Sidebar tab
  if (!s.includes('id="navShipping"')) {
    s = s.replace(
      '<a href="#test">',
      `${shippingNavTab}\n        <a href="#test">`
    );
  }

  // 2. Report type dropdown option
  if (!s.includes('value="Shipping"')) {
    s = s.replace(
      '<option value="Type 11">Type 11 (Medical Package - 5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid Profile)</option>',
      `<option value="Type 11">Type 11 (Medical Package - 5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid Profile)</option>\n                  <option value="Shipping">Shipping (Type 12 - 1: 14 Reports Medical Package)</option>`
    );
  }

  // 3. Test name dropdown option
  if (!s.includes('<option value="Shipping">Shipping')) {
    s = s.replace(
      '<option value="Type 11">Type 11</option>',
      `<option value="Type 11">Type 11</option>\n                  <option value="Shipping">Shipping (14 Reports Medical Package)</option>`
    );
  }

  // 4. shippingResults inputs
  if (!s.includes('id="shippingResults"')) {
    s = s.replace(
      '<div class="field method">',
      `${shippingResultsHtml}\n\n            <div class="field method">`
    );
  }

  // 5. shippingPreviewContainer
  if (!s.includes('id="shippingPreviewContainer"')) {
    s = s.replace(
      '<div id="customPackagePreviewContainer"',
      `${shippingPreviewHtml}\n\n            <div id="customPackagePreviewContainer"`
    );
  }

  fs.writeFileSync(f, s);
  console.log('Successfully patched', f);
});
