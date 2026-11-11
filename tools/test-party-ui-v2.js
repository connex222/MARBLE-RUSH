/* MARBLE RUSH real rebuild: fail closed against ANY old mode screen ownership. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('src/tv.html'),tv=read('src/tv.js');
const derby=read('src/modes/party-ui-v2.js');
const brawl=read('src/modes/party-brawl-ui-v2.js');
const curling=read('src/modes/party-curling-ui-v2.js');
const golf=read('src/modes/party-golf-ui-v2.js');
const host=read('src/modes/party-screen-host.js');
const build=read('tools/build.js');
const modes=['derby','dropzone','brawl','curling','golf'];
assert.equal((html.match(/id="partyStageCanvas"/g)||[]).length,1,
 'Exactly one Party Pack canvas must be mounted in the TV HTML');
assert.ok(html.includes('id="partyStage"')&&html.includes('data-screen="party-stage"'));
assert.ok(!html.includes('ppWorkInProgress'),'Unreachable placeholder must be deleted');
for(const mode of modes){
 assert.ok(host.includes(mode+':')||host.includes(mode+' '),
  'Missing exclusive renderer registration: '+mode);
 const engine=read('src/modes/'+mode+'.js');
 assert.ok(engine.includes('registerMode({')&&engine.includes('session(){'),
  mode+' lost authoritative physics/session');
 assert.ok(engine.includes('available:true'),mode+' no longer available');
 assert.ok(!/function draw\(\)/.test(engine),mode+' old private renderer returned');
 assert.ok(!/\bdraw\(ctx,w,h\)/.test(engine),mode+' old registry draw bridge returned');
}
for(const [renderer,src] of [
 ['MarblePartyUI.drawDerby',host],['MarblePartyUI.drawDropZone',host],
 ['MarbleBrawlUI.draw',host],['MarbleCurlingUI.draw',host],
 ['MarbleGolfUI.draw',host]
])assert.ok(src.includes(renderer),'Only the host may dispatch '+renderer);
for(const old of ['derbyCanvas','dropZoneCanvas','brawlCanvas',
 'curlingCanvas','golfCanvas','ppWorkInProgress'])
 assert.ok(!html.includes('id="'+old+'"'),old+' retired UI was remounted');
for(const id of ['ppBetPanel','ppRankRows','ppDropPanel','ppDropRankRows',
 'ppBrawlPanel','ppBrawlRecover','ppBrawlStandings',
 'ppCurlHud','ppCurlThrow','ppCurlSweepBtn',
 'ppGolfHud','ppGolfPreview','ppGolfShoot'])
 assert.ok(html.includes('id="'+id+'"'),'Required new UI missing: '+id);
assert.ok(!/MarblePartyUI\.enter/.test(tv+host+derby),
 'Old renderer still owns the screen instead of the screen host');
assert.ok(!/MarblePartyStage/.test(tv+host+derby),
 'Obsolete Party Pack fallback painter is back');
assert.ok(tv.includes('MarblePartyScreen.mount(name)')&&
 tv.includes('MarblePartyScreen.unmount()')&&
 tv.includes('MarblePartyScreen.render(mode,session.state'),
 'All modes must have one mount and one render ownership path');
assert.ok(host.includes('raceCanvas.hidden=true')&&
 host.includes('raceCanvas.hidden=false')&&
 host.includes('assertExclusive()'),
 'Shared GP canvas is not hidden exclusively while a Party Pack mode runs');
assert.ok(!build.includes("'party-fx'")&&
 !fs.existsSync(path.join(root,'src/modes/party-fx.js')),
 'Retired overlay still bundled or checked in');
assert.ok(build.includes("'party-screen-host'"));
assert.ok(!/PartyFX\.draw/.test(tv+host));
assert.ok(derby.includes('pp_derby_bg')&&
 derby.includes('pp_derby_surface_main')&&
 derby.includes('pp_derby_prop_grandstand')&&
 derby.includes('pp_derby_prop_hay_bales'),
 'Derby approved art missing');
assert.ok(derby.includes('pp_dropzone_bg')&&
 derby.includes('pp_dropzone_surface_main')&&
 derby.includes('pp_dropzone_prop_glass_chute')&&
 derby.includes('pp_dropzone_prop_gold_bucket'),'Drop Zone art missing');
for(const [content,keys] of [[brawl,['pp_brawl_bg','pp_brawl_surface_main','pp_brawl_fx_ko']],
 [curling,['pp_curling_bg','pp_curling_surface_main','pp_curling_fx_sweep']],
 [golf,['pp_golf_bg','pp_golf_surface_main','pp_golf_fx_cup']]]){
 for(const key of keys)assert.ok(content.includes(key),'Missing reusable art key '+key);
}
assert.ok(html.includes('id="partyBackLobby"')&&html.includes('id="raceHud"'));
assert.ok(tv.includes("['stake','bet','cheer']"),
 'Derby phone betting controls lost');
console.log('PASS: five game engines separate from visuals, one stage host, exactly one canvas, no legacy draw shims, overlay or fallback, Grand Prix retained');
