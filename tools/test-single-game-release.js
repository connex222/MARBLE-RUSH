/* MARBLE RUSH public product gate: only Grand Prix with seven tracks.
 * Run: node tools/test-single-game-release.js
 * For public UI + two real browser phone sessions, run the browser smoke.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');
const tv=read('src/tv.js'),markup=read('src/tv.html'),phone=read('src/play.html');
const engine=read('src/engine.js');
assert.ok(tv.includes('const BRAWL_PUBLISHED = false;'),
  'Bowl Brawl is still published');
assert.ok(tv.includes("get('partyQa') === '1'"),
  'legacy QA must require explicit opt-in');
assert.ok(tv.includes('/^(localhost|127\\.0\\.0\\.1)$/'),
  'legacy QA must be limited to loopback hosts');
assert.ok(tv.includes("const isPublishedMode = id => id === 'grandprix' ||"),
  'Grand Prix is no longer the default published mode');
assert.ok(tv.includes("if(picker)picker.hidden=!PARTY_LOCAL_QA"),
  'public TV mode selection is not hidden');
assert.ok(tv.includes("if(!PARTY_LOCAL_QA){box.replaceChildren();return;}"),
  'public TV could show a mode card');
assert.ok(tv.includes("if(!PARTY_LOCAL_QA){selectedMode='grandprix';partyLength=0;}"),
  'return to lobby must restore the single racing game');
assert.ok(tv.includes("availableModes: PARTY_LOCAL_QA?"),
  'public phone HUD must not offer discontinued modes');
assert.ok(tv.includes("partyNightEnabled: PARTY_LOCAL_QA"),
  'public Party Night is still enabled');
assert.ok(tv.includes("&& isPublishedMode(v))"),
  'a direct phone mode action could bypass release gate');
assert.ok(tv.includes("if (!isPublishedMode(selectedMode) ||"),
  'an unpublished mode could be started directly');
assert.ok(markup.includes('id="partyPicker" aria-label="Internal game-mode QA only" hidden'),
  'public lobby mode picker is visible by default');
assert.ok(markup.includes('id="btnStart" disabled>Start the Cup'),
  'original Grand Prix start control is missing');
assert.ok(markup.includes('id="lobbySettings"')&&markup.includes('id="lobbyPlayers"'),
  'original racer lobby / settings are missing');
assert.ok(phone.includes("if(mode.id!=='grandprix')vip.push"),
  'host phone has an unnecessary game mode choice');
assert.ok(phone.includes("send({ t:'in', k:'p' })")&&phone.includes("send({ t:'in', k:'r' })"),
  'original tap / hold race control has been broken');
for(const track of ['toybox','candy','ice','space','jungle','seaside','clockwork']){
 assert.ok(new RegExp('\\b'+track+'\\b').test(engine),
   'missing Grand Prix track '+track);
}
console.log('PASS: single publicly available Marble Rush Grand Prix, hidden Party Pack, protected phone boost and all seven tracks.');
