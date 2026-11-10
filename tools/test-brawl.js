/* Phase 4 Bowl Brawl deterministic 30-seed gameplay acceptance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const file of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const B=vm.runInContext('BowlBrawl',ctx),MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.brawl.available,true);
assert.equal(B.ROUNDS,5);
function run(seed,n=3){
 const roster=Array.from({length:n},(_,i)=>({id:'p'+i,name:'CPU '+i,cpu:true,color:'#ff3355'}));
 let callbackCount=0,final;
 const game=B.create(roster,seed,r=>{callbackCount++;final=Array.from(r,p=>({id:p.id,points:p.points,roundPoints:Array.from(p.roundPoints),roundRanks:Array.from(p.roundRanks)}));});
 let loops=0;
 while(!game.state.done&&loops++<40000)game.tick(.05);
 assert.equal(game.state.done,true,'game did not complete for seed '+seed);
 assert.equal(callbackCount,1,'completion callback must fire exactly once');
 assert.equal(game.state.round,5);
 assert.equal(game.state.roundHistory.length,5);
 assert.equal(final.length,n);
 for(const p of final){
  assert.equal(p.roundPoints.length,5);
  assert.equal(p.roundRanks.length,5);
  assert.equal(p.points,p.roundPoints.reduce((a,b)=>a+b,0));
  assert.ok(p.points>=10);
 }
 for(const rank of game.state.roundHistory){
  assert.equal(rank.length,n);
  assert.equal(new Set(rank).size,n);
 }
 game.tick(.1);assert.equal(callbackCount,1);
 return {final,history:Array.from(game.state.roundHistory,round=>Array.from(round))};
}
const first=run(2468,2);
assert.deepEqual(run(2468,2),first,'replay diverged');
for(let seed=1;seed<=30;seed++)assert.deepEqual(run(seed,3),run(seed,3),'seed '+seed+' diverged');
assert.equal(run(987,8).final.length,8);
assert.throws(()=>B.create([{id:'one'}],1),/2–8/);
assert.throws(()=>B.create(Array.from({length:9},(_,i)=>({id:String(i)})),1),/2–8/);
const human=B.create([{id:'a'},{id:'b'},{id:'c'}],2);
assert.equal(human.action('bogus','ram'),false,'unknown client cannot act');
assert.equal(human.action('a','aim',Infinity),false);
assert.equal(human.action('a','left',6),false);
assert.equal(human.action('a','ram'),true);
assert.equal(human.action('a','ram'),false,'energy or cooldown must prevent ram spam');
assert.ok(human.current('a').energy<75);
assert.equal(human.action('b','anchor'),true);
assert.equal(human.current('b').anchored>0,true);
const radius=B.START_RADIUS;
assert.equal(human.rimRadius(0),radius);
assert.equal(human.rimRadius(B.ROUND_TIME),B.END_RADIUS);
const before=human.state.marbles[0].heading;
assert.equal(human.action('a','left',2),true);
assert.notEqual(human.state.marbles[0].heading,before);
const out=human.current('a');out.x=1000;out.y=1000;
human.tick(.05);
assert.equal(out.alive,false,'outside marble must be eliminated');
assert.equal(human.action('a','ram'),false,'eliminated player cannot ram');
console.log('PASS: Bowl Brawl 30 seeded 3-CPU full games × 2 deterministic replays, five rounds, eight-player capacity, rim, ownership and energy.');
