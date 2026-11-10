/* Marble Curling Phase 6: 30 deterministic full five-end CPU matches. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const ctx=vm.createContext({}),root=path.resolve(__dirname,'..');
for(const name of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
const C=vm.runInContext('MarbleCurling',ctx);
const MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.curling.available,true);
assert.equal(C.ENDS,5);
function run(seed,n=3){
 let cb=0,winner;
 const players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'CPU '+i,cpu:true}));
 const g=C.create(players,seed,ranking=>{cb++;winner=Array.from(ranking,p=>p.id);});
 let loops=0;
 while(!g.state.done&&loops++<100000)g.step(.1);
 assert.equal(g.state.done,true,'seed '+seed+' unfinished at '+loops);
 assert.equal(cb,1);
 assert.equal(g.state.end,5);
 assert.equal(g.state.history.length,5);
 assert.deepEqual(Array.from(g.standings(),p=>p.id),winner);
 for(const p of g.state.roster){
  assert.equal(p.endPoints.length,5);
  assert.equal(p.stonesPlayed,10);
  assert.equal(p.points,p.endPoints.reduce((a,b)=>a+b,0));
 }
 for(const h of g.state.history){
  assert.equal(h.places.length,n);
  assert.equal(h.stones.length,n*2);
  assert.equal(new Set(h.places).size,n);
 }
 g.step(.1);assert.equal(cb,1);
 return {winner,history:Array.from(g.state.history,h=>({end:h.end,places:Array.from(h.places),
   stones:Array.from(h.stones,s=>({id:s.id,x:s.x,y:s.y}))}))};
}
const first=run(744,2);assert.deepEqual(first,run(744,2));
for(let seed=1;seed<=30;seed++)assert.deepEqual(run(seed,3),run(seed,3),'seed '+seed+' not repeatable');
assert.equal(run(198,8).winner.length,8);
assert.throws(()=>C.create([{id:'solo'}],1),/2–8/);
assert.throws(()=>C.create(Array.from({length:9},(_,i)=>({id:'p'+i})),1),/2–8/);
assert.throws(()=>C.create([{id:'p'},{id:'p'}],1),/distinct/);
const g=C.create([{id:'a',cpu:false},{id:'b',cpu:false}],12);
assert.equal(g.action('unknown','throw'),false);
assert.equal(g.action('b','throw'),false,'not your turn');
assert.equal(g.action('a','power',Infinity),false);
assert.equal(g.action('a','aim',500),false);
assert.equal(g.action('a','left',9),false);
assert.equal(g.action('a','power',72),true);
assert.equal(g.action('a','right',2),true);
assert.equal(g.action('a','throw'),true);
assert.equal(g.action('a','throw'),false);
assert.equal(g.action('b','sweep'),false);
assert.equal(g.action('a','sweep'),true);
let done=0;while(g.state.phase==='slide'&&done++<600)g.step(.1);
assert.notEqual(g.state.phase,'slide','stone did not stop');
assert.equal(g.state.roster[0].stonesPlayed,1);
assert.equal(g.action('a','sweep'),false);
console.log('PASS: Marble Curling 30 seeded five-end 3-CPU matches × deterministic replay; 8 racers; 2 stones each, physical collision, scoring and ownership.');
