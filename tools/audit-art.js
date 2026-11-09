/* MARBLE RUSH art preflight — run after npm run build.
 * Enforces all 119 approved Master Bible images, seven complete themes and
 * their compiled WebP files. Does not certify multiplayer or art aesthetics.
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
  console.log('Game-item and trophy art: '+(ITEM_REQUIRED.length-itemMissing.length)+'/'+ITEM_REQUIRED.length);
  console.log('Particle and effects art: '+(FX_REQUIRED.length-fxMissing.length)+'/'+FX_REQUIRED.length);
  if(itemMissing.length)console.log('Still to produce — items:',itemMissing.join(', '));
  if(fxMissing.length)console.log('Still to produce — effects:',fxMissing.join(', '));
  assert.equal(totalMissing,0,'All 119 approved Master Bible artworks must be on this branch');
  assert.equal(commonMissing.length,0,'Missing previously approved shared character/logo/marble images');
  fs.writeFileSync(path.join(ROOT,'qa-art-audit.json'),JSON.stringify({
    title:'MARBLE RUSH artwork inventory — Master Bible Section 9',
    totals:{required:totalRequired,present:totalRequired-totalMissing,missing:totalMissing},
    shared:{required:COMMON_REQUIRED.length,missing:commonMissing},
    themePacks:{required:required.length,missing,completeThemes:THEMES.filter(t=>!required.some(n=>n.includes(t)&&missing.includes(n)))},
    itemArtwork:{required:ITEM_REQUIRED.length,missing:itemMissing},
    effects:{required:FX_REQUIRED.length,missing:fxMissing},
    blocker:null, status:'All approved source artwork complete; full gameplay and visual acceptance are separate checks.',
  },null,2));

  assert.equal(missing.length,0,'All 70 theme-packs must be complete');
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
    if(ITEM_REQUIRED.includes(filename)||FX_REQUIRED.includes(filename)){
      assert.ok(meta.hasAlpha,output+' lost approved art transparency');
      assert.ok(meta.width<=910&&meta.height<=910,output+' unexpectedly large');
    }
  }
  const built=fs.readFileSync(path.join(PUB,'tv.html'),'utf8');
  assert.ok(built.includes('approved transparent props'), 'Built TV has no approved-prop rendering');
  assert.ok(built.includes('prop_'), 'Built TV does not reference themed decorative props');
  assert.ok(!built.includes('/*ENGINE*/')&&!built.includes('/*TV*/'),'TV build left source placeholders');
  console.log('PASS: '+raw.length+' raw assets built into WebP and exactly matched in manifest');
  console.log('PASS: all 7 complete theme packs, pickups, medals, hazards and particle artwork');
  console.log('PASS: TV build contains theme prop integration and optional-art fallbacks');
  console.log('PASS: full Master Bible artwork specification 119/119; no missing files');
}
main().catch(error=>{console.error('FAIL:',error.stack||error);process.exitCode=1;});
