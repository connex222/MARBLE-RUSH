/* Phase 2 foundation smoke tests — no browser, no artwork required. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
for (const name of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf']) {
  vm.runInContext(fs.readFileSync(path.join(root,'src','modes',name+'.js'),'utf8'), ctx, {filename:name+'.js'});
}
const game = vm.runInContext('({MODES, PartyNight, PartyCoordinator, partyPoints, PartyGeometry, PartyBots})', ctx);
const ids = Object.keys(game.MODES);
assert.equal(ids.length,6);
assert.deepEqual(ids,['grandprix','derby','dropzone','brawl','curling','golf']);
assert.equal(game.MODES.grandprix.available,true);
const sequence = [];
const mock = {
  cup: {n:0,race:99,played:['toybox']}, settings: {cup:4},
  resetNight() { sequence.push('reset'); },
  toVote() { sequence.push('vote'); }
};
game.MODES.grandprix.setup(mock);
assert.deepEqual(sequence,['reset','vote'],'Grand Prix start order unchanged');
assert.equal(mock.cup.n,4);
assert.equal(mock.cup.race,0);
assert.equal(mock.cup.played.length,0);

assert.equal(ids.filter(id => game.MODES[id].available).length,4,'GP, Derby, Drop Zone and Bowl Brawl playable');
for (const mode of Object.values(game.MODES)) {
  for (const fn of ['setup','startRound','tick','draw','onInput','onAction','botTick','hud','standings','roundResults','finalResults'])
    assert.equal(typeof mode[fn],'function',mode.id+'.'+fn);
}
assert.deepEqual(Array.from(game.partyPoints(['a','b','c']), ([id, points]) => [id, points]),[['a',10],['b',8],['c',6]]);
assert.throws(()=>game.partyPoints(['a','a']),/unique/);
assert.throws(()=>game.PartyNight.create(['grandprix','curling','grandprix'],2),/unavailable/);
assert.throws(()=>game.PartyNight.create(['grandprix'],2),/3, 5 or 7/);
const seedPlan = game.PartyNight.plan(7,2,42);
assert.equal(seedPlan.length,7);
assert.ok(seedPlan.every(id=>['grandprix','derby','dropzone','brawl'].includes(id)),'playlist must contain released modes');
assert.ok(seedPlan.includes('derby')&&seedPlan.includes('dropzone')&&seedPlan.includes('brawl'),'Party Night includes the three released minigames');
assert.deepEqual(Array.from(game.PartyNight.plan(7,2,42)),Array.from(game.PartyNight.plan(7,2,42)));
assert.throws(()=>game.PartyNight.plan(4,2,42),/configuration/);
assert.throws(()=>game.PartyNight.plan(3,0,42),/configuration/);
const session = game.PartyNight.create(['grandprix','grandprix','grandprix'],2);
for (let i=0;i<3;i++) game.PartyNight.record(session, i===1?['b','a']:['a','b']);
assert.equal(session.finished,true);
assert.equal(session.totals.get('a'),28);
assert.equal(session.totals.get('b'),26);
assert.equal(game.PartyNight.next(session),null);
assert.throws(()=>game.PartyNight.record(session,['a','b']),/finished/);
// Multi-mode state machine: no skipping, double-scoring or roster substitution.
const coord = game.PartyCoordinator;
const co = coord.start({playlist:['grandprix','grandprix','grandprix'], playerIds:['p1','p2']});
assert.equal(coord.current(co),'grandprix');
assert.equal(coord.snapshot(co).round,1);
assert.throws(()=>coord.complete(co,['p1','p2']),/no active/);
assert.equal(coord.begin(co),'grandprix');
assert.throws(()=>coord.begin(co),/cannot begin/);
assert.throws(()=>coord.complete(co,['p1','p1']),/every participant/);
assert.throws(()=>coord.complete(co,['p1','hacker']),/every participant/);
let first = coord.complete(co,['p2','p1']);
assert.equal(first.finished,false);
assert.equal(first.next,'grandprix');
assert.equal(coord.standings(co)[0].id,'p2');
for(let i=0;i<2;i++){
  coord.begin(co);
  const result = coord.complete(co,['p1','p2']);
  if(i===1)assert.equal(result.finished,true);
}
assert.equal(coord.current(co),null);
assert.equal(coord.snapshot(co).round,3);
assert.deepEqual(Array.from(coord.standings(co),p=>[p.id,p.points]),[['p1',28],['p2',26]]);
assert.throws(()=>coord.begin(co),/cannot begin/);
assert.throws(()=>coord.start({playlist:['grandprix','grandprix','grandprix'],playerIds:['p1','p1']}),/unique/);
console.log('PASS: fixed-roster Party Night transitions, score accumulation, eligibility, and replay guards.');
// Grand Prix adapter must award exactly the original points and statistics.
const racePlayer = (id) => ({
  id,points:0,races:0,wins:0,lastPlace:0,
  tot:{perfect:0,offs:0,bumps:0,maxAir:0,climb:0,topSpeed:0}
});
const raced = new Map([['a',racePlayer('a')],['b',racePlayer('b')]]);
const mark = (id,finished)=>({
  id,finished,finishTime:finished?12:0,
  stats:{perfect:1,offs:2,bumps:3,maxAir:4,climb:5,topSpeed:6}
});
const awarded = game.MODES.grandprix.roundResults({
  standings:[mark('b',true),mark('a',false)],players:raced,points:[10,8,6,5,4,3,2,1]
});
assert.deepEqual(Array.from(awarded),['b','a']);
assert.equal(raced.get('b').points,10);
assert.equal(raced.get('a').points,8);
assert.equal(raced.get('b').wins,1);
assert.equal(raced.get('b').tot.maxAir,4);
assert.deepEqual(Array.from(game.MODES.grandprix.finalResults(raced.values()),p=>p.id),['b','a']);
const inputCalls=[];
game.MODES.grandprix.onInput({world:{press:id=>inputCalls.push('p'+id),
 release:id=>inputCalls.push('r'+id),useItem:id=>inputCalls.push('i'+id)},pid:'a',k:'p'});
assert.deepEqual(inputCalls,['pa']);

const voteA={opts:[],votes:new Map(),picked:-1};
const voteRoster=new Map([['bot',{id:'bot',cpu:true,bot:{voteAt:0}}],['human',{id:'human',cpu:false}]]);
game.MODES.grandprix.startRound({cup:{played:[]},trackInfo:[
  {id:'a'},{id:'b'},{id:'c'},{id:'d'}],
  vote:voteA,players:voteRoster,random:()=>0.25,now:10});
assert.equal(voteA.opts.length,3);
assert.equal(voteA.endAt,22);
assert.ok(voteRoster.get('bot').bot.voteAt>11);
assert.equal(game.MODES.grandprix.castVote({state:'vote',vote:voteA,pid:'human',index:1}),true);
assert.equal(game.MODES.grandprix.castVote({state:'race',vote:voteA,pid:'human',index:2}),false);
assert.equal(voteA.votes.get('human'),1);
game.MODES.grandprix.resolveVote({vote:voteA,random:()=>0.5,now:25});
assert.equal(voteA.picked,1);
assert.equal(voteA.revealAt,26.6);
assert.equal(game.MODES.grandprix.castVote({state:'vote',vote:voteA,pid:'human',index:2}),false);
const botCast=[];
game.MODES.grandprix.botTick({state:'vote',players:voteRoster,vote:voteA,now:99,
 castVote:(id,n)=>botCast.push([id,n]),random:()=>.5});
assert.equal(botCast.length,1);
assert.equal(botCast[0][0],'bot');
assert.equal(game.MODES.grandprix.nextStep({cup:{race:2,n:4}}),'vote');
assert.equal(game.MODES.grandprix.nextStep({cup:{race:4,n:4}}),'finale');
const fakeWorld={time:25,goTime:0,firstFinishTime:20,allFinished:()=>true};
assert.equal(game.MODES.grandprix.shouldEnd({world:fakeWorld,endAt:0,photoPending:false}),27.2);
assert.equal(game.MODES.grandprix.shouldEnd({world:fakeWorld,endAt:24,photoPending:false}),true);
assert.equal(game.MODES.grandprix.shouldEnd({world:fakeWorld,endAt:24,photoPending:true}),false);
console.log('PASS: extracted Grand Prix track vote, CPU ballot and race transition decisions.');
console.log('PASS: extracted Grand Prix input, scoring and rankings remain compatible.');
const MR = require('../src/engine.js');
// Build-native Party Pack obstacles, accessible to a World without DOM.
const pb=MR.Builder({id:'party-qa',name:'Party QA',theme:'toybox'});
pb.start(2);
pb.line(200);
pb.pegs(0,100,3,2,50,50,9);
pb.spinner(200,100,30,3,1);
pb.bucket(350,300,60,80,250);
pb.movingGate(550,150,80,30,3);
pb.targetRing(700,0,50);
pb.cup(800,0,43,900);
pb.water(900,0,100,30);
pb.retractRim(0,0,620,15,75,110);
pb.finish();pb.runoff(100);
const partyTrack=pb.done();
assert.equal(partyTrack.partyObstacles.length,13);
const builtWorld=new MR.World(partyTrack,{seed:1,passing:false});
assert.equal(builtWorld.partyObstacles.length,13);
assert.equal(builtWorld.opts.passing,false);
console.log('PASS: Builder exposes all eight new Party Pack obstacle families.');
// Initial race order and object state must match the original Grand Prix flow.
const playerSet=new Map([
 ['a',{id:'a',name:'A',points:20}],
 ['b',{id:'b',name:'B',points:5}]
]);
const seed=421;
const gpRace=game.MODES.grandprix.createRace({
  WorldCtor:MR.World,tracks:MR.TRACKS,trackId:'toybox',seed,
  settings:{items:true,catchup:true},players:playerSet,random:MR.rng(seed)
});
assert.equal(gpRace.marbles.length,2);
assert.equal(gpRace.marbles[0].id,'a');
assert.equal(gpRace.goTime,7);
assert.equal(gpRace.marbles[0].appearT,0);
assert.equal(gpRace.opts.passing,true);
const bots=new Map([['cpu',{id:'cpu',cpu:true,bot:{skill:1,rel:0,voteAt:0}}]]);
const botWorld={
 time:2,goTime:7,marbles:[{id:'cpu',down:false,startUsed:false}],
 press(id){this.lastPress=id},release(){},get(){}
};
assert.equal(game.MODES.grandprix.botTick({
 state:'countdown',players:bots,vote:{opts:[]},now:5,world:botWorld,MR,
 random:()=>0
}),true);
console.log('PASS: GP World construction and CPU adapter inputs.');
const track = MR.TRACKS.toybox();
const gp = new MR.World(track,{seed:17});
const solid = new MR.World(MR.TRACKS.toybox(),{seed:17,passing:false});
assert.equal(gp.opts.passing,true,'Grand Prix default passing must stay enabled');
assert.equal(solid.opts.passing,false,'non-racing modes require real marble collision');
const geo = game.PartyGeometry;
const grid = geo.pegs(10,20,3,2,50,40,9);
assert.equal(grid.length,6);
assert.equal(grid[3].x,35);
assert.equal(grid[3].y,60);
const b = geo.bucket(100,300,50,80,250);
assert.equal(geo.inBucket(b,100,330),true);
assert.equal(geo.inBucket(b,180,330),false);
assert.equal(geo.inRing(geo.targetRing(0,0,30),18,24),true);
assert.equal(geo.inCup(geo.cup(30,120,43,900),30,800),true);
assert.equal(geo.inCup(geo.cup(30,120,43,900),30,1000),false);
const rim=geo.retractRim(0,0,620,15,75,110);
assert.equal(geo.rimAt(rim,0),620);
assert.equal(geo.rimAt(rim,75),110);
assert.equal(geo.rimAt(rim,45),365);
assert.throws(()=>geo.pegs(0,0,0,1,50,40),/grid/);
assert.throws(()=>geo.spinner(0,0,-1),/radius/);
assert.equal(geo.gatePosition(geo.movingGate(5,0,20,40,4),1),45);

// Opt-in collision and sensor integration: no impact on Grand Prix defaults.
const lobby = MR.TRACKS.lobby();
const pegWorld = new MR.World(lobby,{seed:1,free:true,partyObstacles:[{type:'peg',x:0,y:0,r:9,restitution:0.55}]});
const marble = pegWorld.addMarble('player');
marble.x=0; marble.y=-25; marble.vx=0; marble.vy=240;
pegWorld.collidePartyObstacles(marble);
assert.ok(marble.y<=-27,'peg must physically separate colliding marble');
assert.ok(marble.vy<0,'peg collision must reflect approaching velocity');
const sensors = new MR.World(MR.TRACKS.lobby(),{seed:1,free:true,partyObstacles:[{type:'bucket',x:0,y:0,width:100,height:80,points:250}]});
const sensorMarble=sensors.addMarble('p');
sensorMarble.x=0; sensorMarble.y=20;
sensors.checkPartySensors();
assert.equal(sensors.events.filter(e=>e.type==='party_sensor').length,1,'bucket entered');
sensors.checkPartySensors();
assert.equal(sensors.events.filter(e=>e.type==='party_sensor').length,1,'no repeated sensor event');
sensorMarble.x=400; sensors.checkPartySensors();
sensorMarble.x=0; sensors.checkPartySensors();
assert.equal(sensors.events.filter(e=>e.type==='party_sensor').length,2,'re-entry can trigger a new event');
assert.equal(new MR.World(MR.TRACKS.lobby(),{free:true}).partyObstacles.length,0,'Grand Prix worlds have no Party Pack obstacles');

const dwellWorld=new MR.World(MR.TRACKS.lobby(),{seed:1,free:true,
 partyObstacles:[{type:'bucket',x:0,y:0,width:100,height:80,points:250,dwell:.4}]});
const dw=dwellWorld.addMarble('dw');dw.x=0;dw.y=30;
dwellWorld.checkPartySensors(.2);
assert.equal(dwellWorld.events.filter(e=>e.type==='party_score').length,0);
dwellWorld.checkPartySensors(.19);
assert.equal(dwellWorld.events.filter(e=>e.type==='party_score').length,0);
dwellWorld.checkPartySensors(.02);
assert.equal(dwellWorld.events.filter(e=>e.type==='party_score').length,1);
dwellWorld.checkPartySensors(.5);
assert.equal(dwellWorld.events.filter(e=>e.type==='party_score').length,1,'bucket must score once');
dw.x=500;dwellWorld.checkPartySensors(.02);
dw.x=0;dwellWorld.checkPartySensors(.41);
assert.equal(dwellWorld.events.filter(e=>e.type==='party_score').length,2,'new entry may score again');
const ringWorld=new MR.World(MR.TRACKS.lobby(),{free:true,partyObstacles:[{
 type:'retractRim',x:0,y:0,initialRadius:200,start:0,end:20,minRadius:100}]});
const rm=ringWorld.addMarble('rm');rm.x=270;rm.y=0;rm.vx=200;rm.vy=0;
ringWorld.collidePartyObstacles(rm);
assert.ok(rm.x<=200-rm.r+1e-6,'shrinking rim should contain marble');
assert.ok(rm.vx<0,'moving rim must reverse outward velocity');
console.log('PASS: 400ms bucket dwell, one-shot scores, re-entry and shrinking rim bounce.');

console.log('PASS: optional peg collision and edge-triggered bucket sensor integration.');

// Deterministic skill-based plans; 30 independent seeds per game.
for(const mode of ['derby','dropzone','brawl','curling','golf']){
  for(let seed=1;seed<=30;seed++){
    const a=game.PartyBots.plan(mode,{targetX:0,halfWidth:575,energy:90,nearestDist:200},.7,seed);
    const b=game.PartyBots.plan(mode,{targetX:0,halfWidth:575,energy:90,nearestDist:200},.7,seed);
    assert.equal(JSON.stringify(a),JSON.stringify(b),mode+' CPU non-deterministic for seed '+seed);
  }
}
assert.equal(game.PartyBots.plan('dropzone',{targetX:110},1,4).x,110);
assert.throws(()=>game.PartyBots.plan('golf',{},-1,4),/Skill/);
console.log('PASS: 150 repeatable CPU planning samples across five future modes.');
console.log('PASS: deterministic peg, spinner, bucket, goal, water and shrinking-rim geometry.');
console.log('PASS: 6 mode descriptors, locked unfinished games, Party Points, Party Night ledger, and optional passing.');
