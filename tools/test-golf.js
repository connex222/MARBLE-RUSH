/* MARBLE GOLF V2: preserve real 5/9-hole physics, collisions and stroke scoring.
 * No network/DOM; every UI event is independently validated by the rules.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const name of ['registry','session','geometry','attract','bots','grandprix',
  'derby','dropzone','brawl','curling','golf']){
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
}
const Golf=vm.runInContext('MarbleGolf',ctx),MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.golf.available,true,'Do not expose Golf until exclusive replacement stage ships');
assert.equal(Golf.HOLES,5);assert.equal(Golf.FULL_HOLES,9);
assert.equal(Golf.MAX_STROKES,7);
assert.equal(Golf.LAYOUTS.length,5);
assert.equal(Golf.CHAMPIONSHIP_HOLES.length,4);
function play(seed,count=2,championship=false){
 let callback=0,final=[];
 const players=Array.from({length:count},(_,i)=>({id:'cpu'+i,name:'CPU '+i,cpu:true,difficulty:'hard'}));
 const g=Golf.create(players,seed,winners=>{callback++;final=Array.from(winners,p=>p.id);},{championship});
 let loops=0;
 while(!g.state.done&&loops++<250000)g.step(.1);
 assert.equal(g.state.done,true,'seed '+seed+' mode '+championship+' incomplete after '+loops);
 const n=championship?9:5;
 assert.equal(g.state.holes,n);
 assert.equal(g.state.hole,n);
 assert.equal(g.state.history.length,n);
 assert.equal(callback,1);
 assert.deepEqual(Array.from(g.standings(),p=>p.id),final);
 for(const p of g.state.roster){
  assert.equal(p.holeScores.length,n);
  assert.ok(p.holeScores.every(x=>Number.isInteger(x)&&x>=1&&x<=7),
   'Golf strokes must stay within 1..7');
  assert.equal(p.strokes,p.holeScores.reduce((a,b)=>a+b,0));
 }
 for(const h of g.state.history){
  assert.equal(h.scores.length,count);
  assert.ok(h.scores.every(x=>x.strokes>=1&&x.strokes<=7));
 }
 g.step(.1);assert.equal(callback,1);
 return {result:final,history:g.state.history.map(h=>({
  hole:h.hole,scores:h.scores.map(p=>({id:p.id,strokes:p.strokes}))
 }))};
}
assert.deepEqual(play(101,2,false),play(101,2,false),'Five holes changed for a fixed seed');
assert.deepEqual(play(515,2,true),play(515,2,true),'Nine holes changed for a fixed seed');
for(let seed=1;seed<=8;seed++)play(seed,2,false);
play(988,3,true);
assert.throws(()=>Golf.create([],1),/1–8/);
assert.throws(()=>Golf.create(Array.from({length:9},(_,i)=>({id:'p'+i})),1),/1–8/);
assert.throws(()=>Golf.create([{id:'a'},{id:'a'}],1),/unique/);
const g=Golf.create([{id:'a',cpu:false},{id:'b',cpu:false}],22,()=>{},{championship:true});
assert.equal(g.state.holes,9);
assert.equal(g.hud('a').holes,9,'Phone receives full championship length');
assert.equal(g.action('unknown','shoot'),false);
assert.equal(g.action('b','shoot'),false,'Not your turn');
assert.equal(g.action('a','power',Infinity),false);
assert.equal(g.action('a','aim',200),false);
assert.equal(g.action('a','left',9),false);
assert.equal(g.action('a','power',80),true);
assert.equal(g.action('a','right',1),true);
assert.equal(g.action('a','preview'),true);
assert.ok(g.state.ghost,'Trajectory hint missing');
assert.equal(g.action('a','shoot'),true);
assert.equal(g.state.ghost,null,'Stale trajectory hint leaked after shot');
assert.equal(g.action('a','shoot'),false,'Cannot shoot while ball moving');
assert.equal(g.state.phase,'rolling');
assert.equal(g.state.strokes,1);
assert.equal(g.state.events.at(-1).kind,'shot');
assert.equal(g.action('b','cheer'),true,'Spectator cheer must still work');
assert.equal(g.action('b','cheer'),false,'Spectator cheer only once a hole');
let i=0;while(g.state.phase==='rolling'&&i++<1000)g.step(.1);
assert.notEqual(g.state.phase,'rolling','Ball never came to rest');
const g5=Golf.create([{id:'solo',cpu:false}],6,()=>{},{championship:false});
assert.equal(g5.state.holes,5);
assert.equal(g5.hud('solo').holes,5);
console.log('PASS Marble Golf v2: 5- and 9-hole deterministic championships, 1–8 eligibility, 7-stroke cap, shot/physics/turns, validated controls, preview and spectator actions.');
