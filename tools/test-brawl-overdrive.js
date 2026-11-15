/* BOWL BRAWL COMBAT OVERDRIVE: independent, deterministic gameplay acceptance.
 * This establishes measurable pace/physics, not subjective fun or physical GPU FPS.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({registerMode(){}});
vm.runInContext(fs.readFileSync('src/modes/brawl.js','utf8'),context);
const B=vm.runInContext('BowlBrawl',context);
assert.equal(B.ROUNDS,5);
assert.equal(B.ROUND_TIME,32);
assert.deepEqual(Array.from(B.SHOCK_TIMES),[3,8,15,24]);
assert.equal(B.RAM_COST,24);
assert.ok(B.DRIVE_FORCE>=200);
assert.ok(B.RAM_IMPULSE>=600);
function match(seed,n,cpu){
 let completed=0;
 const roster=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,cpu}));
 const g=B.create(roster,seed,()=>completed++);
 const start=g.state.marbles.map(m=>({x:m.x,y:m.y,speed:Math.hypot(m.vx,m.vy)}));
 let steps=0;
 while(!g.state.done&&steps++<8000){
   g.tick(.05);
   for(const m of g.state.marbles)assert.ok(
     [m.x,m.y,m.vx,m.vy,m.energy].every(Number.isFinite),'non-finite marble physics');
 }
 assert.equal(completed,1,'five round game did not complete once');
 assert.equal(g.state.roundHistory.length,5);
 assert.ok(start.every(m=>m.speed>=140),'opening starts motionless');
 const events=g.state.events;
 return {
   elapsed:steps*.05,history:g.state.roundHistory.map(arr=>Array.from(arr)),
   ranked:g.standings().map(p=>[p.id,p.points]),
   hits:events.filter(e=>e.kind==='hit').length,
   knockouts:events.filter(e=>e.kind==='knockout').length,
   shocks:events.filter(e=>e.kind==='shockwave').length,
   crossfire:events.some(e=>e.kind==='hazardReveal'&&e.hazard==='crossfire'),
   wrongPoints:g.state.roster.some(p=>p.points!==p.roundPoints.reduce((a,b)=>a+b,0))
 };
}
const results=[];
for(const n of [2,4,8])for(const cpu of [false,true]){
 const samples=[];
 for(let seed=1;seed<=25;seed++){
   const result=match(seed,n,cpu);
   assert.deepEqual(match(seed,n,cpu),result,'different results with same seed');
   assert.equal(result.crossfire,true,'fifth round must be Crossfire Finale');
   assert.equal(result.wrongPoints,false);
   samples.push(result);
 }
 const mean=k=>samples.reduce((sum,s)=>sum+s[k],0)/samples.length;
 const stats={players:n,cpu,games:samples.length,
   meanSeconds:Number(mean('elapsed').toFixed(1)),
   meanHits:Number(mean('hits').toFixed(1)),
   meanKnockouts:Number(mean('knockouts').toFixed(1)),
   meanShockwaves:Number(mean('shocks').toFixed(1))};
 if(n===2&&!cpu){
   assert.ok(stats.meanSeconds<85,
     'two-player sessions still feel like a slow drifting game');
 }
 if(n===2&&cpu){
   assert.ok(stats.meanHits>=20,
     'AI combat lacks sustained physical contact');
   assert.ok(stats.meanKnockouts>=2,
     'RAM attacks do not carry enough real jeopardy');
 }
 results.push(stats);
}
const duel=B.create([{id:'red'},{id:'blue'}],99);
assert.ok(duel.state.events.some(e=>e.kind==='duel'));
const pre=duel.current('red'),speedBefore=Math.hypot(pre.vx,pre.vy);
assert.equal(duel.action('red','ram'),true);
assert.ok(Math.hypot(pre.vx,pre.vy)>speedBefore+400,'RAM is not a committed forward boost');
assert.equal(pre.energy,75-B.RAM_COST);
const final=B.create([{id:'red'},{id:'blue'}],55);
final.state.hazard='crossfire';final.state.hazardAngle=0;
const red=final.current('red'),blue=final.current('blue');
red.x=80;red.y=0;red.vx=0;red.vy=0;
blue.x=300;blue.y=0;blue.vx=0;blue.vy=0;
final.tick(.05);
assert.ok(final.state.events.some(e=>e.kind==='hazardImpact'&&e.hazard==='crossfire'),
  'finale hammer has no real collision');
const manifest=JSON.parse(fs.readFileSync('tools/approved-audio-sources.json','utf8'));
for(const name of ['music_brawl_crucible','sfx_brawl_hammer','sfx_brawl_duel'])
 assert.ok(/^https:\/\//.test(manifest[name]),'missing original Creative Claw asset: '+name);
console.log('PASS OVERDRIVE: '+JSON.stringify(results));
console.log('Physical TV and human excitement signoff remains necessary.');
