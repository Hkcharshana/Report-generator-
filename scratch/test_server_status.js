const ExcelJS = require('exceljs');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const http = require('http');

// We can start server or require functions, or hit the running server if it's running
// Let's check if localhost:3000 or process.env.PORT is running
const req = http.request({ host: '127.0.0.1', port: 3000, path: '/api/status', method: 'GET' }, res => {
  console.log('Server is running on 3000, status:', res.statusCode);
});
req.on('error', e => {
  console.log('Server not currently running on 3000:', e.message);
});
req.end();
