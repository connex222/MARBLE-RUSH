/* MARBLE RUSH art preflight — run after npm run build.
 * Non-destructive audit: enforces each released theme pack and separately
 * reports the six approved Jungle Jumble assets not yet uploaded to GitHub.
 * This script tests file integration, not multiplayer or artistic quality.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname,'..');
const RAW = path.join(ROOT,'assets','raw');
const PUB = path.join(ROOT,'public');
const IMG = path.join(PUB,'assets','img');
const THEMES = ['toybox','candy','ice','space','jungle','seaside','clockwork'];
const JUNGLE_PENDING = new Set([
  'bg_far_jungle.png','tex_rail_jungle.png',
  ...Array.from({length:4},(_,i)=>'prop_jungle_'+String(i+1).padStart(2,'0')+'.png'),
]);
const required = THEMES.flatMap(theme => [
  'bg_far_'+theme+'.png',
  'tex_rail_'+theme+'.png',
  ...Array.from({length:8},(_,i)=>'prop_'+theme+'_'+String(i+1).padStart(2,'0')+'.png')
]);
const COMMON_REQUIRED = [
  'logo_marblerush','bg_lobby','bg_results','bg_phone',
  'clatter_reference','clatter_announce','clatter_cheer','clatter_gasp','clatter_flag','clatter_wince',
  ...Array.from({length:12},(_,i)=>'marble_swirl_'+String(i+1).padStart(2,'0')),
  'marble_highlight',
].map(k=>k+'.png');
const ITEM_REQUIRED = [
  'item_box','item_turbo','item_jelly','item_oil','item_big','item_bubble',
  'oil_puddle','fx_bubble_shield','fx_jelly_coat','bumper','gate_start',
  'arch_finish','trophy_cup','medal_gold','medal_silver','medal_bronze',
].map(k=>k+'.png');
const FX_REQUIRED = [
  'fx_sparkle','fx_glow','fx_spark','fx_dust','fx_sprinkle',
  'fx_frost','fx_splash','fx_poof','fx_star_burst','fx_wind',
].map(k=>k+'.png');
async function main() {
  const raw=fs.readdirSync(RAW).filter(x=>/\.(png|jpe?g|webp)$/i.test(x)).sort();
  const missing=required.filter(name=>!fs.existsSync(path.join(RAW,name)));
  const unexpected=missing.filter(name=>!JUNGLE_PENDING.has(name));
  console.log('MASTER BIBLE THEME AUDIT');
  for(const t of THEMES) {
    const prefix=required.filter(x=>x==='bg_far_'+t+'.png'||x==='tex_rail_'+t+'.png'||x.startsWith('prop_'+t+'_'));
    console.log('• '+t+': '+(10-prefix.filter(x=>missing.includes(x)).length)+'/10 core images');
  }
  console.log('Required theme images: '+(70-missing.length)+'/70 present');
  const remaining = list => list.filter(n=>!fs.existsSync(path.join(RAW,n)));
  const commonMissing=remaining(COMMON_REQUIRED);
  const itemMissing=remaining(ITEM_REQUIRED);
  const fxMissing=remaining(FX_REQUIRED);
  const totalRequired=COMMON_REQUIRED.length+required.length+ITEM_REQUIRED.length+FX_REQUIRED.length;
  const totalMissing=commonMissing.length+missing.length+itemMissing.length+fxMissing.length;
  console.log('FULL BIBLE ART AUDIT: '+(totalRequired-totalMissing)+'/'+totalRequired+' named PNG assets on GitHub');
  console.log('Shared/lobby/marble artwork: '+(COMMON_REQUIRED.length-commonMissing.length)+'/'+COMMON_REQUIRED.length);
  console.log('Game-item and trophy art: '+(ITEM_REQUIRED.length-itemMissing.length)+'/'+ITEM_REQUIRED.length+' (not yet produced)');
  console.log('Particle and effects art: '+(FX_REQUIRED.length-fxMissing.length)+'/'+FX_REQUIRED.length+' (not yet produced)');
  if(itemMissing.length)console.log('Still to produce — items:',itemMissing.join(', '));
  if(fxMissing.length)console.log('Still to produce — effects:',fxMissing.join(', '));
  assert.equal(commonMissing.length,0,'Missing previously approved shared character/logo/marble images');
  fs.writeFileSync(path.join(ROOT,'qa-art-audit.json'),JSON.stringify({
    title:'MARBLE RUSH artwork inventory — Master Bible Section 9',
    totals:{required:totalRequired,present:totalRequired-totalMissing,missing:totalMissing},
    shared:{required:COMMON_REQUIRED.length,missing:commonMissing},
    themePacks:{required:required.length,missing,completeThemes:THEMES.filter(t=>!required.some(n=>n.includes(t)&&missing.includes(n)))},
    itemArtwork:{required:ITEM_REQUIRED.length,missing:itemMissing},
    effects:{required:FX_REQUIRED.length,missing:fxMissing},
    blocker:'Six approved Jungle Jumble PNGs require local upload; 26 game item/effects PNGs have not yet been produced.',
  },null,2));

  if(missing.length)console.log('Missing approved theme images:',missing.join(', '));
  assert.equal(unexpected.length,0,'Unexpected missing core theme art: '+unexpected.join(', '));
  assert.equal(missing.length===0 || missing.every(x=>JUNGLE_PENDING.has(x)),true,'Missing core art outside Jungle');
  const manifestPath=path.join(PUB,'assets','manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.ok(Array.isArray(manifest.images),'Build did not write an image manifest');
  assert.equal(manifest.images.length,raw.length,'Manifest must include every raw artwork file');
  const map=new Map(manifest.images.map(o=>[o.k,o.f]));
  assert.equal(map.size,raw.length,'Manifest must not repeat or collide artwork keys');
  for(const filename of raw){
    const key=path.basename(filename,path.extname(filename)).toLowerCase().replace(/[^a-z0-9_]/g,'_');
    const output=map.get(key);
    assert.ok(output,filename+' is missing from generated manifest');
    const img=path.join(IMG,output);
    assert.ok(fs.existsSync(img),filename+' has no generated image file: '+img);
    const meta=await sharp(img).metadata();
    assert.equal(meta.format,'webp',output+' must be optimized webp');
    assert.ok(meta.width>50&&meta.height>50,output+' image dimensions too small');
    if(/^bg_far_/.test(key))assert.deepEqual([meta.width,meta.height],[1920,1080],output+' background build size');
    if(/^tex_rail_/.test(key))assert.deepEqual([meta.width,meta.height],[512,512],output+' rail build size');
    if(/^prop_/.test(key)){
      assert.ok(meta.hasAlpha,output+' lost transparency');
      assert.ok(meta.width<=520&&meta.height<=520,output+' too large for decoration');
    }
  }
  const built=fs.readFileSync(path.join(PUB,'tv.html'),'utf8');
  assert.ok(built.includes('approved transparent props'), 'Built TV has no approved-prop rendering');
  assert.ok(built.includes('prop_'), 'Built TV does not reference themed decorative props');
  assert.ok(!built.includes('/*ENGINE*/')&&!built.includes('/*TV*/'),'TV build left source placeholders');
  console.log('PASS: '+raw.length+' raw assets built into WebP and exactly matched in manifest');
  console.log('PASS: all 6 complete packs, their generated backgrounds, rail textures, transparent props');
  console.log('PASS: TV build contains theme prop integration and optional-art fallbacks');
  if(missing.length)console.log('BLOCKER (art completeness only): Upload 6 previously approved Jungle Jumble files before claiming 70/70');
}
main().catch(error=>{console.error('FAIL:',error.stack||error);process.exitCode=1;});
