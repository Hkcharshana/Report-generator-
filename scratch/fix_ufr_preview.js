const fs = require('fs');

function fixUfrPreview(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace font-weight:600 in UFR preview table rows
  content = content.replace(
    /`<tr><td style="font-weight:600; width:45%;">\$\{label\}<\/td><td style="font-weight:600;"><span style="display:inline-block; width:22px;">_<\/span> \$\{res\}<\/td><\/tr>`/g,
    '`<tr><td style="font-weight:normal; width:45%;">${label}</td><td style="font-weight:normal;"><span style="display:inline-block; width:22px;">_</span> ${res}</td></tr>`'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed UFR preview in', filePath);
}

fixUfrPreview('frontend/app.js');
fixUfrPreview('public/app.js');
