'use strict';
/* UI v2 contract: six engines, five replacement stages, no legacy canvases. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const tv=read('src/tv.js');
const html=read('src/tv.html');
const phone=read('src/play.html');
const build=read('tools/build.js');
for(const mode of ['grandprix','derby','dropzone','brawl','curling','golf']){
 assert.ok(build.includes("'"+mode+"'"),'Uncompiled engine: '+mode);
 assert.ok(tv.includes("selectedMode === '"+mode+"'") ||
   tv.includes("selectedMode==='"+mode+"'") ||
   tv.includes('MODES.'+mode+'.setup'),'Mode cannot launch: '+mode);
}
for(const name of ['party-ui-v2','party-brawl-ui-v2','party-curling-ui-v2','party-golf-ui-v2']){
 assert.ok(build.includes("'"+name+"'"),'Uncompiled stage: '+name);
 assert.ok(read('src/modes/'+name+'.js').length>1000,'Empty new stage: '+name);
}
for(const renderer of ['MarblePartyUI.drawDerby','MarblePartyUI.drawDropZone',
 'MarbleBrawlUI.draw','MarbleCurlingUI.draw','MarbleGolfUI.draw']){
 assert.ok(tv.includes(renderer),'Replacement renderer not connected: '+renderer);
}
assert.ok(html.includes('data-screen="party-stage"'));
assert.ok(html.includes('id="partyStageCanvas"'));
for(const old of ['derbyCanvas','dropZoneCanvas','brawlCanvas','curlingCanvas','golfCanvas',
 'golfLeft','golfRight','golfDown','golfUp','golfShoot']){
 assert.ok(!html.includes('id="'+old+'"'),'Legacy screen/control still exists: '+old);
}
for(const id of ['ppGolfHud','ppGolfPanel','ppGolfRankRows','ppGolfStandings',
 'ppGolfLeft','ppGolfRight','ppGolfPowerUp','ppGolfPowerDown','ppGolfPreview','ppGolfShoot']){
 assert.ok(html.includes('id="'+id+'"'),'Missing independent Golf HUD control '+id);
}
for(const text of ['MODES.golf.tick(dt)','MODES.golf.onAction(','finishGolf(ranking)']){
 assert.ok(tv.includes(text),'Golf game routing changed: '+text);
}
assert.ok(phone.includes("case 'golf':")&&phone.includes('modeControls')&&
 phone.includes('id="golfGuide"'),'Golf phone UI missing');
assert.ok(!tv.includes('MarblePartyStage'),'Obsolete painter reintroduced');
assert.ok(html.includes('id="partyBackLobby"')&&phone.includes('id="hostExitGame"'));
assert.ok(html.includes('id="raceHud"'),'Original Grand Prix display was removed');
console.log('PASS: Phase 8 six engines, all five new UIs, Golf controls, phone and Grand Prix isolation');
