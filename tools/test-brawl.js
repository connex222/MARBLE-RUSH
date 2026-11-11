/* Phase 4 Bowl Brawl deterministic 30-seed gameplay acceptance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const file of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
 vm.runInContext(fs.readFileSync(path.join(root,'src/modes',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const B=vm.runInContext('BowlBrawl',ctx),MODES=vm.runInContext('MODES',ctx);
assert.equal(MODES.brawl.available,true,'Bowl Brawl has a new independent TV UI');
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
// MAYHEM v3: every new moment of danger is authoritative and deterministic.
assert.deepEqual(Array.from(B.SHOCK_TIMES),[4,12,24]);
assert.equal(B.RECOVER_COST,35);
assert.equal(B.KO_BONUS,3);
const roster=[{id:'alpha'},{id:'bravo'}];
const pulse=B.create(roster,100);
assert.equal(pulse.state.pulseAt,4);
const aa=pulse.current('alpha'),bb=pulse.current('bravo');
aa.x=200;aa.y=0;aa.vx=0;aa.vy=0;aa.anchored=.7;
bb.x=-200;bb.y=0;bb.vx=0;bb.vy=0;bb.anchored=0;
pulse.state.elapsed=3.99;pulse.state.time=3.99;
pulse.tick(.05);
assert.equal(pulse.state.pulseIndex,1);
assert.equal(pulse.state.pulseAt,12);
assert.ok(pulse.state.events.some(e=>e.kind==='shockwave'&&e.pulse===1));
assert.ok(Math.abs(bb.vx)>Math.abs(aa.vx)*2,
  'A pre-timed anchor must mitigate the pulse, not merely add a visual effect');
pulse.tick(.05);
assert.equal(pulse.state.events.filter(e=>e.kind==='shockwave').length,1,
  'Pulses must not repeat over multiple fixed steps');
const safe=B.create(roster,121);
const target=safe.current('alpha');
assert.equal(safe.action('alpha','recover'),false,'Recover only near the rim');
target.x=safe.state.radius-22-45;target.y=0;target.vx=120;target.vy=0;
assert.equal(safe.hud('alpha').recoverReady,true);
assert.equal(safe.action('bravo','recover'),false,'Cannot recover someone else');
assert.equal(safe.action('alpha','recover'),true);
assert.equal(target.energy,75-B.RECOVER_COST);
assert.ok(target.vx<0,'Recovery must provide real inward momentum');
assert.equal(target.recoverUsed,true);
assert.equal(safe.action('alpha','recover'),false,'Only one recovery per round');
assert.ok(safe.state.events.some(e=>e.kind==='recover'&&e.id==='alpha'));
assert.equal(safe.hud('alpha').recoveryUsed,true);
const hit=B.create(roster,14);
const attacker=hit.current('alpha'),victim=hit.current('bravo');
attacker.x=0;attacker.y=0;attacker.vx=0;attacker.vy=0;attacker.heading=0;
victim.x=43;victim.y=0;victim.vx=0;victim.vy=0;victim.heading=Math.PI;
assert.equal(hit.action('alpha','ram'),true);
hit.tick(.04);
assert.equal(victim.lastHitBy,'alpha','Charged collision must identify attacker');
victim.x=410;victim.y=0;
hit.tick(.04);
assert.ok(hit.state.events.some(e=>e.kind==='knockout'&&e.id==='alpha'&&e.victim==='bravo'&&e.bonus===3),
 'Only confirmed RAM knockouts earn bounty');
assert.equal(hit.state.roster[0].roundPoints[0],13,
 'First-place 10 and knockout 3 must count together');
assert.equal(hit.state.roster[0].knockouts,1);
const noCredit=B.create(roster,16);
noCredit.current('bravo').x=999;noCredit.current('bravo').y=999;
noCredit.tick(.05);
assert.equal(noCredit.state.events.some(e=>e.kind==='knockout'),false,
 'Falling off without a credited RAM must not award bonus points');
assert.ok(!noCredit.state.roster[0].roundPoints[0] ||
  noCredit.state.roster[0].roundPoints[0]===10,'Free knockouts forbidden');
const timedBrace=B.create(roster,18);
timedBrace.state.elapsed=1.2;timedBrace.state.time=1.2;
assert.equal(timedBrace.action('alpha','anchor'),true);
assert.ok(timedBrace.current('alpha').anchored>2.8,
  'ANCHOR during the warning must remain active until shock impact');
const ledge=B.create(roster,22);
const clinging=ledge.current('alpha');
clinging.x=ledge.state.radius-22-1;
clinging.y=0;clinging.vx=510;clinging.vy=0;
ledge.tick(.05);
assert.equal(clinging.alive,true,'Crossing the rim must offer a visible escape chance');
assert.equal(clinging.edgeHanging,true,'Edge cling event not activated');
assert.ok(ledge.hud('alpha').recoverReady,'Phone never receives emergency recovery');
assert.ok(ledge.state.events.some(e=>e.kind==='edgeHang'));
assert.equal(ledge.action('alpha','recover'),true,'Rescue must work while hanging');
assert.equal(clinging.edgeHanging,false);
const ledgeFall=B.create(roster,23);
const doomed=ledgeFall.current('alpha');
doomed.x=ledgeFall.state.radius-22-1;doomed.y=0;
doomed.vx=510;doomed.vy=0;
ledgeFall.tick(.05);
let climb=0;
while(doomed.alive&&climb++<40)ledgeFall.tick(.05);
assert.equal(doomed.alive,false,'An ignored lip danger must still become elimination');

const finale=B.create(roster,20);
finale.state.round=5;
finale.current('bravo').lastHitBy='alpha';
finale.current('bravo').lastHitTime=finale.state.time;
finale.current('bravo').x=999;
finale.tick(.05);
assert.equal(finale.state.done,true,'Final round must finish normally');
assert.ok(finale.state.events.some(e=>e.kind==='knockout'&&e.bonus===5),
  'Final-round comeback knockout must award +5');
assert.equal(finale.state.roster[0].roundPoints[0],15,
  'Final-round winner must receive 10 placement plus 5 KO bonus');
console.log('PASS MAYHEM: telegraphed deterministic shockwave, anchor counterplay, one energy-funded edge save, credited +3 knockout and no unearned points.');

console.log('PASS: Bowl Brawl 30 seeded 3-CPU full games × 2 deterministic replays, five rounds, eight-player capacity, rim, ownership and energy.');
