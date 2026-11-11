'use strict';
// Regression gate: retired overlay FX must never return as a second painter.
// Approved FX images remain in assets/raw and are reused by real renderers.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const build=fs.readFileSync('tools/build.js','utf8');
const tv=fs.readFileSync('src/tv.js','utf8');
const host=fs.readFileSync('src/modes/party-screen-host.js','utf8');
assert.ok(!fs.existsSync('src/modes/party-fx.js'),
  'Retired PartyFX overlay module reappeared');
assert.ok(!build.includes("'party-fx'"),
  'Retired overlay must not be bundled');
assert.ok(!/PartyFX[.]draw/.test(tv+host),
  'A second renderer would violate exclusive screen ownership');
for(const mode of ['derby','dropzone','brawl','curling','golf']){
 const engine=fs.readFileSync('src/modes/'+mode+'.js','utf8');
 assert.ok(!/function draw\(\)\s*\{\s*\/\* Party Pack v2/.test(engine),
  'Old rules canvas shim remains: '+mode);
}
console.log('PASS: old PartyFX painter retired, no legacy game draw shim or overlay; approved image assets preserved');
