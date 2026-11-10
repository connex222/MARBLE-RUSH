'use strict';
/* Phase 8 regression guard: all six modes must be wired end-to-end, not merely registered. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const tv=read('src/tv.js'), html=read('src/tv.html'), phone=read('src/play.html'), build=read('tools/build.js');
for(const mode of ['grandprix','derby','dropzone','brawl','curling','golf']){
  assert.match(build,new RegExp("'"+mode+"'"),'Mode not baked: '+mode);
  assert.match(tv,new RegExp("selectedMode === '"+mode+"'|selectedMode==='"+mode+"'|MODES\\."+mode+"\\.setup"),'Mode cannot start: '+mode);
}
for(const token of [
  "state='golf'","showScreen('golf')","finishGolf(ranking)","MODES.golf.tick(dt)",
  "MODES.golf.draw(","MODES.golf.onAction(","MODES.golf.hud(p)",
  "MODES.golf.onInput(pid,k)","state === 'golf' && players.has(pid)"
])assert.ok(tv.includes(token),'Golf runtime missing '+token);
for(const id of ['golfCanvas','golfLeft','golfRight','golfDown','golfUp','golfShoot'])
  assert.match(html,new RegExp('id="'+id+'"'),'Missing TV control '+id);
assert.ok(html.includes('data-screen="golf"'),'Missing golf screen');
for(const token of ["case 'golf':","'golf'].includes(h.s)","modeControls"])
  assert.ok(phone.includes(token),'Missing phone routing '+token);
for(const token of ["'left','right','aim','power','powerup','powerdown','shoot'","state==='golf'"])
  assert.ok(tv.includes(token),'Unvalidated actions '+token);
console.log('PASS: Phase 8 all six modes registered, Golf routed TV/phone/action/HUD/results');
