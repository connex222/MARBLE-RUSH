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
    assert.equal(picker.cards.filter(c=>c.disabled).length,0,'All six modes must be enabled');
    assert.equal(picker.cards.filter(c=>c.pressed==='true').length,1,'One mode selected');
    await page.locator('#partyModeCards .partyModeCard').last().hover();
    await page.waitForFunction(()=>!document.querySelector('#partyAttractPanel').hidden,{timeout:5000});
    assert.equal(await page.evaluate(()=>window.__MR.selectedMode),'grandprix','Hover preview must not select a game');
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
    // User-reported regression: every game must visibly provide Back to Lobby.
    for (const id of ['dropzone','brawl','derby','curling','golf','grandprix']) {
      await page.evaluate(mode=>{
        const a=window.__MR;a.Game.toLobby();a.Game.onAction('tv','party',0);
        if(a.players.size<2) a.addCpu();
        a.Game.onAction('tv','mode',mode);a.Game.beginCup();
      },id);
      const current=await page.evaluate(()=>({state:window.__MR.state,
        selected:window.__MR.selectedMode,
        size:window.__MR.players.size,
        hidden:document.querySelector('#partyBackLobby').hidden}));
      assert.notEqual(current.state,'lobby','Failed to start '+id+': '+JSON.stringify(current));
      assert.equal(await page.evaluate(()=>window.__MR.Audio_.debug.introPlaying),false,
        id+' started while narration was still playing');
      const exit=page.locator('#partyBackLobby');
      await exit.waitFor({state:'visible',timeout:10000});
      assert.match(await exit.innerText(),/Back to Lobby/);
      const hit=await page.evaluate(()=>{
        const e=document.querySelector('#partyBackLobby'),r=e.getBoundingClientRect();
        const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return {hit:top===e||e.contains(top),width:r.width,height:r.height,
          right:window.innerWidth-r.right,bottom:window.innerHeight-r.bottom,
          z:getComputedStyle(e).zIndex,position:getComputedStyle(e).position};
      });
      assert.ok(hit.hit && hit.width>=160 && hit.height>=50,
        id+' return button is obscured or too small: '+JSON.stringify(hit));
      if (id==='golf'||id==='brawl')await page.screenshot({path:'qa-premium-'+id+'-return.png',fullPage:true});
      await exit.click();
      await page.locator('[data-screen="lobby"]').waitFor({state:'visible',timeout:10000});
      assert.equal(await page.evaluate(()=>window.__MR.state),'lobby',id+' could not return to lobby');
      assert.equal(await exit.isHidden(),true,'Exit must hide in lobby');
    }
    // Restore the original one-human roster: later regression checks expect
    // five Drop Zone rounds with one player, not ten with a temporary bot.
    await page.evaluate(()=>{
      const a=window.__MR;
      for(const [id,p] of a.players)if(p.cpu)a.players.delete(id);
      a.Game.toLobby();
    });
    // Escape is also a host keyboard exit from a live Party Night.
    await page.evaluate(()=>{
      const a=window.__MR;a.Game.onAction('tv','party',3);a.Game.beginCup();
    });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>window.__MR.state),'lobby');
    assert.equal(await page.evaluate(()=>window.__MR.partyRun),null);
    console.log('PASS: every game has TV Back to Lobby; Escape abandons a Party Night cleanly');
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
    const safeNav=await page.evaluate(()=>{
      const a=document.querySelector('#partyBackLobby').getBoundingClientRect();
      const b=document.querySelector('#standings').getBoundingClientRect();
      const hit=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2);
      return {
        overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,
        clickable:hit===document.querySelector('#partyBackLobby'),
        button:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},
        standings:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}
      };
    });
    assert.equal(safeNav.overlap,false,
      'Back to Lobby overlaps Grand Prix leaderboard: '+JSON.stringify(safeNav));
    assert.equal(safeNav.clickable,true,'Back to Lobby has no usable hit target during race');
    assert.equal(await page.evaluate(()=>window.__MR.Audio_.debug.introPlaying),false,
      'Intro narration continued into Grand Prix');
    console.log('PASS: Back to Lobby does not overlap live race leaderboard, intro gated');

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
    // Bowl Brawl: one local human plus a CPU rival, five fully simulated
    // shrinking-ring rounds and the shared winner presentation.
    await page.evaluate(()=>{
      const a=window.__MR;
      a.Game.toLobby();
      a.addCpu();
      a.Game.onAction('tv','mode','brawl');
      a.Game.beginCup();
    });
    await page.locator('[data-screen="brawl"]').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#brawlCanvas').getAttribute('width'),'1920');
    await page.screenshot({path:'qa-brawl-tv.png',fullPage:true});
    const firstRam=await page.evaluate(()=>{
      const b=window.__MR.MODES.brawl.session();
      const human=b.state.marbles.find(x=>!b.state.roster.find(p=>p.id===x.id).cpu);
      const old=human.energy;
      const ok=b.action(human.id,'ram');
      return {ok,old,now:human.energy};
    });
    assert.equal(firstRam.ok,true);
    assert.ok(firstRam.now<firstRam.old,'RAM should consume energy');
    await page.evaluate(()=>{
      const b=window.__MR.MODES.brawl.session();
      let n=0;
      while(!b.state.done&&n++<25000)b.tick(.05);
      if(!b.state.done)throw Error('Bowl Brawl did not finish 5 rounds');
    });
    await page.locator('[data-screen="finale"]').waitFor({state:'visible',timeout:10000});
    const br=await page.evaluate(()=>{
      const b=window.__MR.MODES.brawl.session();
      return {round:b.state.round,history:b.state.roundHistory.length,
        totals:b.state.roster.map(p=>({id:p.id,rounds:p.roundPoints.length,points:p.points}))};
    });
    assert.equal(br.round,5);
    assert.equal(br.history,5);
    assert.ok(br.totals.every(p=>p.rounds===5&&p.points>0));
    assert.equal(errors.length,0,'Browser errors after Bowl Brawl: '+errors.join(' | '));
    console.log('PASS: Bowl Brawl complete five-round TV arena, RAM energy and final standings');
    // Three-game Party Night may select any three of the six enabled games.
    // Preserve all modes' score transitions through deterministic simulation
    // rather than waiting for several full races in real time.
    await page.evaluate(()=>{
      const a=window.__MR;
      a.Game.toLobby();a.Game.onAction('tv','party',3);a.Game.beginCup();
      let guard=0;
      while(a.partyRun?.status!=='complete'&&guard++<3){
        const mode=a.selectedMode;
        if(mode==='brawl'){
          const g=a.MODES.brawl.session();let n=0;
          while(!g.state.done&&n++<25000)g.tick(.05);
          if(!g.state.done)throw Error('Party Night Brawl did not complete');
        }else if(mode==='curling'){
          const g=a.MODES.curling.session();let n=0;
          while(!g.state.done&&n++<120000)g.step(.1);
          if(!g.state.done)throw Error('Party Night Curling failed to finish');
        }else if(mode==='derby'){
          const g=a.MODES.derby.session();let n=0;
          while(!g.state.done&&n++<30000)g.step(.05);
          if(!g.state.done)throw Error('Party Night Derby did not complete');
        }else if(mode==='dropzone'){
          const g=a.MODES.dropzone.session();let n=0;
          while(!g.state.done&&n++<15000){
            if(!g.state.ball)g.action(g.owner().id,'drop');
            g.step(.05);
          }
          if(!g.state.done)throw Error('Party Night Drop Zone did not complete');
        }else if(mode==='golf'){
          const g=a.MODES.golf.session();let n=0;
          while(!g.state.done&&n++<120000)g.step(.1);
          if(!g.state.done)throw Error('Party Night Golf failed to finish');
        }else if(mode==='grandprix'){
          a.Game.startRace('toybox');
          for(const p of a.players.values())p.points=10;
          a.Game.finale();
        }else throw Error('Unexpected Party Night mode: '+mode);
        if(a.partyRun.status==='ready')a.Game.nextPartyGame();
      }
      if(a.partyRun?.status!=='complete')throw Error('Party Night did not finish all modes');
    });
    const party=await page.evaluate(()=>({
      history:window.__MR.partyRun.history.map(g=>g.mode).sort(),
      totals:[...window.__MR.partyRun.session.totals.values()],
      status:window.__MR.partyRun.status
    }));
    assert.equal(party.history.length,3);
    assert.equal(new Set(party.history).size,3);
    assert.ok(party.history.every(x=>['grandprix','derby','dropzone','brawl','curling','golf'].includes(x)));
    assert.equal(party.totals.length,2);
    assert.ok(party.totals.every(p=>p>=6&&p<=30));
    assert.equal(party.status,'complete');
    assert.equal(errors.length,0,'Mixed Party Night JS errors: '+errors.join(' | '));
    console.log('PASS: Three-mode Party Night awards correct cumulative points and exits cleanly');
    // The actual playable Derby must run 5 heats, retain valid virtual gems
    // and present the shared championship without errors.
    await page.evaluate(()=>{
      const a=window.__MR;
      a.Game.toLobby();a.Game.onAction('tv','party',0);a.Game.onAction('tv','mode','derby');a.Game.beginCup();
    });
    await page.locator('[data-screen="derby"]').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#derbyCanvas').getAttribute('width'),'1920');
    await page.screenshot({path:'qa-derby-tv.png',fullPage:true});
    await page.locator('#derbyRunner').click();
    await page.locator('#derbyStake').click();
    await page.locator('#derbyPick').click();
    const tvWager=await page.evaluate(()=>{
      const g=window.__MR.MODES.derby.session();
      const human=g.state.roster.find(p=>!p.cpu);
      if(!human)throw Error('Derby missing human player');
      return g.state.wagers.get(human.id);
    });
    assert.equal(tvWager.horse,1,'TV runner selector must change the backed marble');
    assert.equal(tvWager.stake,100,'TV stake selector must change virtual-gem stake');
    await page.evaluate(()=>{
      const g=window.__MR.MODES.derby.session();
      let n=0;
      while(!g.state.done&&n++<30000)g.step(.05);
      if(!g.state.done)throw Error('Derby failed to complete five heats');
    });
    await page.locator('[data-screen="finale"]').waitFor({state:'visible',timeout:10000});
    const derby=await page.evaluate(()=>({
      history:window.__MR.MODES.derby.session().state.history.length,
      bets:window.__MR.MODES.derby.session().state.roster.map(p=>p.bets.length),
      gems:window.__MR.MODES.derby.session().state.roster.map(p=>p.gems)
    }));
    assert.equal(derby.history,5);
    assert.ok(derby.bets.every(n=>n===5));
    assert.ok(derby.gems.every(n=>n>=0));
    assert.deepEqual(errors,[],'JavaScript errors in Marble Derby');
    console.log('PASS: Five real Derby heats, virtual gems and winner presentation');
    // Start five-end Curling, test local TV controls, complete via real
    // deterministic ice physics and verify the approved shared finale.
    await page.evaluate(()=>{
      const a=window.__MR;
      a.Game.toLobby();a.Game.onAction('tv','party',0);
      a.Game.onAction('tv','mode','curling');
      a.Game.beginCup();
    });
    await page.locator('[data-screen="curling"]').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#curlingCanvas').getAttribute('width'),'1920');
    await page.screenshot({path:'qa-curling-tv.png',fullPage:true});
    await page.locator('#curlRight').click();
    await page.locator('#curlUp').click();
    await page.locator('#curlThrow').click();
    const shot=await page.evaluate(()=>{
      const g=window.__MR.MODES.curling.session();
      return {phase:g.state.phase,stones:g.state.stones.length,angle:g.state.stones[0]?.vy};
    });
    assert.equal(shot.phase,'slide');
    assert.equal(shot.stones,1);
    assert.ok(shot.angle>0,'TV aim control must change the throw heading');
    await page.evaluate(()=>{
      const g=window.__MR.MODES.curling.session();let n=0;
      while(!g.state.done&&n++<120000)g.step(.1);
      if(!g.state.done)throw Error('Curling never finished five ends');
    });
    await page.locator('[data-screen="finale"]').waitFor({state:'visible',timeout:10000});
    const cur=await page.evaluate(()=>({
      count:window.__MR.MODES.curling.session().state.history.length,
      played:window.__MR.MODES.curling.session().state.roster.map(p=>p.stonesPlayed),
      ends:window.__MR.MODES.curling.session().state.roster.map(p=>p.endPoints.length)
    }));
    assert.equal(cur.count,5);
    assert.ok(cur.played.every(n=>n===10));
    assert.ok(cur.ends.every(n=>n===5));
    assert.deepEqual(errors,[],'Curling browser errors');
    console.log('PASS: TV five-end Curling, throw physics, scoreboard and winner presentation');





  }finally{
    await browser.close();
  }
}
main().catch(e=>{console.error('FAIL:',e.stack||e);process.exitCode=1;});
