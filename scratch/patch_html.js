const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'frontend', 'index.html')
];

const colomboInputsHtml = `
            <!-- Colombo Consultancy Medical Package Inputs -->
            <div id="colomboResults" class="type10b-inputs" hidden>
              <div class="type10b-toolbar">
                <div class="type10b-toolbar-info">
                  <h4 style="margin:0; font-size:14px; color:#1e293b; font-weight:700;">Colombo Consultancy Medical Package</h4>
                  <p style="margin:2px 0 0; font-size:11.5px; color:#64748b;">5 Reports: Fasting Blood Sugar, SGPT &amp; SGOT, Urine Full Report, Gamma GT, and Lipid Profile.</p>
                </div>
                <div class="type10b-toolbar-actions">
                  <button type="button" class="btn secondary type10b-reset-btn" id="resetColomboBtn">
                    Reset Defaults
                  </button>
                </div>
              </div>

              <!-- Package Contents Pill Bar -->
              <div class="type10b-package-bar">
                <span class="pkg-pill">Sheet 1: Fasting Blood Sugar</span>
                <span class="pkg-pill">Sheet 2: SGPT &amp; SGOT</span>
                <span class="pkg-pill">Sheet 3: Urine Full Report</span>
                <span class="pkg-pill">Sheet 4: Gamma GT</span>
                <span class="pkg-pill">Sheet 5: Lipid Profile</span>
              </div>

              <!-- Biochemistry & Enzymes Group -->
              <div class="fbc-group-card" style="margin-top:14px;">
                <div class="fbc-group-header">
                  <span class="fbc-group-title">Biochemistry &amp; Enzymes</span>
                  <span class="fbc-badge">Blood Specimen</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:10px;">
                  <div class="field">
                    <label for="colombo_fbs">Fasting Blood Sugar (mg/dl)</label>
                    <input id="colombo_fbs" name="colombo_fbs" value="75">
                    <span class="field-hint">Ref: 74 - 115 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_sgpt">SGPT (iu/l)</label>
                    <input id="colombo_sgpt" name="colombo_sgpt" value="10">
                    <span class="field-hint">Ref: Upto 45 (M) / 34 (W)</span>
                  </div>
                  <div class="field">
                    <label for="colombo_sgot">SGOT (iu/l)</label>
                    <input id="colombo_sgot" name="colombo_sgot" value="13">
                    <span class="field-hint">Ref: Upto 35 (M) / 31 (W)</span>
                  </div>
                  <div class="field">
                    <label for="colombo_gamma_gt">Gamma GT (U/L)</label>
                    <input id="colombo_gamma_gt" name="colombo_gamma_gt" value="18">
                    <span class="field-hint">Ref: 5 - 40 U/L</span>
                  </div>
                </div>
              </div>

              <!-- Lipid Profile Group -->
              <div class="fbc-group-card" style="margin-top:14px;">
                <div class="fbc-group-header">
                  <span class="fbc-group-title">Lipid Profile Parameters</span>
                  <span class="fbc-badge">End Point</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:10px;">
                  <div class="field">
                    <label for="colombo_cholesterol">Total Cholesterol</label>
                    <input id="colombo_cholesterol" name="colombo_cholesterol" value="176">
                    <span class="field-hint">&lt; 240 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_hdl">HDL Cholesterol</label>
                    <input id="colombo_hdl" name="colombo_hdl" value="44">
                    <span class="field-hint">35 - 55 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_ldl">LDL Cholesterol</label>
                    <input id="colombo_ldl" name="colombo_ldl" value="112.4">
                    <span class="field-hint">&lt; 130 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_vldl">VLDL Cholesterol</label>
                    <input id="colombo_vldl" name="colombo_vldl" value="19.6">
                    <span class="field-hint">10 - 40 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_triglyceride">Triglyceride</label>
                    <input id="colombo_triglyceride" name="colombo_triglyceride" value="98">
                    <span class="field-hint">&lt; 160 mg/dl</span>
                  </div>
                  <div class="field">
                    <label for="colombo_cho_hdl">CHO / HDL Ratio</label>
                    <input id="colombo_cho_hdl" name="colombo_cho_hdl" value="4">
                    <span class="field-hint">3.3 - 4.4</span>
                  </div>
                </div>
              </div>
            </div>
`;

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let html = fs.readFileSync(f, 'utf8');

  // 1. Add Colombo Consultancy Package to #report_type
  if (!html.includes('value="Colombo Consultancy Package"')) {
    html = html.replace('<option value="Type 7">Type 7 (Russia) - 4 Reports (UFR, TB, Brucellosis, HIV)</option>', `<option value="Type 7">Type 7 (Russia) - 4 Reports (UFR, TB, Brucellosis, HIV)</option>\n                <option value="Colombo Consultancy Package">Colombo Consultancy Package (5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>`);
  }

  // 2. Add Gamma GT to #test_name single options
  if (!html.includes('<option>Gamma GT</option>')) {
    html = html.replace('<option>Full Blood Count</option>', '<option>Full Blood Count</option>\n                <option>Gamma GT</option>');
  }

  // 3. Add #colomboResults inputs card after #type7Results
  if (!html.includes('id="colomboResults"')) {
    const type7CloseIdx = html.indexOf('</div>\n            </div>\n\n            <div class="field method">');
    if (type7CloseIdx !== -1) {
      html = html.slice(0, type7CloseIdx + 19) + colomboInputsHtml + html.slice(type7CloseIdx + 19);
    } else {
      // Alternate placement before field method
      html = html.replace('<div class="field method">', `${colomboInputsHtml}\n            <div class="field method">`);
    }
  }

  // 4. Update drugPanelTypeSelect to ensure instant inline reactivity
  if (!html.includes('onchange="window.syncDrugGrid')) {
    html = html.replace('id="drugPanelTypeSelect" name="drug_panel_type"', 'id="drugPanelTypeSelect" name="drug_panel_type" onchange="window.syncDrugGrid && window.syncDrugGrid(); window.updatePreview && window.updatePreview();" oninput="window.syncDrugGrid && window.syncDrugGrid(); window.updatePreview && window.updatePreview();"');
  }

  // 5. Update all drug-select-status to have inline onchange
  html = html.replace(/class="drug-select-status"/g, 'class="drug-select-status" onchange="window.handleDrugSelectChange && window.handleDrugSelectChange(this);"');

  fs.writeFileSync(f, html, 'utf8');
  console.log(`Updated ${path.basename(path.dirname(f))}/${path.basename(f)}`);
});
