/*
 * MARBLE RUSH — every Party Pack engine must advance by real wall time,
 * regardless of how few frames the compositor can present.
 */
'use strict';
const assert=require('node:assert/strict');
const Clock=require('../src/modes/party-frame-clock.js');
global.registerMode=()=>{};
const Derby=require('../src/modes/derby.js');
const close=(actual,wanted,eps=.000001)=>assert.ok(Math.abs(actual-wanted)<=eps,
  actual+' differs from '+wanted+' by more than '+eps);
let simulated=0;
Clock.reset();
for(let frame=0;frame<40;frame++){
  const a=Clock.advance(.2,dt=>{assert.ok(dt<=.05);simulated+=dt;});
  close(a.advanced,.2);
  assert.equal(a.steps,4);
}
close(simulated,8);
close(Clock.stats().advancedSeconds,8);
assert.equal(Clock.stats().frames,40);
assert.equal(Clock.stats().droppedSeconds,0);
Clock.reset();
let calls=0;
const large=Clock.advance(2,dt=>{calls++;assert.ok(dt<=.05);});
assert.equal(large.steps,10);
close(large.advanced,.5);
close(large.dropped,1.5);
assert.equal(Clock.stats().clampedFrames,1);
assert.equal(calls,10);
Clock.reset();
let active=true;let ticks=0;
const interrupted=Clock.advance(.4,dt=>{ticks++;active=false;},()=>active);
assert.equal(interrupted.steps,1);
assert.equal(ticks,1);
close(interrupted.advanced,.05);
close(interrupted.dropped,.35);
assert.equal(Clock.advance(-9,()=>{throw Error('Negative delta must not tick');}).steps,0);
assert.equal(Clock.advance(Infinity,()=>{throw Error('Non-finite delta must not tick');}).steps,0);
const roster=[{id:'c1',name:'CPU 1',cpu:true},{id:'c2',name:'CPU 2',cpu:true}];
function simulate(chunks){
  Clock.reset();
  const g=Derby.create(roster,24823);
  for(const value of chunks)Clock.advance(value,dt=>g.step(dt));
  return {clock:g.state.time,phase:g.state.phase,round:g.state.round,
    positions:g.state.horses.map(h=>h.x),
    finishes:g.state.horses.map(h=>h.finishedAt),
    gems:g.state.roster.map(p=>p.gems),
    ticked:Clock.stats().advancedSeconds};
}
const sixty=simulate(Array.from({length:480},()=>1/60));
const five=simulate(Array.from({length:40},()=>.2));
close(sixty.ticked,8);close(five.ticked,8);
close(sixty.clock,five.clock,1/60+.000001);
assert.equal(sixty.phase,five.phase);
assert.equal(sixty.round,five.round);
assert.deepEqual(sixty.gems,five.gems);
for(let i=0;i<6;i++)close(sixty.positions[i],five.positions[i],4);
assert.ok(five.clock>=7.98,'Low frame rate lost multiple gameplay seconds');
console.log('PASS: Party clock 5 FPS vs 60 FPS, 8 seconds of real Derby time, bounded catch-up, stop-on-finish and pause-gap safety.');
