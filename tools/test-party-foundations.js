/* Phase 2 foundation smoke tests — no browser, no artwork required. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
for (const name of ['registry','geometry','grandprix','derby','dropzone','brawl','curling','golf']) {
  vm.runInContext(fs.readFileSync(path.join(root,'src','modes',name+'.js'),'utf8'), ctx, {filename:name+'.js'});
}
const game = vm.runInContext('({MODES, PartyNight, partyPoints, PartyGeometry})', ctx);
const ids = Object.keys(game.MODES);
assert.equal(ids.length,6);
assert.deepEqual(ids,['grandprix','derby','dropzone','brawl','curling','golf']);
assert.equal(game.MODES.grandprix.available,true);
assert.equal(ids.filter(id => game.MODES[id].available).length,1,'unfinished games must remain locked');
for (const mode of Object.values(game.MODES)) {
  for (const fn of ['setup','startRound','tick','draw','onInput','onAction','botTick','hud','standings','roundResults','finalResults'])
    assert.equal(typeof mode[fn],'function',mode.id+'.'+fn);
}
assert.deepEqual(Array.from(game.partyPoints(['a','b','c']), ([id, points]) => [id, points]),[['a',10],['b',8],['c',6]]);
assert.throws(()=>game.partyPoints(['a','a']),/unique/);
assert.throws(()=>game.PartyNight.create(['grandprix','brawl','grandprix'],2),/unavailable/);
assert.throws(()=>game.PartyNight.create(['grandprix'],2),/3, 5 or 7/);
const session = game.PartyNight.create(['grandprix','grandprix','grandprix'],2);
for (let i=0;i<3;i++) game.PartyNight.record(session, i===1?['b','a']:['a','b']);
assert.equal(session.finished,true);
assert.equal(session.totals.get('a'),28);
assert.equal(session.totals.get('b'),26);
assert.equal(game.PartyNight.next(session),null);
assert.throws(()=>game.PartyNight.record(session,['a','b']),/finished/);
const MR = require('../src/engine.js');
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
console.log('PASS: deterministic peg, spinner, bucket, goal, water and shrinking-rim geometry.');
console.log('PASS: 6 mode descriptors, locked unfinished games, Party Points, Party Night ledger, and optional passing.');
