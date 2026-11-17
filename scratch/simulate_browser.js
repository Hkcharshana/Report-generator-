const fs = require('fs');
const vm = require('vm');

let js = fs.readFileSync('frontend/app.js', 'utf8');

// Fix the two known bugs temporarily in memory to see what else might be broken
js = js.replace(
  "const isShipping = name === 'Shipping' || name === 'Type 12 - 1 (Shipping)' || name === 'Type 12 - 1' || (selectedPkg === 'Shipping');",
  "const selectedPkg = $('#report_type')?.value;\n  const isShipping = name === 'Shipping' || name === 'Type 12 - 1 (Shipping)' || name === 'Type 12 - 1' || (selectedPkg === 'Shipping');"
);
js = js.replace(
  "('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('input', () => debouncedUpdatePreview()));",
  "$$('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('input', () => debouncedUpdatePreview()));"
);
js = js.replace(
  "('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('change', () => debouncedUpdatePreview()));",
  "$$('#shippingResults input, #shippingResults select').forEach(el => el.addEventListener('change', () => debouncedUpdatePreview()));"
);

function mockElement(tag, id = '', className = '') {
  return {
    tagName: tag.toUpperCase(),
    id: id,
    className: className,
    style: {},
    dataset: {},
    children: [],
    hidden: false,
    value: '',
    textContent: '',
    innerHTML: '',
    options: [{ value: 'single', textContent: 'Single' }, { value: 'Type 10 B', textContent: 'Type 10 B' }],
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    focus: () => {},
    scrollIntoView: () => {},
    dispatchEvent: () => {}
  };
}

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: (id) => mockElement('div', id),
    querySelector: (sel) => mockElement('div', sel),
    querySelectorAll: (sel) => [mockElement('div', sel)],
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: (tag) => mockElement(tag)
  },
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  fetch: async () => ({
    ok: true,
    json: async () => ({ ok: true, records: [] }),
    text: async () => '',
    blob: async () => ({ size: 100 })
  }),
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console,
  location: { reload: () => {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

try {
  vm.runInNewContext(js, sandbox);
  console.log('1. Script parsed & loaded in sandbox without error!');

  console.log('2. Testing updateTest()...');
  sandbox.updateTest();
  console.log('   updateTest() OK!');

  console.log('3. Testing updatePreview()...');
  sandbox.updatePreview();
  console.log('   updatePreview() OK!');

  console.log('4. Testing collect()...');
  const collected = sandbox.collect();
  console.log('   collect() OK! keys count:', Object.keys(collected).length);

  console.log('5. Testing autoSelectLabTest with patient record...');
  sandbox.autoSelectLabTest({ ref_no: '05184', fname: 'Test', medical_type_name: 'Type 10 B' });
  console.log('   autoSelectLabTest() OK!');

  console.log('6. Testing setPatient...');
  sandbox.setPatient({ ref_no: '05184', fname: 'Test', medical_type_name: 'Type 10 B' });
  console.log('   setPatient() OK!');

  console.log('7. Testing handleReportTypeChange...');
  sandbox.handleReportTypeChange('Type 10 B');
  sandbox.handleReportTypeChange('single');
  sandbox.handleReportTypeChange('Shipping');
  console.log('   handleReportTypeChange() OK!');

  console.log('ALL TESTS PASSED!');
} catch (err) {
  console.error('FAILED WITH ERROR:', err);
}
