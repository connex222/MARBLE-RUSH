/* Run the named legacy smoke suites and every Node test file, including server lifecycle. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const scripts = require('../package.json').scripts;
const mandatory = ['test:party', 'test:dropzone', 'test:brawl', 'test:derby', 'test:curling'];
const failures = [];
for (const name of mandatory) {
  const cmd = scripts[name];
  const match = /^node (tools\/[-\w]+\.js)$/.exec(cmd || '');
  if (!match) {
    console.error('FAIL ' + name + ': missing or unsupported command ' + cmd);
    failures.push(name); continue;
  }
  console.log('\n=== ' + name + ' ===');
  const result = spawnSync(process.execPath, [match[1]], { cwd: ROOT, stdio: 'inherit' });
  if (result.error || result.status !== 0) failures.push(name);
}
const dir = path.join(ROOT, 'tests');
const files = fs.readdirSync(dir).filter(name => name.endsWith('.test.js')).sort().map(name => path.join(dir, name));
if (!files.length) failures.push('tests/*.test.js: none found');
else {
  console.log('\n=== tests/*.test.js (' + files.length + ' files) ===');
  const result = spawnSync(process.execPath, ['--test', ...files], { cwd: ROOT, stdio: 'inherit' });
  if (result.error || result.status !== 0) failures.push('tests/*.test.js');
}
if (failures.length) {
  console.error('\nFAILED: ' + failures.join(', '));
  process.exitCode = 1;
} else console.log('\nPASS: all named suites and tests/*.test.js');
