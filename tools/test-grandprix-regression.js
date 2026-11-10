/* Regression guard: Grand Prix physics must match current main exactly.
   Usage: node tools/test-grandprix-regression.js /tmp/main-engine.js */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const baseline=process.argv[2];
if(!baseline)throw Error('Expected checked-out main engine path');
const original=require(path.resolve(baseline));
const candidate=require('../src/engine.js');
const tracks=['toybox','candy','ice','space','jungle','seaside','clockwork'];
const snap=(MR,trackId)=>{
  const w=new MR.World(MR.TRACKS[trackId](),{seed:8421,items:true,catchup:true});
  for(let i=0;i<4;i++) w.addMarble('m'+i,{name:'Test '+i,color:'#ff3344',swirl:i});
  w.go();
  for(let i=0;i<420;i++){
    if(i===15||i===90||i===220)w.press('m1');
    if(i===20||i===95||i===225)w.release('m1');
    if(i===65||i===160)w.press('m2');
    if(i===75||i===175)w.release('m2');
    w.step(1/60);
  }
  return w.marbles.map(m=>({
    id:m.id,x:m.x,y:m.y,vx:m.vx,vy:m.vy,prog:m.prog,
    boost:m.boost,rank:m.rank,finished:m.finished,bumps:m.stats.bumps
  }));
};
for(const id of tracks)assert.deepEqual(snap(candidate,id),snap(original,id),id+' simulation drifted');
console.log('PASS: Grand Prix physics identical to main for 7 tracks with 4 racers, fixed seed and tap/hold inputs.');
