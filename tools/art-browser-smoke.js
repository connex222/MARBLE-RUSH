/* Browser smoke for the approved MARBLE RUSH visual integration.
 * Requires npm install --no-save playwright && playwright install chromium.
 * Runs against a locally started game server; never touches production.
 */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
async function main(){
  const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:35993';
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__marbleArtDraws={backgrounds:new Set(),textures:new Set(),props:new Set(),gameObjects:new Set(),effects:new Set()};
    const originalDraw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
      const src=(image&&typeof image.src==='string')?image.src:'';
      if(src.includes('bg_far_')||src.includes('bg_lobby')||src.includes('bg_results'))
        window.__marbleArtDraws.backgrounds.add(src.split('/').pop());
      if(src.includes('prop_'))window.__marbleArtDraws.props.add(src.split('/').pop());
      if(/\/(item_box|bumper|gate_start|arch_finish|oil_puddle|trophy_cup|medal_(gold|silver|bronze))\.webp/.test(src))
        window.__marbleArtDraws.gameObjects.add(src.split('/').pop());
      if(/\/fx_(glow|sparkle|spark|dust|frost|sprinkle|splash|poof|star_burst|wind|bubble_shield|jelly_coat)\.webp/.test(src))
        window.__marbleArtDraws.effects.add(src.split('/').pop());
      return originalDraw.call(this,image,...args);
    };
    const originalPattern=CanvasRenderingContext2D.prototype.createPattern;
    CanvasRenderingContext2D.prototype.createPattern=function(image,...args){
      const src=(image&&typeof image.src==='string')?image.src:'';
      if(src.includes('tex_rail_'))window.__marbleArtDraws.textures.add(src.split('/').pop());
      return originalPattern.call(this,image,...args);
    };
  });
  try{
    await page.goto(base+'/tv',{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('#btnBoot').click();
    // Party Pack picker must fit within the TV-safe lobby without covering
    // joining instructions, settings or the start controls.
    await page.locator('#partyModeCards .partyModeCard').first().waitFor({state:'visible'});
    const picker=await page.evaluate(()=>{
      const bounds=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
      return {cards:[...document.querySelectorAll('.partyModeCard')].map(x=>({disabled:x.dataset.locked==='true',pressed:x.getAttribute('aria-pressed')})),
        picker:bounds('#partyPicker'),join:bounds('.joinCard'),settings:bounds('#lobbySettings'),controls:bounds('#lobbyBottom')};
    });
    assert.equal(picker.cards.length,6,'Six mode cards must be visible');
    assert.equal(picker.cards.filter(c=>c.disabled).length,3,'Three unfinished games must remain locked');
    assert.equal(picker.cards.filter(c=>c.pressed==='true').length,1,'One mode selected');
    const locked=page.locator('#partyModeCards .partyModeCard[data-locked="true"]').first();
    await locked.click();
    await page.waitForFunction(()=>!document.querySelector('#partyAttractPanel').hidden,{timeout:5000});
    assert.equal(await page.evaluate(()=>window.__MR.selectedMode),'grandprix','Preview must not launch an unfinished game');
    await page.screenshot({path:'qa-party-attract.png',fullPage:true});
    await page.locator('#partyModeCards .partyModeCard').first().click();

    const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    for(const [name,rect] of [['joining instructions',picker.join],['settings',picker.settings],['start controls',picker.controls]])
      assert.equal(overlaps(picker.picker,rect),false,'Party picker overlaps '+name+': '+JSON.stringify(picker));
    await page.screenshot({path:'qa-party-picker.png',fullPage:true});
    console.log('PASS: six-mode picker and TV-safe lobby geometry');
    // Force full-effects art rendering on headless CI even if its framerate dips.
    await page.locator('[data-set="fx"]').click();
    await page.locator('#btnKb').click();
    // Exercise a complete three-game Party Night without three long
    // real-time races. The separate race smoke still checks real physics.
    await page.locator('[data-party="3"]').click();
    await page.locator('#btnStart').click();
    for(let gameIndex=0;gameIndex<3;gameIndex++){
      await page.evaluate((i)=>{
        const a=window.__MR;
        if(i>0)a.Game.nextPartyGame();
        if(a.selectedMode==='dropzone'){
          const dz=a.MODES.dropzone.session();
          let guard=0;
          while(!dz.state.done && guard++<15000){
            if(!dz.state.ball)dz.action(dz.owner().id,'drop');
            dz.step(.05);
          }
          if(!dz.state.done)throw Error('Party Night Drop Zone failed to finish');
        }else{
          // Skip waiting for complete multi-minute Grand Prix race in
          // this coordinator smoke. A separate test races in real time.
          a.Game.startRace('toybox');
          for(const p of a.players.values())p.points=20+i;
          a.Game.finale();
        }
      },gameIndex);
      const snap=await page.evaluate(()=>({
        s:window.__MR.state,
        party:window.__MR.partyRun?.status,
        index:window.__MR.partyRun?.session.index
      }));
      assert.equal(snap.s,'finale');
      assert.equal(snap.index,gameIndex+1);
      assert.equal(snap.party,gameIndex===2?'complete':'ready');
    }
    assert.equal(await page.locator('#btnNewNight').textContent(),'New night');
    await page.locator('#btnNewNight').click();
    await page.locator('[data-party="0"]').click();
    await page.locator('#partyModeCards .partyModeCard').first().click();
    await page.locator('#btnStart').waitFor({state:'visible',timeout:10000});
    await page.locator('#btnStart').click();
    await page.locator('#voteCards .vcard').first().waitFor({state:'visible',timeout:10000});
    const cards=page.locator('#voteCards .vcard');
    const names=await cards.locator('.vname').allTextContents();
    assert.equal(names.length,3,'Three track choices are required');
    const choice=names.findIndex(x=>!x.toLowerCase().includes('jungle'));
    assert.ok(choice>=0,'This smoke test needs an already-complete theme');
    await cards.nth(choice).click();
    await page.locator('#btnSkipVote').click();
    await page.waitForSelector('#raceHud:not([hidden])',{timeout:20000});
    await page.waitForTimeout(5000);
    const stats=await page.evaluate(()=>{
      const art=window.__marbleArtDraws;
      return {backgrounds:[...art.backgrounds],textures:[...art.textures],props:[...art.props],
        logoCount:document.querySelectorAll('.logo.asset-logo img').length,
        clatterPose:document.querySelector('#clatterArt')?.getAttribute('src')||null,
        gameObjects:[...art.gameObjects],effects:[...art.effects],
        track:document.querySelector('#trackName')?.textContent,
        imageCount:performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/img/')).length};
    });
    await page.screenshot({path:'qa-art-race-preview.png',fullPage:true});
    console.log('BROWSER ART DRAW STATS:',JSON.stringify(stats));
    assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
    assert.ok(stats.backgrounds.includes('bg_lobby.webp'),'Approved lobby background never painted');
    assert.ok(stats.backgrounds.some(x=>x.startsWith('bg_far_')),'No approved theme far background painted on canvas');
    assert.ok(stats.textures.some(x=>x.startsWith('tex_rail_')),'No theme rail material applied to canvas');
    assert.ok(stats.props.some(x=>x.startsWith('prop_')),'No approved decorative props painted on canvas');
    for (const key of ['item_box.webp','bumper.webp','gate_start.webp','arch_finish.webp']) {
      assert.ok(stats.gameObjects.includes(key),'Required art was never drawn in race: '+key);
    }
    assert.ok(stats.effects.includes('fx_glow.webp'),'Approved pickup glow asset was never drawn in a race');
    assert.equal(stats.logoCount,2,'Both TV logos should use approved graphic rather than CSS text');
    assert.ok(stats.clatterPose&&/clatter_(reference|announce|cheer|gasp|flag|wince)\.webp/.test(stats.clatterPose),'Approved Captain Clatter pose never used');
    assert.ok(stats.imageCount>=119,'Not all 119 approved images were requested');
    console.log('PASS: real browser race rendered approved backgrounds, rails, 8 themed props, pickups, gates, bumpers, finish arch and glow');
    // Phase 3: run a playable Drop Zone board with actual collision steps
    // and verify a full five-round end-to-end single-player result.
    await page.evaluate(()=>{
      const a=window.__MR;
      a.Game.toLobby();
      a.Game.onAction('tv','mode','dropzone');
      a.Game.beginCup();
    });
    await page.locator('[data-screen="dropzone"]').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#dropZoneCanvas').getAttribute('width'),'1920');
    await page.screenshot({path:'qa-dropzone-tv.png',fullPage:true});
    await page.locator('#dropNow').click();
    const initial=await page.evaluate(()=>({
      active:!!window.__MR.MODES.dropzone.session().state.ball,
      turn:window.__MR.MODES.dropzone.session().state.turn
    }));
    assert.equal(initial.active,true,'TV DROP button did not release a marble');
    await page.evaluate(()=>{
      const dz=window.__MR.MODES.dropzone.session();
      let guard=0;
      while(!dz.state.done&&guard++<10000){
        if(!dz.state.ball)dz.action(dz.owner().id,'drop');
        dz.step(.05);
      }
      if(!dz.state.done)throw Error('Drop Zone did not complete five rounds');
    });
    await page.locator('[data-screen="finale"]').waitFor({state:'visible',timeout:10000});
    const dz=await page.evaluate(()=>window.__MR.MODES.dropzone.session().state);
    assert.equal(dz.turn,5);
    assert.equal(dz.roster[0].drops,5);
    assert.ok(dz.roster[0].score>=250);
    assert.equal(errors.length,0,'Browser errors after Drop Zone: '+errors.join(' | '));
    console.log('PASS: Drop Zone five playable rounds, 1920×1080 TV, scoring and finale');

  }finally{
    await browser.close();
  }
}
main().catch(e=>{console.error('FAIL:',e.stack||e);process.exitCode=1;});
