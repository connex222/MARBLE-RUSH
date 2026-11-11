/* MARBLE RUSH UI v2: fail closed against reintroducing legacy mode screens. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('src/tv.html'),tv=read('src/tv.js'),ui=read('src/modes/party-ui-v2.js');
const modes=['derby','dropzone','brawl','curling','golf'];
assert.ok(html.includes('id="partyStageCanvas"')&&html.includes('id="partyStage"'),
 'Party Pack needs a newly constructed full-TV stage');
assert.ok(html.includes('id="ppBetPanel"')&&html.includes('id="ppRankRows"'),
 'Derby live controls and standings missing');
assert.ok(tv.includes('MarblePartyUI.drawDerby'),'Derby not connected to its new renderer');
assert.ok(tv.includes('MarblePartyUI.drawDropZone'),'Drop Zone not connected to new renderer');
assert.ok(tv.includes('MarbleBrawlUI.draw'),'Brawl new arena renderer not connected');
assert.ok(tv.includes('MarbleCurlingUI.draw'),'Curling renderer not connected');
const curlingUi=read('src/modes/party-curling-ui-v2.js');
for(const asset of ['pp_curling_bg','pp_curling_surface_main','pp_curling_prop_alpine_lodge',
  'pp_curling_prop_ice_blocks','pp_curling_fx_scrape','pp_curling_fx_sweep','pp_curling_fx_victory'])
 assert.ok(curlingUi.includes(asset),'Curling approved asset missing: '+asset);
for(const id of ['ppCurlHud','ppCurlPanel','ppCurlStandings','ppCurlRankRows',
 'ppCurlThrow','ppCurlSweepBtn','ppCurlAim','ppCurlPower','ppCurlLeftSpin','ppCurlRightSpin'])
 assert.ok(html.includes('id="'+id+'"'),'Curling new UI not found: '+id);
const brawlUi=read('src/modes/party-brawl-ui-v2.js');
for(const art of ['pp_brawl_bg','pp_brawl_surface_main','pp_brawl_prop_spin_hazard','pp_brawl_prop_striped_bumper','pp_brawl_fx_ko','pp_brawl_fx_spin'])
 assert.ok(brawlUi.includes(art),'Brawl approved visual asset missing: '+art);
for(const id of ['ppBrawlPanel','ppBrawlStandings','ppBrawlRankRows','ppBrawlRam','ppBrawlAnchor','ppBrawlAlive'])
 assert.ok(html.includes('id="'+id+'"'),'Brawl replacement UI missing: '+id);
assert.ok(ui.includes('pp_dropzone_bg')&&ui.includes('pp_dropzone_surface_main')&&
 ui.includes('pp_dropzone_prop_glass_chute')&&ui.includes('pp_dropzone_prop_gold_bucket'),
 'Drop Zone must use its four approved environment assets');
for(const id of ['ppDropPanel','ppDropStandings','ppDropRankRows','dropLeft','dropNow','dropRight'])
 assert.ok(html.includes('id="'+id+'"'),'New Drop Zone control/HUD missing: '+id);
assert.ok(ui.includes('pp_derby_bg')&&ui.includes('pp_derby_surface_main')&&
 ui.includes('pp_derby_prop_grandstand')&&ui.includes('pp_derby_prop_hay_bales'),
 'New Derby must re-use four approved environment assets');
assert.ok(ui.includes('pp_derby_fx_laurel')&&ui.includes('pp_derby_fx_surge'),
 'New Derby must use approved climax effects');
assert.ok(!/MarblePartyStage/.test(tv+ui+read('src/modes/registry.js')),
 'Old stage renderer is still compiled');
assert.ok(!/PartyFX\.draw/.test(tv),'Old overlaid FX still used in gameplay');
for(const id of ['derbyCanvas','dropZoneCanvas','brawlCanvas','curlingCanvas','golfCanvas',
 'derbyHelp','dropZoneHelp','brawlHelp','curlingHelp','golfHelp'])
 assert.ok(!html.includes('id="'+id+'"')&&!tv.includes("'#"+id+"'"),
 'Old game UI not removed: '+id);
for(const name of modes){
 const code=read('src/modes/'+name+'.js');
 assert.ok(code.includes('function draw(){ /* Party Pack v2: legacy graphics deleted'),
   name+' old drawing code still in rules module');
 assert.ok(!code.includes('MarblePartyStage.'),name+' still calls the retired renderer');
 assert.ok(code.includes('registerMode({'),name+' authoritative mode registration lost');
 assert.ok(code.includes('session(){'),name+' authoritative game session lost');
 assert.ok(code.includes(['derby','dropzone','brawl','curling'].includes(name)?'available:true':'available:false'),
   name+' phase readiness must match the visible UI');
}
// The five new gameplay modes retain their deterministic logic and phone action
// handlers even though four unfinished TV presentations are not yet launchable.
assert.ok(tv.includes("['stake','bet','cheer']"),'Derby phone controls were changed');
assert.ok(html.includes('id="partyBackLobby"'),'Host exit was lost');
console.log('PASS UI v2: Derby, Drop Zone, Brawl and Curling are exclusive rebuilt views; only Golf gated.');
