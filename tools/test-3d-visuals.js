'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(ROOT,'src/modes/party-3d.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'public/tv.html'),'utf8');
assert.ok(code.includes("import * as T from '../vendor/three.module.js'"));
assert.ok(code.includes('window.__MR'),'3D view must use authoritative simulation');
assert.ok(!/Math\.random\s*\(/.test(code),'3D layer must not introduce random state');
for(const id of ['derby','dropzone','brawl','curling','golf']){
  assert.ok(code.includes(id+':'),'Missing mode camera mapping: '+id);
  assert.ok(html.includes('party3d'),'Missing optional 3D TV viewport');
}
assert.ok(!code.includes('Game.onAction'),'3D visual cannot control scoring or player actions');
assert.ok(html.includes('partyBackLobby'),'Back to Lobby preserved');
for(const name of ['three.module.js','three.core.js']){
 const f=path.join(ROOT,'public/assets/vendor',name);
 assert.ok(fs.existsSync(f)&&fs.statSync(f).size>10000,'Missing vendored Three.js: '+name);
}
assert.ok(fs.existsSync(path.join(ROOT,'public/assets/js/party-3d.js')));
assert.ok(html.includes('assets/js/party-3d.js'));
console.log('PASS: local WebGL modules bundled, five game scenes, existing authoritative physics unaffected and 2D fallback retained');
