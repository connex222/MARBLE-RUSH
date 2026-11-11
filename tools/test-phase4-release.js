'use strict';
/**
 * Phase 4 release-candidate gate. Run AFTER npm run build.
 * Does not change production files, physics, assets or Git history.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const get=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const manifest=JSON.parse(get('public/assets/manifest.json'));
const images=new Map(manifest.images.map(v=>[v.k,v.f]));
const audio=new Set((manifest.audio||[]).map(v=>v.k));
const modes=['derby','dropzone','brawl','curling','golf'];
let checked=0;
function exists(key){
  assert.ok(images.has(key),'Missing built asset: '+key);
  const out=path.join(ROOT,'public/assets/img',images.get(key));
  assert.ok(fs.existsSync(out)&&fs.statSync(out).size>100,'Empty/missing built image: '+key);
  checked++;
}
const fx={
  derby:['dust','speed','photo','confetti','impact','sunset','laurel','surge'],
  dropzone:['peg','jackpot','fall','coins','multiplier','chime','superjackpot','confetti'],
  brawl:['impact','shockwave','ko','dust','warning','spin','victory','ricochet'],
  curling:['impact','sweep','scrape','mist','target','victory','ricochet','aurora'],
  golf:['putt','roll','holeinone','cup','ricochet','sunset','flag','confetti'],
  shared:['impact','start','boost','select','crown','confetti','dust','finale']
};
for(const mode of modes){
 exists('pp_'+mode+'_bg');
 exists('pp_'+mode+'_surface_main');
 for(const name of ({
  derby:['grandstand','hay_bales'],dropzone:['glass_chute','gold_bucket'],
  brawl:['spin_hazard','striped_bumper'],curling:['alpine_lodge','ice_blocks'],
  golf:['windmill','stone_bridge']
 })[mode])exists('pp_'+mode+'_prop_'+name);
 for(const k of fx[mode])exists('pp_'+mode+'_fx_'+k);
}
for(const k of fx.shared)exists('pp_shared_fx_'+k);
assert.equal(checked,68,'Phase 3 approved asset list unexpectedly changed');
assert.equal(images.size,200,'Unexpected built image count: '+images.size);
assert.equal(audio.size,5,'Unexpected bundled audio count: '+audio.size);
for(const k of ['music_party','vo_party_intro','sfx_ui_tap','sfx_bumper','sfx_trophy'])
 assert.ok(audio.has(k),'Missing approved audio: '+k);
const tv=get('public/tv.html');
const phone=get('public/play.html');
for(const id of ['partyBackLobby','partyFinaleStage','partyPresentationCSS','pp_shared_fx_confetti'])
 assert.ok(tv.includes(id),'Missing TV navigation/visual feature: '+id);
assert.ok(phone.includes('hostExitGame'),'Missing host-phone lobby action');
assert.ok(tv.includes('MarblePartyUI.drawDerby'),'Missing new Derby stage renderer');
assert.ok(tv.includes('MarblePartyUI.drawDropZone'),'Missing new Drop Zone stage renderer');
assert.ok(tv.includes('MarbleBrawlUI.draw'),'Missing new Bowl Brawl renderer');
assert.ok(tv.includes('partyStageCanvas'),'Missing independent Party Pack stage');
assert.ok(tv.includes('pp_derby_bg'),'Approved Derby background not wired');
assert.ok(tv.includes('pp_derby_surface_main'),'Approved track material not wired');
assert.ok(!tv.includes('MarblePartyStage'),'Legacy Party Pack drawing layer was not removed');
for(const id of ['derbyCanvas','dropZoneCanvas','brawlCanvas','curlingCanvas','golfCanvas'])
 assert.ok(!tv.includes(id),'Old mode canvas still compiled: '+id);
assert.ok(tv.includes('PartyPresentation.applyFinale'),'Missing thematic podium integration');
const stage=require('../src/modes/party-presentation.js');
assert.equal(stage.theme('grandprix'),null,'Grand Prix must not receive Party Pack podium');
for(const mode of modes)assert.ok(stage.theme(mode),'No themed podium for '+mode);
console.log('PASS UI v2 asset gate: 68 approved art files, 200 total, 5 audio, three replacement stages and preserved GP');
