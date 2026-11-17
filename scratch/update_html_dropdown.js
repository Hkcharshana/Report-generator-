const fs = require('fs');

function updateHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update #test_name select
  const testSelectRegex = /<select id="test_name" name="test_name">[\s\S]*?<\/select>/;
  const newTestSelect = `<select id="test_name" name="test_name">
                <option value="">-- Select Test or Medical Package --</option>
                <optgroup label="📋 Multi-Sheet Medical Packages (බහු-පත්‍ර පැකේජ)" id="builtinPackagesOptGroup">
                  <option value="Type 10 B">Type 10 B (Medical Package - 4 Reports)</option>
                  <option value="Type 10 B with urine drug">Type 10 B with urine drug (5 Reports: 12 Drugs)</option>
                  <option value="Type 11">Type 11 (Medical Package - 5 Reports: FBS, SGPT/SGOT, UFR, GGT, Lipid)</option>
                  <option value="Type 7">Type 7 (Russia Package - 4 Reports: UFR, TB, Brucellosis, HIV)</option>
                </optgroup>
                <optgroup label="⭐ Custom Medical Packages" id="customPackagesTestOptGroup">
                  <!-- Populated dynamically -->
                </optgroup>
                <optgroup label="🧪 Single Laboratory Reports (තනි පරීක්ෂණ)">
                  <option value="FBS">FBS (Fasting Blood Sugar)</option>
                  <option value="Fasting Blood Sugar">Fasting Blood Sugar</option>
                  <option value="RBS">RBS (Random Blood Sugar)</option>
                  <option value="Total Cholesterol">Total Cholesterol</option>
                  <option value="SGPT">SGPT</option>
                  <option value="SGOT">SGOT</option>
                  <option value="SGPT & SGOT">SGPT &amp; SGOT</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="Gamma GT">Gamma GT</option>
                  <option value="Total Bilirubine">Total Bilirubine</option>
                  <option value="Serum Creatine">Serum Creatine</option>
                  <option value="Urine Full Report">Urine Full Report</option>
                  <option value="Urine Drug Screening">Urine Drug Screening (12 Drugs / 5 Drugs)</option>
                  <option value="Haemoglobin A1C">Haemoglobin A1C</option>
                  <option value="Full Blood Count">Full Blood Count</option>
                  <option value="Total β - HCG Concentration">Total β - HCG Concentration</option>
                  <option value="BETA H.C.G.">BETA H.C.G.</option>
                  <option value="Tuberculosis Rapid Test">Tuberculosis Rapid Test</option>
                  <option value="Brucellosis Test">Brucellosis Test</option>
                  <option value="HIV Ag & Ab Test">HIV Ag &amp; Ab Test</option>
                </optgroup>
              </select>`;

  if (!testSelectRegex.test(content)) {
    throw new Error('test_name select not found in ' + filePath);
  }
  content = content.replace(testSelectRegex, newTestSelect);

  // 2. Update Urine Drug Panel Type Select (default to 12)
  const drugPanelRegex = /<select id="drugPanelTypeSelect"[\s\S]*?<\/select>/;
  const newDrugPanel = `<select id="drugPanelTypeSelect" name="drug_panel_type" onchange="window.syncDrugGrid && window.syncDrugGrid(); window.updatePreview && window.updatePreview();" oninput="window.syncDrugGrid && window.syncDrugGrid(); window.updatePreview && window.updatePreview();" style="padding: 6px 12px; border-radius: 8px; border: 1.5px solid #0d9488; font-weight: 700; font-size: 13px; background: #fff; cursor: pointer; color:#0f766e;">
                <option value="12" selected>12-Parameter Panel (AMP, BAR, BZO, BUP, COC, THC, MTD, MET, MDMA, MOP, PCP, TCA)</option>
                <option value="5">5-Parameter Panel (AMP, BZO, MET, OPI, THC) - Standard</option>
              </select>`;
  if (drugPanelRegex.test(content)) {
    content = content.replace(drugPanelRegex, newDrugPanel);
  }

  // 3. Make drug12Grid display: grid by default, and field_urine_drug_opi display: none by default
  content = content.replace(
    'id="drug12Grid" style="display: none;',
    'id="drug12Grid" style="display: grid;'
  );
  content = content.replace(
    'class="field" id="field_urine_drug_opi"',
    'class="field" id="field_urine_drug_opi" style="display: none;"'
  );

  // 4. Update script tag version to prevent caching
  content = content.replace(/app\.js\?v=[^"']+/g, 'app.js?v=20261112-v3');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + filePath);
}

updateHtml('public/index.html');
updateHtml('frontend/index.html');
