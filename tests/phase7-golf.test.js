/* Phase 7 Marble Golf regression tests. Run: node tests/phase7-golf.test.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const registered=[];
const ctx={registerMode:m=>registered.push(m),module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/modes/golf.js'),'utf8'),ctx,{filename:'golf.js'});
const Golf=ctx.module.exports;
const roster=(n,cpu=true)=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,cpu}));
function complete(game,limit=300000){
  for(let n=0;n<limit&&!game.state.done;n++)game.step(.1);
  assert.equal(game.state.done,true,'game must finish in bounded time');
  for(const p of game.state.roster){
    assert.equal(p.holeScores.length,Golf.HOLES);
    assert.ok(p.holeScores.every(s=>s>=1&&s<=Golf.MAX_STROKES));
    assert.equal(p.strokes,p.holeScores.reduce((a,b)=>a+b,0));
  }
}
assert.equal(registered.length,1);
assert.equal(registered[0].id,'golf');
assert.equal(registered[0].available,true);
assert.equal(Golf.LAYOUTS.length,5);
assert.throws(()=>Golf.create([]),/Golf needs/);
assert.throws(()=>Golf.create([{id:'x'},{id:'x'}]),/Golf needs/);
let callbacks=0;
const a=Golf.create(roster(2),123,()=>callbacks++);
const b=Golf.create(roster(2),123);
assert.equal(a.action('invalid','shoot'),false);
assert.equal(a.action('p0','power',Infinity),false);
complete(a);complete(b);
assert.equal(callbacks,1);
assert.equal(JSON.stringify(a.state.history),JSON.stringify(b.state.history));
complete(Golf.create(roster(8),42));
const h=Golf.create(roster(1,false),3);
assert.equal(h.action('p0','aim',13),true);
assert.equal(h.action('p0','shoot'),true);
assert.equal(h.action('p0','shoot'),false);
complete(h,130000);
console.log('Phase 7 Marble Golf regression tests: PASS');
