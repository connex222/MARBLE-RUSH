/* TV-first visual acceptance for Party Pack UI v2: Derby only.
 * Headless Chromium is a functional smoke; human TV review still required.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/tv',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#btnBoot').click();
  await page.locator('#partyModeCards .partyModeCard').first().waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__MR?.state==='lobby');
  const menu=await page.locator('#partyModeCards .partyModeCard').evaluateAll(rows=>rows.map(b=>({
   mode:b.dataset.mode,disabled:b.disabled,locked:b.dataset.locked
  })));
  assert.equal(menu.length,6);
  assert.deepEqual(menu.filter(c=>!c.disabled).map(c=>c.mode),['grandprix','derby','dropzone','brawl','curling'],
   'All rebuilt modes, including Curling, must be selectable; Golf remains locked');
  await page.screenshot({path:'qa-ui-v2-lobby.png'});
  const old=await page.evaluate(()=>['derbyCanvas','dropZoneCanvas','brawlCanvas','curlingCanvas',
   'golfCanvas','derbyHelp','dropZoneHelp','brawlHelp','curlingHelp','golfHelp'].filter(id=>document.getElementById(id)));
  assert.equal(old.length,0,'Old game UIs are still mounted');
  await page.locator('#btnKb').click();
  await page.locator('#btnCpu').click();
  await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
  await page.waitForFunction(()=>window.__MR.selectedMode==='derby');
  await page.locator('#btnStart').click();
  await page.locator('#partyStage').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__MR?.state==='derby'&&
   document.getElementById('ppRankRows')?.children.length>=1,{timeout:12000});
  const view=await page.evaluate(()=>{
   const stage=document.getElementById('partyStage');
   const canvas=document.getElementById('partyStageCanvas');
   const r=canvas.getBoundingClientRect(),c=canvas.getContext('2d');
   const pix=c.getImageData(600,500,16,16).data;
   const brightness=new Set();
   for(let i=0;i<pix.length;i+=4)brightness.add(pix[i]+':'+pix[i+1]+':'+pix[i+2]);
   return {mode:stage.dataset.mode,area:[r.width,r.height],colors:brightness.size,
    heat:document.getElementById('ppHeat').textContent,
    title:document.getElementById('ppModeTitle').textContent,
    buttons:[...stage.querySelectorAll('button')].filter(b=>b.getClientRects().length>0).map(b=>b.id)};
  });
  assert.equal(view.mode,'derby');
  assert.ok(view.area[0]>=1900&&view.area[1]>=1050,'Derby no longer fills TV screen');
  assert.ok(view.colors>4,'New Derby canvas is blank or flat');
  assert.match(view.title,/MARBLE DERBY/);
  assert.deepEqual(view.buttons,['derbyRunner','derbyStake','derbyPick','derbyCheer']);
  await page.screenshot({path:'qa-ui-v2-derby-betting.png'});
  await page.locator('#derbyRunner').click();
  await page.locator('#derbyStake').click();
  await page.locator('#derbyPick').click();
  const bet=await page.evaluate(()=>{
   const g=window.__MR.MODES.derby.session();
   const person=g.state.roster.find(p=>!p.cpu);
   return {stake:person.stake,committed:g.state.wagers.has(person.id),phase:g.state.phase};
  });
  assert.ok(bet.committed,'Rebuilt UI did not send a bet to the authoritative game');
  assert.ok([25,50,100,200].includes(bet.stake),'Invalid stake');
  await page.screenshot({path:'qa-ui-v2-derby-live.png'});
  // Preserve actual 5-heat scoring and finale completion, not just a mock-up.
  await page.evaluate(()=>{
   const g=window.__MR.MODES.derby.session();
   let n=0;while(!g.state.done&&n++<35000)g.step(.05);
   if(!g.state.done)throw Error('Derby never completed');
  });
  await page.waitForFunction(()=>window.__MR.state==='finale',{timeout:12000});
  const finish=await page.evaluate(()=>{
   const s=window.__MR.MODES.derby.session().state;
   return {round:s.round,history:s.history.length,
    results:s.roster.map(p=>p.bets.length),winner:document.getElementById('champName')?.textContent};
  });
  assert.equal(finish.round,5);
  assert.equal(finish.history,5);
  assert.ok(finish.results.every(x=>x===5));
  assert.ok(finish.winner,'Finale winner missing');
  await page.screenshot({path:'qa-ui-v2-derby-finale.png'});
  // Drop Zone is a second entirely independent presentation, not the old board.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="dropzone"]').click();
  await page.waitForFunction(()=>window.__MR.selectedMode==='dropzone');
  await page.locator('#btnStart').click();
  await page.locator('#partyStage').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('partyStage')?.dataset.mode==='dropzone'&&
    document.getElementById('ppDropRankRows')?.children.length>=1,{timeout:12000});
  const dzView=await page.evaluate(()=>{
    const stage=document.getElementById('partyStage');
    const canvas=document.getElementById('partyStageCanvas');
    const rect=canvas.getBoundingClientRect();
    const ctx=canvas.getContext('2d'),p=ctx.getImageData(850,540,45,45).data,colors=new Set();
    for(let i=0;i<p.length;i+=4)colors.add(p[i]+':'+p[i+1]+':'+p[i+2]);
    const ids=[...stage.querySelectorAll('button')].filter(b=>b.getClientRects().length>0).map(b=>b.id);
    return {mode:stage.dataset.mode,rect:[rect.width,rect.height],colors:colors.size,
      ids,rankRows:document.getElementById('ppDropRankRows').children.length,
      jackpot:document.getElementById('ppDropJackpot').textContent};
  });
  assert.equal(dzView.mode,'dropzone');
  assert.equal(await page.locator('#clatter').evaluate(el=>el.classList.contains('show')),false,
    'Previous Derby finale commentary covers the new Drop Zone UI');
  assert.ok(dzView.rect[0]>=1900&&dzView.rect[1]>=1050,'New Drop Zone not full-TV');
  assert.ok(dzView.colors>10,'New Drop Zone board appears blank or flat');
  assert.deepEqual(dzView.ids,['dropLeft','dropRight','dropNow'],
    'Old Derby buttons must not bleed through into Drop Zone');
  assert.ok(dzView.rankRows>=1,'Drop Zone standings not shown');
  assert.ok(Number(dzView.jackpot)>=50,'Live jackpot value missing');
  assert.equal(await page.locator('#ppDropPanel').isVisible(),true);
  await page.screenshot({path:'qa-ui-v2-dropzone-aim.png'});
  const x0=await page.evaluate(()=>window.__MR.MODES.dropzone.session().state.x);
  await page.locator('#dropLeft').click();
  const x1=await page.evaluate(()=>window.__MR.MODES.dropzone.session().state.x);
  assert.ok(x1<x0,'New TV LEFT button did not use real game action');
  await page.locator('#dropRight').click();
  await page.locator('#dropNow').click();
  await page.waitForFunction(()=>!!window.__MR.MODES.dropzone.session().state.ball,{timeout:8000});
  await page.screenshot({path:'qa-ui-v2-dropzone-falling.png'});
  await page.evaluate(()=>{
    const g=window.__MR.MODES.dropzone.session();
    let guard=0;while(!g.state.done&&guard++<18000)g.step(.05);
    if(!g.state.done)throw Error('New Drop Zone never finished its five rounds');
  });
  await page.waitForFunction(()=>window.__MR.state==='finale',{timeout:12000});
  const dzFinal=await page.evaluate(()=>{
    const s=window.__MR.MODES.dropzone.session().state;
    return {turns:s.turn,round:s.round,players:s.roster.length,
      drops:s.roster.map(p=>p.drops),total:s.roster.map(p=>p.score),
      champion:document.getElementById('champName')?.textContent};
  });
  assert.equal(dzFinal.turns,dzFinal.players*5,'Drop Zone missing turns');
  assert.ok(dzFinal.drops.every(n=>n===5),'Drop Zone scoring changed');
  assert.ok(dzFinal.total.every(n=>n>=0),'Negative score');
  assert.ok(dzFinal.champion,'Drop Zone finale missing');
  await page.screenshot({path:'qa-ui-v2-dropzone-finale.png'});

  // BRAWL v2 has its own arena and combat HUD, not an old Brawl canvas.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="brawl"]').click();
  await page.waitForFunction(()=>window.__MR.selectedMode==='brawl',{timeout:10000});
  await page.locator('#btnStart').click();
  await page.locator('#partyStage').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>window.__MR.state==='brawl'&&
    document.getElementById('ppBrawlRankRows')?.children.length>=2,{timeout:12000});
  const brawlView=await page.evaluate(()=>{
    const stage=document.getElementById('partyStage');
    const canvas=document.getElementById('partyStageCanvas'),r=canvas.getBoundingClientRect();
    const data=canvas.getContext('2d').getImageData(870,520,36,36).data,cols=new Set();
    for(let i=0;i<data.length;i+=4)cols.add(data[i]+':'+data[i+1]+':'+data[i+2]);
    const ids=[...stage.querySelectorAll('button')].filter(b=>b.getClientRects().length>0).map(b=>b.id);
    return {mode:stage.dataset.mode,rect:[r.width,r.height],colors:cols.size,
      ids,rankRows:document.getElementById('ppBrawlRankRows').children.length,
      hazard:document.getElementById('ppBrawlPhase').textContent,
      radius:document.getElementById('ppBrawlRadius').textContent};
  });
  assert.equal(brawlView.mode,'brawl');
  assert.ok(brawlView.rect[0]>=1900&&brawlView.rect[1]>=1050,'Brawl not full TV');
  assert.ok(brawlView.colors>10,'Brawl stadium rendering blank or flat');
  assert.deepEqual(brawlView.ids,['ppBrawlLeft','ppBrawlRight','ppBrawlRam','ppBrawlAnchor'],
    'Previous-game controls leaked into Brawl');
  assert.ok(brawlView.rankRows>=2);
  assert.match(brawlView.hazard,/BUMPER/);
  assert.equal(Number(brawlView.radius),380);
  await page.screenshot({path:'qa-ui-v2-brawl-live.png'});
  // Verify real physics and energy are being controlled by the newly mounted buttons.
  const beforeBrawl=await page.evaluate(()=>{
    const g=window.__MR.MODES.brawl.session();
    const p=g.state.roster.find(x=>!x.cpu&&g.current(x.id)?.alive);
    const m=g.current(p.id);
    return {id:p.id,energy:m.energy,heading:m.heading};
  });
  await page.locator('#ppBrawlLeft').click();
  const turned=await page.evaluate(id=>{
    return window.__MR.MODES.brawl.session().current(id).heading;
  },beforeBrawl.id);
  assert.ok(turned<beforeBrawl.heading,'New TURN control did not steer actual marble');
  await page.locator('#ppBrawlRam').click();
  const ramAction=await page.evaluate(id=>{
    const s=window.__MR.MODES.brawl.session().state,m=window.__MR.MODES.brawl.session().current(id);
    return {energy:m.energy,ram:!!s.events.find(e=>e.kind==='ram'&&e.id===id)};
  },beforeBrawl.id);
  assert.ok(ramAction.ram,'New RAM button did not trigger authorised action');
  assert.ok(ramAction.energy<beforeBrawl.energy,'RAM did not consume energy');
  await page.screenshot({path:'qa-ui-v2-brawl-ram.png'});
  await page.evaluate(()=>{
    const g=window.__MR.MODES.brawl.session();
    let n=0;while(!g.state.done&&n++<50000)g.tick(.05);
    if(!g.state.done)throw Error('Brawl did not finish all five rounds');
  });
  await page.waitForFunction(()=>window.__MR.state==='finale',{timeout:12000});
  const result=await page.evaluate(()=>{
    const s=window.__MR.MODES.brawl.session().state;
    return {round:s.round,history:s.roundHistory.length,
      points:s.roster.map(p=>p.roundPoints.length),
      champs:document.getElementById('champName')?.textContent};
  });
  assert.equal(result.round,5);
  assert.equal(result.history,5);
  assert.ok(result.points.every(v=>v===5),'Brawl round scoring regressed');
  assert.ok(result.champs,'Brawl results winner missing');
  await page.screenshot({path:'qa-ui-v2-brawl-finale.png'});

  // CURLING v2: visually distinct rink and real stone/aim/sweep engine.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="curling"]').click();
  await page.waitForFunction(()=>window.__MR.selectedMode==='curling',{timeout:10000});
  await page.locator('#btnStart').click();
  await page.locator('#partyStage').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>window.__MR.state==='curling'&&
    document.getElementById('ppCurlRankRows')?.children.length>=2,{timeout:12000});
  const curlingView=await page.evaluate(()=>{
    const stage=document.getElementById('partyStage');
    const canvas=document.getElementById('partyStageCanvas'),rect=canvas.getBoundingClientRect();
    const pix=canvas.getContext('2d').getImageData(900,550,32,32).data,colors=new Set();
    for(let i=0;i<pix.length;i+=4)colors.add(pix[i]+':'+pix[i+1]+':'+pix[i+2]);
    return {mode:stage.dataset.mode,rect:[rect.width,rect.height],colors:colors.size,
      visible:[...stage.querySelectorAll('button')].filter(b=>b.getClientRects().length>0).map(b=>b.id),
      rows:document.getElementById('ppCurlRankRows').children.length,
      end:document.getElementById('ppCurlEnd').textContent};
  });
  assert.equal(curlingView.mode,'curling');
  assert.ok(curlingView.rect[0]>=1900&&curlingView.rect[1]>=1050,'Curling must fill the TV');
  assert.ok(curlingView.colors>10,'Curling ice stage appears blank or flat');
  assert.deepEqual(curlingView.visible,[
    'ppCurlLeft','ppCurlRight','ppCurlPowerDown','ppCurlPowerUp',
    'ppCurlLeftSpin','ppCurlRightSpin','ppCurlThrow','ppCurlSweepBtn'
  ],'Previous game controls leaked into Curling');
  assert.ok(curlingView.rows>=2);
  assert.match(curlingView.end,/END 1 \/ 5/);
  await page.screenshot({path:'qa-ui-v2-curling-aim.png'});
  const initial=await page.evaluate(()=>{
    const g=window.__MR.MODES.curling.session();
    return {id:g.current().id,aim:g.state.aim,power:g.state.power,curl:g.state.curl};
  });
  await page.locator('#ppCurlRight').click();
  await page.locator('#ppCurlPowerUp').click();
  await page.locator('#ppCurlLeftSpin').click();
  const aimed=await page.evaluate(()=>{
    const s=window.__MR.MODES.curling.session().state;
    return {aim:s.aim,power:s.power,curl:s.curl};
  });
  assert.ok(aimed.aim>initial.aim&&aimed.power>initial.power&&aimed.curl<initial.curl,
    'Curling TV controls must drive real aim, power and spin');
  await page.locator('#ppCurlThrow').click();
  await page.waitForFunction(()=>window.__MR.MODES.curling.session().state.phase==='slide',
    {timeout:10000});
  await page.locator('#ppCurlSweepBtn').click();
  const sweep=await page.evaluate(()=>{
    const g=window.__MR.MODES.curling.session();
    return {phase:g.state.phase,stones:g.state.stones.length,sweep:g.state.sweep,
      events:g.state.events.filter(e=>e.kind==='sweep').length};
  });
  assert.ok(sweep.stones>=1&&sweep.events>=1,'New SWEEP control did not reach the physics engine');
  await page.screenshot({path:'qa-ui-v2-curling-sweep.png'});
  await page.evaluate(()=>{
    const g=window.__MR.MODES.curling.session();
    let n=0;while(!g.state.done&&n++<90000)g.step(.1);
    if(!g.state.done)throw Error('Curling did not finish all five ends');
  });
  await page.waitForFunction(()=>window.__MR.state==='finale',{timeout:12000});
  const curlFinal=await page.evaluate(()=>{
    const s=window.__MR.MODES.curling.session().state;
    return {ends:s.end,history:s.history.length,
      scores:s.roster.map(p=>p.endPoints.length),
      stones:s.roster.map(p=>p.stonesPlayed),
      champ:document.getElementById('champName')?.textContent};
  });
  assert.equal(curlFinal.ends,5);assert.equal(curlFinal.history,5);
  assert.ok(curlFinal.scores.every(v=>v===5)&&curlFinal.stones.every(v=>v===10),
    'Curling two stones per player per end scoring changed');
  assert.ok(curlFinal.champ,'Curling finale lacks winner');
  await page.screenshot({path:'qa-ui-v2-curling-finale.png'});

  // A second mode start must still reach original Grand Prix, untouched by the reset.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="grandprix"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>['vote','countdown','race'].includes(window.__MR.state),{timeout:12000});
  assert.ok(await page.locator('#raceHud').count(),'Original Grand Prix screen was deleted');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('PASS: four independent full-TV mode stages, Curling real throw/sweep, four five-round finales, Grand Prix intact');
 }catch(e){
  console.error('FAIL Party Pack v2 browser smoke:',e);
  await page.screenshot({path:'qa-ui-v2-error.png'}).catch(()=>{});
  process.exitCode=1;
 }finally{await browser.close();}
})();
