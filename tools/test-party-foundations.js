/* Phase 2 foundation smoke tests — no browser, no artwork required. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
for (const name of ['registry','grandprix','derby','dropzone','brawl','curling','golf']) {
  vm.runInContext(fs.readFileSync(path.join(root,'src','modes',name+'.js'),'utf8'), ctx, {filename:name+'.js'});
}
const game = vm.runInContext('({MODES, PartyNight, partyPoints})', ctx);
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
console.log('PASS: 6 mode descriptors, locked unfinished games, Party Points, Party Night ledger, and optional passing.');
