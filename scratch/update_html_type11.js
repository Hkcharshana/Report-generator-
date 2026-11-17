const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'frontend', 'index.html')
];

const type11PreviewHtml = `
            <!-- Type 11 Multi-Report Preview Container -->
            <div id="type11PreviewContainer" class="type10b-report-preview" hidden>
              <div class="fbc-status-banner" style="display:flex; justify-content:space-between; align-items:center; background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:10px 14px; border-radius:8px;">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><strong>Multi-Sheet Medical Package Selected</strong> &mdash; All 5 test reports will be saved together in one Excel workbook.</span>
                <button type="button" class="btn primary btn-xs" id="prevExcelBtnType11" onclick="document.getElementById('excelBtn').click()">Download Excel (.xlsx)</button>
              </div>

              <div class="type10b-preview-grid">
                <!-- Card 1: Fasting Blood Sugar -->
                <div class="type10b-preview-card">
                  <div class="type10b-preview-card-head">
                    <h5>FASTING BLOOD SUGAR (FBS)</h5>
                    <span class="sheet-tag">Sheet 1: FBS</span>
                  </div>
                  <div style="font-size:12.5px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><b>Investigation:</b> <span>Fasting Blood Sugar</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="type11PrevFbs" style="color:#0f766e;">75 mg/dl</b></div>
                    <div style="display:flex; justify-content:space-between;"><b>Ref. Range:</b> <span>74 - 115 mg/dl</span></div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">[Test Method - Spectrophotometry - End point]</div>
                  </div>
                </div>

                <!-- Card 2: Blood for SGPT & SGOT -->
                <div class="type10b-preview-card">
                  <div class="type10b-preview-card-head">
                    <h5>BLOOD FOR SGPT &amp; SGOT</h5>
                    <span class="sheet-tag">Sheet 2: SGPT &amp; SGOT</span>
                  </div>
                  <div style="font-size:12.5px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><span>SGPT:</span> <b id="type11PrevSgpt">10 iu/l</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>SGOT:</span> <b id="type11PrevSgot">13 iu/l</b></div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">[Test Method - Spectrophotometry - Kinetic]</div>
                  </div>
                </div>

                <!-- Card 3: Urine Full Report -->
                <div class="type10b-preview-card">
                  <div class="type10b-preview-card-head">
                    <h5>URINE FULL REPORT</h5>
                    <span class="sheet-tag">Sheet 3: UFR</span>
                  </div>
                  <div style="font-size:12.5px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><b>Routine &amp; Microscopy:</b> <b style="color:#059669;">Normal</b></div>
                    <div style="display:flex; justify-content:space-between;"><b>Appearance / Colour:</b> <span>Clear / Pale Yellow</span></div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">[Test Method - Centrifuged Urine Microscopy &amp; Dipstick]</div>
                  </div>
                </div>

                <!-- Card 4: Gamma GT -->
                <div class="type10b-preview-card">
                  <div class="type10b-preview-card-head">
                    <h5>GAMMA GT</h5>
                    <span class="sheet-tag">Sheet 4: Gamma GT</span>
                  </div>
                  <div style="font-size:12.5px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><b>Investigation:</b> <span>Gamma GT</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Result:</b> <b id="type11PrevGgt" style="color:#0f766e;">18 U/L</b></div>
                    <div style="display:flex; justify-content:space-between;"><b>Ref. Range:</b> <span>5 - 40 U/L</span></div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">[Test Method - Spectrophotometry - Kinetic]</div>
                  </div>
                </div>

                <!-- Card 5: Lipid Profile -->
                <div class="type10b-preview-card">
                  <div class="type10b-preview-card-head">
                    <h5>LIPID PROFILE</h5>
                    <span class="sheet-tag">Sheet 5: Lipid Profile</span>
                  </div>
                  <div style="font-size:12.5px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><span>Cholesterol:</span> <b id="type11PrevChol">176 mg/dl</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>HDL:</span> <b id="type11PrevHdl">44 mg/dl</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>LDL:</span> <b id="type11PrevLdl">112.4 mg/dl</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>Triglyceride:</span> <b id="type11PrevTrig">98 mg/dl</b></div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">[Test Method - Spectrophotometry - End point]</div>
                  </div>
                </div>
              </div>
            </div>
`;

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let html = fs.readFileSync(f, 'utf8');

  // 1. In report_type dropdown, make sure Type 11 is crisp and clear
  if (!html.includes('Type 11 (Medical Package - 5 Reports')) {
    html = html.replace(
      '<option value="Type 11">Type 11 Medical Package (5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>',
      '<option value="Type 11">Type 11 (Medical Package - 5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid Profile)</option>'
    );
  }

  // 2. In test_name dropdown, ensure FBS and Fasting Blood Sugar and Type 11 exist
  if (!html.includes('<option>Fasting Blood Sugar</option>')) {
    html = html.replace('<option>FBS</option>', '<option>FBS</option>\n                  <option>Fasting Blood Sugar</option>');
  }

  // 3. Insert type11PreviewHtml if not already present
  if (!html.includes('id="type11PreviewContainer"')) {
    html = html.replace(
      '<!-- Custom Medical Package Multi-Report Preview Container -->',
      `${type11PreviewHtml}\n            <!-- Custom Medical Package Multi-Report Preview Container -->`
    );
    console.log(`✓ Inserted type11PreviewContainer in ${path.basename(path.dirname(f))}`);
  }

  // 4. Update the input card toolbar
  if (!html.includes('id="resetType11Btn"')) {
    html = html.replace(
      'id="resetColomboBtn">',
      'id="resetType11Btn">\n                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
    );
  }

  fs.writeFileSync(f, html, 'utf8');
  console.log(`✓ Updated ${path.basename(path.dirname(f))}/${path.basename(f)}`);
});
