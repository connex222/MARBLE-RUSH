'use strict';
/*
 * Bowl Brawl reproducible AI playtest, not a claim of physical-device testing.
 * 120 five-round games: 40 seeds each with 2 / 4 / 8 marbles.
 * Outcomes reflect actual collisions, risk decisions and awarded points.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/modes/brawl.js','utf8');
const context=vm.createContext({registerMode(){}});
vm.runInContext(code,context);
const B=vm.runInContext('BowlBrawl',context);
const groups=[];
for(const n of [2,4,8]){
 const samples=[];
 for(let seed=1;seed<=40;seed++){
  const ps=Array.from({length:n},(_,i)=>({
    id:'p'+i,name:'Marble '+i,cpu:true,difficulty:i%2?'hard':'normal'
  }));
  let callbacks=0;
  const g=B.create(ps,seed,()=>{callbacks++;});
  let midLeader=null,ticks=0,scoreBefore=null;
  while(!g.state.done&&ticks++<120000){
   const oldRound=g.state.round;
   g.tick(.05);
   if(oldRound===2&&g.state.round===3){
    midLeader=g.standings()[0].id;
    scoreBefore=g.standings().map(p=>[p.id,p.points]);
   }
  }
  assert.equal(g.state.done,true,n+' players seed '+seed+' stalled');
  assert.equal(callbacks,1,n+' player callback duplicate');
  assert.equal(g.state.roundHistory.length,5);
  const events=g.state.events;
  const knockouts=events.filter(e=>e.kind==='knockout');
  const recoveries=events.filter(e=>e.kind==='recover');
  const pulses=events.filter(e=>e.kind==='shockwave');
  assert.ok(knockouts.every(e=>e.bonus===(e.round===5?5:3)),
    'A knockout has an unexplained bonus');
  for(const p of g.state.roster){
    assert.equal(p.roundPoints.length,5);
    assert.equal(p.points,p.roundPoints.reduce((a,b)=>a+b,0));
    assert.ok(p.roundPoints.every(points=>points>=1),
      'A round scored no placement reward');
  }
  samples.push({seed,ticks,knockouts:knockouts.length,
    recoveries:recoveries.length,pulses:pulses.length,
    comeback:!!midLeader&&g.standings()[0].id!==midLeader,
    final:g.standings()[0].id,midLeader,scoreBefore});
 }
 const avg=k=>samples.reduce((a,s)=>a+s[k],0)/samples.length;
 const comebackRate=samples.filter(s=>s.comeback).length/samples.length;
 const stats={players:n,games:samples.length,comebackRate,
   knockoutsPerMatch:avg('knockouts'),rescuesPerMatch:avg('recoveries'),
   shockwavesPerMatch:avg('pulses'),averageSimulationTicks:avg('ticks')};
 assert.ok(stats.knockoutsPerMatch>=.6,'Too few actual knockouts: '+JSON.stringify(stats));
 assert.ok(stats.rescuesPerMatch>=1,'No tactical recovery choices: '+JSON.stringify(stats));
 assert.ok(stats.shockwavesPerMatch>=1.5,'Short rounds skip all shockwaves: '+JSON.stringify(stats));
 assert.ok(comebackRate>=.1,'No leader changed across the final three rounds: '+JSON.stringify(stats));
 groups.push(stats);
}
console.log('PASS BOWL BRAWL AI PLAYTEST: '+JSON.stringify(groups));
console.log('LIMITATION: deterministic CPU matches are not proof of fun or phone input quality on physical devices.');
