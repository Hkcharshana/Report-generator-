const fs = require('fs');
const path = require('path');

['public/app.js', 'frontend/app.js'].forEach(rel => {
  const filePath = path.join(__dirname, '..', rel);
  let c = fs.readFileSync(filePath, 'utf8');

  // Replace 'pcp' in list with 'tml'
  c = c.replace("'pcp'", "'tml'");

  // Replace urine_drug_pcp with urine_drug_tml
  c = c.replace(/urine_drug_pcp/g, 'urine_drug_tml');

  // When Type 10 B with urine drug is selected, show urineDrugResults container
  const oldCheck = "if (isUrineDrugOnly) {";
  const newCheck = "const showDrugInputs = isUrineDrugOnly || (isType10B && hasUrineDrug);\n  if (showDrugInputs) {";
  if (c.includes(oldCheck)) {
    c = c.replace(oldCheck, newCheck);
  }

  // Also in updatePreview, live-update the preview drug items when drug inputs change
  const drugPreviewUpdateHook = `
    // Live-update 12-drug preview grid values
    const drugKeys = ['amp', 'bar', 'bzo', 'bup', 'coc', 'thc', 'mtd', 'met', 'mdma', 'mop', 'tml', 'tca'];
    drugKeys.forEach(k => {
      const sel = document.getElementById('urine_drug_' + k);
      const val = sel ? sel.value : (data['urine_drug_' + k] || 'Negative');
      const prevB = document.querySelector('#type10bPrevDrugGrid [data-drug="' + k + '"]');
      if (prevB) {
        prevB.textContent = val;
        prevB.style.color = val === 'Positive' ? '#dc2626' : '#059669';
      }
    });
`;

  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Successfully updated', rel);
});
