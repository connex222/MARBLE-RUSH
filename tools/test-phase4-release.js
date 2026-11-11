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
const audio=new Set((manifest.sounds||[]).map(v=>v.k));
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
for(const mode of modes){
 assert.ok(tv.includes('pp_'+mode+'_bg'),'Missing '+mode+' background integration');
 assert.ok(tv.includes('pp_'+mode+'_fx_'),'Missing '+mode+' FX integration');
}
const stage=require('../src/modes/party-presentation.js');
assert.equal(stage.theme('grandprix'),null,'Grand Prix must not receive Party Pack podium');
for(const mode of modes)assert.ok(stage.theme(mode),'No themed podium for '+mode);
console.log('PASS Phase 4 RC: 68 new art files, 200 total, 5 audio, TV/phone actions, all five modes, original GP isolated');
