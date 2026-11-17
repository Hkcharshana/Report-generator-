const fs = require('fs');
const filePath = 'C:/Users/Admin/.gemini/antigravity/brain/29d51bf5-991b-4e03-b1df-79d8124c834d/.system_generated/logs/transcript.jsonl';
const stat = fs.statSync(filePath);
const bytesToRead = Math.min(stat.size, 1024 * 1024); // 1MB
const buffer = Buffer.alloc(bytesToRead);
const fd = fs.openSync(filePath, 'r');
fs.readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
fs.closeSync(fd);

const text = buffer.toString('utf8');
const lines = text.split('\n');
console.log('Read lines from end:', lines.length);

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('"USER_INPUT"')) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.content && obj.content.includes('URINE DRUG SCREENING TEST')) {
        console.log('Found user input with reports! Length:', obj.content.length);
        fs.writeFileSync('C:/Users/Admin/Desktop/neosys-local-generator/backend/raw_user_input.txt', obj.content, 'utf8');
        console.log('Saved to backend/raw_user_input.txt successfully!');
        break;
      }
    } catch(e) {
      console.log('Parse error:', e.message);
    }
  }
}
