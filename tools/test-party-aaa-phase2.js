/* MARBLE RUSH Phase 2: deterministic mechanics and backwards-compatibility */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const f of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
  vm.runInContext(fs.readFileSync(path.join(root,'src/modes',f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const D=vm.runInContext('MarbleDerby',ctx),Z=vm.runInContext('DropZone',ctx),
 B=vm.runInContext('BowlBrawl',ctx),C=vm.runInContext('MarbleCurling',ctx),
 G=vm.runInContext('MarbleGolf',ctx),P=vm.runInContext('PartyBots',ctx),
 MODES=vm.runInContext('MODES',ctx);
const people=(n=3,skill='normal')=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'Marble '+i,cpu:true,difficulty:skill}));
const signature=g=>JSON.stringify({history:g.state.history||g.state.roundHistory,
 roster:g.state.roster.map(p=>({id:p.id,score:p.score,points:p.points,strokes:p.strokes,gems:p.gems}))});
function play(mode,seed,n=3,opts){
 let calls=0,game;
 const finish=()=>calls++;
 if(mode==='derby') game=D.create(people(n),seed,finish);
 if(mode==='dropzone')game=Z.create(people(n),seed,finish);
 if(mode==='brawl')game=B.create(people(n),seed,finish);
 if(mode==='curling')game=C.create(people(n),seed,finish);
 if(mode==='golf')game=G.create(people(n),seed,finish,opts);
 let ticks=0;
 while(!game.state.done&&ticks++<140000){(game.step||game.tick)(.1);}
 assert.equal(game.state.done,true,mode+' failed seed '+seed+' within bounded simulation');
 assert.equal(calls,1,mode+' completion callback ran '+calls+' times');
 assert.ok(ticks<140000,mode+' required too many steps');
 return {signature:signature(game),game,ticks};
}
// Seed independence of presentation: access render-side event arrays does not change game state.
for(const mode of ['derby','dropzone','brawl','curling','golf']){
 for(let seed=1;seed<=30;seed++){
  const a=play(mode,seed,3),b=play(mode,seed,3);
  assert.equal(a.signature,b.signature,mode+' non-deterministic for seed '+seed);
 }
 assert.equal(play(mode,713,8).game.state.roster.length,8,mode+' eight-player match');
 console.log('PASS: '+mode+' 30 seeded full games × 2 replays, 8 players, one finish callback');
}
assert.equal(G.LAYOUTS.length,5,'Legacy Golf five holes must be unchanged');
assert.equal(G.FULL_HOLES,9);
const champ=play('golf',231,2,{championship:true}).game;
assert.equal(champ.state.hole,9);
assert.equal(champ.state.history.length,9);
assert.ok(champ.state.history.every(h=>h.scores.length===2));
assert.equal(MODES.golf.roundsDefault,9);
const gp=new Map(people(2).map(x=>[x.id,x]));
assert.equal(MODES.golf.setup({players:gp,seed:88,onFinish:()=>{},championship:true}).state.holes,9);
assert.equal(MODES.golf.setup({players:gp,seed:88,onFinish:()=>{},championship:false}).state.holes,5);
const tvJS=fs.readFileSync(path.join(root,'src/tv.js'),'utf8');
for(const key of ["'curlleft'","'curlright'","'predict'","'spectate'","'preview'"])
 assert.ok(tvJS.includes(key),'TV did not route new phone action '+key);
