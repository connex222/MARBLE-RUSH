/* Marble Derby Phase 5 deterministic full-game acceptance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const file of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const D=vm.runInContext('MarbleDerby',ctx),MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.derby.available,true);
assert.equal(D.ROUNDS,5);
assert.equal(D.HORSES,6);
assert.deepEqual(Array.from(D.STAKES),[25,50,100,200]);
function run(seed,n=3){
 const roster=Array.from({length:n},(_,i)=>({id:'p'+i,name:'CPU '+i,cpu:true,color:'#ff3355'}));
 let callbacks=0,finalRanking;
 const game=D.create(roster,seed,ranking=>{callbacks++;finalRanking=Array.from(ranking,p=>({id:p.id,gems:p.gems,successful:p.successful}));});
 let loops=0;
 while(!game.state.done&&loops++<30000)game.step(.05);
 assert.equal(game.state.done,true,'Derby did not finish for seed '+seed);
 assert.equal(callbacks,1,'completion called multiple times');
 assert.equal(game.state.round,5);
 assert.equal(game.state.history.length,5);
 assert.equal(game.state.roster.length,n);
 for(const p of game.state.roster){
  assert.equal(p.bets.length,5,'five recorded bets or automatic selections');
  assert.ok(p.gems>=0,'no negative virtual gems');
  assert.equal(p.won,p.bets.reduce((v,b)=>v+b.payout,0));
  assert.ok(p.bets.every(b=>b.stake>=25&&b.payout>=0&&b.winner>=0&&b.winner<6));
  assert.equal(p.successful,p.bets.filter(b=>b.payout>0).length);
 }
 for(const heat of game.state.history){
  assert.equal(heat.places.length,6);
  assert.equal(new Set(heat.places).size,6);
  assert.equal(heat.bets.length,n);
 }
 game.step(.05);assert.equal(callbacks,1);
 assert.deepEqual(Array.from(game.standings(),p=>p.id),finalRanking.map(p=>p.id));
 return {finalRanking,history:Array.from(game.state.history,h=>({
  winner:h.winner,places:Array.from(h.places),bets:Array.from(h.bets,b=>({
    id:b.id,horse:b.horse,stake:b.stake,payout:b.payout
  }))
 }))};
}
const reference=run(444,2);
assert.deepEqual(run(444,2),reference);
for(let seed=1;seed<=30;seed++)assert.deepEqual(run(seed,3),run(seed,3),'seed '+seed+' replay differs');
assert.equal(run(42,8).finalRanking.length,8);
assert.throws(()=>D.create([],3),/1–8/);
assert.throws(()=>D.create(Array.from({length:9},(_,i)=>({id:String(i)})),3),/1–8/);
assert.throws(()=>D.create([{id:'a'},{id:'a'}],3),/unique/);
const g=D.create([{id:'alice',cpu:false},{id:'bob',cpu:false}],12);
assert.equal(g.action('intruder','bet',{horse:0,stake:50}),false);
assert.equal(g.action('alice','bet',{horse:-1,stake:50}),false);
assert.equal(g.action('alice','bet',{horse:0,stake:999}),false);
assert.equal(g.action('alice','stake',200),true);
assert.equal(g.hud('alice').stake,200);
const before=g.state.roster[0].gems;
assert.equal(g.action('alice','bet',{horse:0,stake:200}),true);
assert.equal(g.state.roster[0].gems,before-200);
assert.equal(g.action('alice','bet',{horse:1,stake:200}),false,'duplicate bet blocked');
assert.equal(g.action('bob','bet',{horse:1,stake:50}),true);
for(let i=0;i<500&&g.state.phase!=='racing';i++)g.step(.05);
assert.equal(g.state.phase,'racing');
assert.equal(g.action('alice','cheer'),true);
assert.equal(g.action('alice','cheer'),false,'cheer once per heat');
assert.equal(g.action('intruder','cheer'),false);
const lonely=D.create([{id:'human',cpu:false}],17);
let guard=0;
while(lonely.state.phase==='betting'&&guard++<400)lonely.step(.05);
assert.equal(lonely.state.phase,'racing','inactive human auto-pick');
assert.equal(lonely.state.wagers.size,1);
console.log('PASS: Marble Derby 30 seeded five-heat three-CPU full games × 2 deterministic replays; 8 players, gems, payouts, ownership and cheering.');
