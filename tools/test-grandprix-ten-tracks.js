/* Ten-course Grand Prix acceptance: track geometry, finishability and a no-repeat Full Tour.
 * Run: node tools/test-grandprix-ten-tracks.js
 * The original seven remain protected by tools/test-grandprix-regression.js.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const MR=require('../src/engine.js');
const originals=['toybox','candy','ice','space','jungle','seaside','clockwork'];
const added=['jettydash','canopyexpedition','gearshift'];
const all=[...originals,...added];

assert.equal(MR.TRACK_INFO.length,10,'ten courses must be selectable');
assert.deepEqual(MR.TRACK_INFO.map(t=>t.id),all,'preserve original order and append three courses');
assert.equal(new Set(MR.TRACK_INFO.map(t=>t.name)).size,10,'course titles must be unique');
for(const info of MR.TRACK_INFO) {
  const make=MR.TRACKS[info.id];
  assert.equal(typeof make,'function','missing '+info.id);
  const t=make();
  assert.equal(t.meta.id,info.id);
  assert.equal(t.meta.theme,info.theme);
  assert.equal(t.startSlots.length,8,'eight starting slots: '+info.id);
  assert.equal(t.arches.length,1,'one finish: '+info.id);
  assert.ok(Number.isFinite(t.finishDist)&&t.finishDist>3000,'invalid route length: '+info.id);
  assert.ok(t.bounds.minX<t.bounds.maxX && t.bounds.minY<t.bounds.maxY,'invalid bounds: '+info.id);
  assert.ok(t.checkpoints.length>1,'missing recovery checkpoints: '+info.id);
}
const originalLengths=originals.map(id=>MR.TRACKS[id]().finishDist);
const short=MR.TRACKS.jettydash();
const long=MR.TRACKS.canopyexpedition();
const hard=MR.TRACKS.gearshift();
assert.ok(short.finishDist<Math.min(...originalLengths)*0.5,'Jetty Dash is not materially shorter');
assert.ok(long.finishDist>Math.max(...originalLengths)*1.2,'Canopy Expedition is not materially longer');
assert.ok(hard.forks.length>=2&&hard.hazards.length>=2&&hard.seesaws.length>=2&&hard.jumps.length>=1,
  'Gearshift Gauntlet needs real, varied technical obstacles');
for(const id of added)for(const count of [2,4,8])for(const seed of [71,1234]){
  const t=MR.TRACKS[id]();
  const world=new MR.World(t,{seed,items:true,catchup:true});
  const choose=MR.rng(seed+4),bots=[];
  for(let i=0;i<count;i++){
    const marble=world.addMarble('p'+i,{name:'Bot '+i,color:'#ffffff',cpu:true});
    bots.push({marble,brain:{skill:.65+i*.025,rel:0,next:0,itemAt:0}});
  }
  world.go();
  for(let frame=0;frame<170*60&&!world.allFinished();frame++){
    for(const {marble,brain} of bots)MR.botThink(world,marble,brain,choose);
    world.step(1/60);
    world.events.length=0;
  }
  assert.ok(world.allFinished(),
    id+' '+count+' racers seed '+seed+' not finished in 170 s (finished '+world.finishCount+')');
  for(const m of world.marbles)assert.ok(Number.isFinite(m.finishTime));
}
let grandprix=null;
vm.runInNewContext(fs.readFileSync('src/modes/grandprix.js','utf8'),{
  registerMode(mode){if(mode.id==='grandprix')grandprix=mode;}
});
assert.ok(grandprix,'Grand Prix mode not registered');
const cup={n:10,race:0,played:[]};
for(let round=0;round<10;round++){
  const vote={};
  grandprix.startRound({cup,trackInfo:MR.TRACK_INFO,vote,players:new Map(),
    random:MR.rng(round+99),now:round*30});
  assert.equal(vote.opts.length,Math.min(3,10-round),
    'only unplayed choices allowed in Full Tour round '+(round+1));
  assert.ok(vote.opts.every(t=>!cup.played.includes(t.id)),'offered a repeated course');
  cup.played.push(vote.opts[0].id);cup.race++;
}
assert.equal(new Set(cup.played).size,10,'Full Tour must cover all ten tracks exactly once');
const shortCupVote={};
grandprix.startRound({cup:{n:7,race:6,played:all.slice(0,9)},trackInfo:MR.TRACK_INFO,
  vote:shortCupVote,players:new Map(),random:MR.rng(42),now:0});
assert.equal(shortCupVote.opts.length,3,'ordinary cups retain three voting choices');
const tv=fs.readFileSync('src/tv.js','utf8');
assert.ok(tv.includes('7: 10, 10: 1'),'ten-race cup is not selectable');
assert.ok(tv.includes('Full Tour (10)'),'ten-race cup has no TV label');
console.log('PASS: 10 selectable tracks; original 7 intact; short, long and expert geometry; 18 seeded 2/4/8-player races; unique ten-course Full Tour.');
