const http = require('http');

http.get('http://127.0.0.1:1516/app.js', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Contains selectedPkg fix:', data.includes("const selectedPkg = $('#report_type')?.value;"));
    console.log('Contains $$ fix:', data.includes("$$('#shippingResults input, #shippingResults select')"));
    console.log('Contains broken syntax ("#shippingResults..."):', data.includes("('#shippingResults input, #shippingResults select')"));
  });
});