assert.ok(tvJS.includes('championship: !partyRun'),'Party Night must use five Golf holes');
assert.ok(G.CHAMPIONSHIP_HOLES.some(h=>h.moving==='windmill'));
assert.ok(G.CHAMPIONSHIP_HOLES.some(h=>h.moving==='flipper'));
assert.ok(G.CHAMPIONSHIP_HOLES.some(h=>h.moving==='tunnel'));
assert.ok(G.CHAMPIONSHIP_HOLES.some(h=>h.moving==='gate'));
const demo=G.create([{id:'a'},{id:'b'}],9,()=>{},{championship:true});
assert.equal(demo.action('a','preview'),true);
assert.ok(demo.state.ghost&&Number.isFinite(demo.state.ghost.x));
assert.equal(demo.action('b','preview'),false);
assert.equal(demo.action('b','cheer'),true);
assert.equal(demo.action('b','cheer'),false);
assert.equal(demo.action('a','shoot'),true);
assert.equal(demo.action('a','shoot'),false);
assert.equal(demo.state.events.some(e=>e.kind==='shot'),true);
assert.equal(demo.state.events.some(e=>e.kind==='flyThrough'),true);
console.log('PASS: 9-hole championship + moving obstacles, five-hole legacy, preview and spectator cheer');
// Feature assertions, including data shapes that VFX/camera/audio can consume in Phase 4.
const derby=D.create([{id:'a'},{id:'b'}],13);
assert.equal(derby.state.course,'Straight Sprint');
assert.ok(derby.state.horses.every(h=>h.speed>0&&h.endurance>0&&h.consistency>0));
assert.ok(derby.hud('a').formGuide.length===6);
assert.equal(derby.action('a','bet',{horse:0,stake:50}),true);
assert.equal(derby.action('b','bet',{horse:1,stake:50}),true);
for(let i=0;i<100&&derby.state.phase!=='racing';i++)derby.step(.1);
assert.equal(derby.action('a','cheer'),true);
assert.equal(derby.action('a','cheer'),false);
assert.ok(derby.state.hype>0);
assert.ok(derby.state.events.some(e=>e.kind==='cheer'&&Number.isFinite(e.x)));
assert.equal(derby.action('outside','cheer'),false);
const dz=Z.create([{id:'a'},{id:'b'}],21);
assert.equal(dz.state.gold.length,2);
assert.ok(dz.state.gold.every(i=>i>=0&&i<Z.PEGS.length));
assert.equal(dz.state.events[0].kind,'round_start');
assert.equal(dz.action('a','drop'),true);
assert.equal(dz.action('b','predict',3),true);
assert.equal(dz.action('b','predict',3),false);
assert.equal(dz.action('outside','predict',3),false);
assert.equal(dz.action('b','predict',99),false);
assert.equal(dz.hud('b').modeControls.length,0);
const bb=B.create([{id:'a'},{id:'b'},{id:'c'}],31);
assert.equal(bb.state.hazard,'bumpers');
assert.equal(bb.state.events.some(e=>e.kind==='hazardReveal'),true);
const knocked=bb.current('a');knocked.x=2000;knocked.y=0;bb.tick(.1);
assert.equal(bb.action('a','spectate'),true);
assert.equal(bb.action('a','spectate'),false);
assert.equal(bb.action('a','ram'),false);
const curl=C.create([{id:'a'},{id:'b'}],31);
assert.equal(curl.action('b','curlright'),false);
assert.equal(curl.action('a','curlright'),true);
assert.equal(curl.action('a','curlleft'),true);
assert.equal(curl.action('a','curlright'),true);
assert.equal(curl.action('a','throw'),true);
assert.ok(curl.state.moving.spin>0);
assert.equal(curl.action('a','sweep'),true);
assert.equal(curl.action('a','sweep'),false,'sweep rhythm rejects same-frame spam');
assert.ok(curl.state.events.some(e=>e.kind==='throw'&&e.spin>0));
assert.equal(curl.action('b','predict',0),true);
assert.equal(curl.action('b','predict',1),false);
for(let seed=1;seed<=50;seed++){
 assert.deepEqual(P.plan('curling',{angle:4,power:.7},.7,seed),P.plan('curling',{angle:4,power:.7},.7,seed));
}
assert.throws(()=>P.plan('brawl',{},2,1),/Skill/);
console.log('PASS: seeded form, race cheer, gold pegs, spectator prediction, hazards, spin and sweep input validation');
console.log('PHASE 2 AAA GAMEPLAY ACCEPTANCE PASS');
