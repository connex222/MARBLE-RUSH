/* Drop Zone Phase 3 acceptance: deterministic full-game physics and scoring. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({});
for(const mode of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf']){
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',mode+'.js'),'utf8'),ctx,{filename:mode+'.js'});
}
const DZ=vm.runInContext('DropZone',ctx);
const MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.dropzone.available,true);
assert.equal(DZ.PEGS.length,85);
assert.deepEqual(Array.from(DZ.BINS),[50,100,200,500,1000,500,200,100]);
function run(seed,n=3){
 const players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'CPU '+i,cpu:true,color:'#ff2255'}));
 let callbacks=0,finished=null;
 const g=DZ.create(players,seed,r=>{callbacks++;finished=Array.from(r,p=>({id:p.id,score:p.score,drops:p.drops,results:Array.from(p.results)}));});
 let max=0;
 while(!g.state.done&&max++<18000)g.step(.05);
 assert.ok(g.state.done,'seed '+seed+' did not complete in bounded time');
 assert.equal(callbacks,1);
 assert.equal(g.state.turn,n*5);
 assert.equal(finished.length,n);
 for(const p of finished){
  assert.equal(p.drops,5);
  assert.equal(p.results.length,5);
  assert.equal(p.results.reduce((a,b)=>a+b,0),p.score);
  assert.ok(p.results.every(x=>DZ.BINS.includes(x)));
 }
 assert.deepEqual(Array.from(g.standings(),p=>p.id),finished.map(p=>p.id));
 const before=JSON.stringify(finished);
 g.step(.05);assert.equal(callbacks,1);assert.equal(JSON.stringify(finished),before);
 return {finished,steps:g.state.steps};
}
const fixture=run(123,2);
assert.deepEqual(run(123,2),fixture,'replay from same seed must be identical');
let completed=0,grandTotals=0;
for(let seed=1;seed<=30;seed++){
 const a=run(seed,3),b=run(seed,3);
 assert.deepEqual(a,b,'seed '+seed+' not deterministic');
 grandTotals+=a.finished.reduce((acc,p)=>acc+p.score,0);
 completed++;
}
assert.equal(completed,30);
assert.ok(grandTotals>0);
const human=DZ.create([{id:'h',cpu:false}],7);
assert.equal(human.action('impostor','drop'),false);
assert.equal(human.action('h','aim',Infinity),false);
assert.equal(human.action('h','aim',5000),false);
assert.equal(human.action('h','left',1),true);
assert.equal(human.state.x,479);
assert.equal(human.action('h','drop'),true);
assert.equal(human.action('h','drop'),false,'one drop only per turn');
for(let i=0;i<1000&&human.state.turn===0;i++)human.step(.05);
assert.equal(human.state.turn,1);
assert.equal(human.state.done,false,'one drop must not end a five-round game');
console.log('PASS: Drop Zone 30 seeds × 3 CPU players × 5 drops, replay deterministic, 8 scoring buckets, turn ownership, five-round totals.');
