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
 const perfSnapshots=[];
 async function verifyExclusive(mode){
   // Browser-rendered proof: exact renderer, one screen, one canvas,
   // the original GP canvas actually hidden, and measured draw times.
   await page.waitForTimeout(450);
   const report=await page.evaluate(m=>{
     const host=window.__MR?.partyScreen;
     const stage=document.getElementById('partyStage');
     return {
       selected:host?.active,ok:host?.assertExclusive(),
       renderer:stage?.dataset.renderer,owner:stage?.dataset.owner,
       screens:[...document.querySelectorAll('.screen:not([hidden])')]
         .map(e=>e.dataset.screen),
       partyCanvas:stage?.querySelectorAll('canvas').length,
       oldGrandPrixCanvasHidden:document.getElementById('cv')?.hidden,
       performance:host?.telemetry()
     };
   },mode);
   const expected={derby:'derby-track-v3',dropzone:'dropzone-cabinet-v3',
     brawl:'brawl-arena-v3',curling:'curling-rink-v3',golf:'golf-course-v3'}[mode];
   assert.equal(report.selected,mode,mode+' wrong mounted mode');
   assert.equal(report.ok,true,mode+' has competing legacy screen or wrong HUD');
   assert.equal(report.renderer,expected,mode+' wrong renderer');
   assert.equal(report.owner,'marble-party-screen-v3');
   assert.deepEqual(report.screens,['party-stage']);
   assert.equal(report.partyCanvas,1);
   assert.equal(report.oldGrandPrixCanvasHidden,true);
   assert.ok(report.performance.frames>=2,mode+' rendered no continuous frames');
   assert.equal(report.performance.renderFailures,0,mode+' renderer failed to paint');
   perfSnapshots.push(report.performance);
   console.log('REAL-REBUILD-FRAME-METRICS '+JSON.stringify(report.performance));
 }

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
  assert.deepEqual(menu.filter(c=>!c.disabled).map(c=>c.mode),['grandprix','derby','dropzone','brawl','curling','golf'],
   'All six game modes must be ready and without legacy screens');
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
  await verifyExclusive('derby');
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
  await verifyExclusive('dropzone');
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
  await verifyExclusive('brawl');
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
  assert.deepEqual(brawlView.ids,['ppBrawlLeft','ppBrawlRight','ppBrawlRam','ppBrawlAnchor','ppBrawlRecover'],
    'Expected five exclusive Brawl controls, including the real recovery action');
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
  // Real recovery must become available only when danger is genuine.
  await page.evaluate(id=>{
    const g=window.__MR.MODES.brawl.session(),m=g.current(id),s=g.state;
    s.elapsed=.6;s.pulseIndex=0;s.pulseAt=4;
    for(const opponent of s.marbles)if(opponent!==m){
      opponent.x=-150;opponent.y=0;opponent.vx=0;opponent.vy=0;
      opponent.cpuWait=100;
    }
    m.x=s.radius-22-40;m.y=0;m.vx=0;m.vy=0;m.heading=Math.PI;
    m.energy=100;m.cooldown=0;m.edgeHanging=false;m.edgeGrace=0;
  },beforeBrawl.id);
  await page.waitForFunction(()=>!document.getElementById('ppBrawlRecover').disabled);
  await page.screenshot({path:'qa-ui-v2-brawl-edge-panic.png'});
  // Keep the position stable after screenshot overhead so this measures the
  // real action, not whether Chromium captured a frame before the edge passed.
  await page.evaluate(id=>{
    const g=window.__MR.MODES.brawl.session(),m=g.current(id);
    m.x=g.state.radius-22-30;m.y=0;m.vx=0;m.vy=0;
    m.cooldown=0;m.energy=100;m.heading=Math.PI;
  },beforeBrawl.id);
  await page.locator('#ppBrawlRecover').click();
  await page.waitForFunction(id=>window.__MR.MODES.brawl.session()
    .current(id)?.recoverUsed,beforeBrawl.id,{timeout:2500});
  const rescue=await page.evaluate(id=>{
    const g=window.__MR.MODES.brawl.session(),m=g.current(id);
    return {used:m.recoverUsed,energy:m.energy,
      event:g.state.events.some(e=>e.kind==='recover'&&e.id===id)};
  },beforeBrawl.id);
  assert.equal(rescue.used,true,'Brawl did not consume the one-time escape');
  assert.ok(rescue.energy<70&&rescue.event,'Brawl escape must cost 35 energy (with slight frame regeneration)');
  // Telegraphed danger needs a visible countdown and an actual outward shockwave.
  await page.evaluate(()=>{
    const g=window.__MR.MODES.brawl.session(),s=g.state;
    for(const [i,m] of s.marbles.entries()){
      m.x=i===0?175:-175;m.y=0;m.vx=0;m.vy=0;
      m.anchored=0;m.cooldown=0;m.heading=i===0?Math.PI:0;
    }
    s.elapsed=2.4;s.time=2.4;
    s.pulseIndex=0;s.pulseAt=4;
  });
  await page.waitForFunction(()=>document.getElementById('ppBrawlShockBox').classList.contains('danger'));
  await page.screenshot({path:'qa-ui-v2-brawl-shockwave-warning.png'});
  await page.waitForFunction(()=>window.__MR.MODES.brawl.session().state.pulseIndex>=1,{timeout:7000});
  const danger=await page.evaluate(()=>{
    const g=window.__MR.MODES.brawl.session();
    return {pulses:g.state.events.filter(e=>e.kind==='shockwave').length,
      next:g.state.pulseAt,warning:document.getElementById('ppBrawlShockLabel').textContent};
  });
  assert.equal(danger.pulses,1,'Scripted shockwave did not actually fire');
  assert.equal(danger.next,12,'No upcoming escalation');
  await page.screenshot({path:'qa-ui-v2-brawl-shockwave.png'});
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
  await verifyExclusive('curling');
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

  // GOLF v2: fresh full-TV miniature fairway, actual hazards and nine holes.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="golf"]').click();
  await page.waitForFunction(()=>window.__MR.selectedMode==='golf');
  await page.locator('#btnStart').click();
  await page.locator('#partyStage').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__MR.state==='golf'&&
    document.getElementById('ppGolfRankRows')?.children.length>=2);
  await verifyExclusive('golf');
  const golfView=await page.evaluate(()=>{
    const stage=document.getElementById('partyStage');
    const rect=document.getElementById('partyStageCanvas').getBoundingClientRect();
    const p=document.getElementById('partyStageCanvas').getContext('2d').getImageData(900,500,36,36).data;
    const colors=new Set();for(let i=0;i<p.length;i+=4)colors.add(p[i]+':'+p[i+1]+':'+p[i+2]);
    return {mode:stage.dataset.mode,rect:[rect.width,rect.height],colorCount:colors.size,
      visible:[...stage.querySelectorAll('button')].filter(b=>b.getClientRects().length>0).map(b=>b.id),
      rankRows:document.getElementById('ppGolfRankRows').children.length,
      hole:document.getElementById('ppGolfHole').textContent,
      noOld:!document.getElementById('golfCanvas')};
  });
  assert.equal(golfView.mode,'golf');assert.ok(golfView.noOld);
  assert.ok(golfView.rect[0]>=1900&&golfView.rect[1]>=1050,'Golf not full-screen');
  assert.ok(golfView.colorCount>10,'New Golf scene blank or flat');
  assert.deepEqual(golfView.visible,[
    'ppGolfLeft','ppGolfRight','ppGolfPowerDown','ppGolfPowerUp','ppGolfPreview','ppGolfShoot'
  ],'Other mode buttons visible in Golf');
  assert.ok(golfView.rankRows>=2);
  assert.match(golfView.hole,/HOLE 1 \/ 9/);
  await page.screenshot({path:'qa-ui-v2-golf-aim.png'});
  const golfStart=await page.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {angle:s.angle,power:s.power,holes:s.holes};
  });
  await page.locator('#ppGolfRight').click();
  await page.locator('#ppGolfPowerUp').click();
  await page.locator('#ppGolfPreview').click();
  const golfAimState=await page.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {angle:s.angle,power:s.power,hint:!!s.ghost};
  });
  assert.ok(golfAimState.angle>golfStart.angle&&golfAimState.power>golfStart.power,
    'Golf TV controls did not affect authoritative aim/power');
  assert.ok(golfAimState.hint,'Golf trajectory first-bounce hint missing');
  await page.screenshot({path:'qa-ui-v2-golf-trajectory.png'});
  await page.locator('#ppGolfShoot').click();
  await page.waitForFunction(()=>window.__MR.MODES.golf.session().state.phase==='rolling');
  const golfFirstShot=await page.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {strokes:s.strokes,stale:!!s.ghost,hasShot:s.events.some(e=>e.kind==='shot')};
  });
  assert.equal(golfFirstShot.strokes,1);
  assert.equal(golfFirstShot.stale,false);
  assert.ok(golfFirstShot.hasShot,'PUTT did not fire a real game event');
  await page.screenshot({path:'qa-ui-v2-golf-putt.png'});
  await page.evaluate(()=>{
    const g=window.__MR.MODES.golf.session();
    let n=0;while(!g.state.done&&n++<300000)g.step(.1);
    if(!g.state.done)throw Error('Nine-hole Golf never completed');
  });
  await page.waitForFunction(()=>window.__MR.state==='finale');
  const golfFinish=await page.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {holes:s.holes,completed:s.hole,history:s.history.length,
      scores:s.roster.map(p=>p.holeScores.length),
      total:s.roster.map(p=>p.strokes),
      winner:document.getElementById('champName')?.textContent};
  });
  assert.equal(golfFinish.holes,9);
  assert.equal(golfFinish.completed,9);
  assert.equal(golfFinish.history,9);
  assert.ok(golfFinish.scores.every(x=>x===9),'Golf scorecards incomplete');
  assert.ok(golfFinish.total.every(x=>x>=9&&x<=63),'Golf strokes outside valid 9-hole range');
  assert.ok(golfFinish.winner,'Golf finale winner missing');
  await page.screenshot({path:'qa-ui-v2-golf-finale.png'});

  // A second mode start must still reach original Grand Prix, untouched by the reset.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="grandprix"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>['vote','countdown','race'].includes(window.__MR.state),{timeout:12000});
  assert.ok(await page.locator('#raceHud').count(),'Original Grand Prix screen was deleted');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  // Full exit/re-entry matrix: no stale state, no hidden old screen,
  // no doubled compositor after a second game starts.
  for(const m of ['derby','dropzone','brawl','curling','golf']){
    await page.evaluate(()=>window.__MR.Game.toLobby());
    const clean=await page.evaluate(()=>{
      const host=window.__MR.partyScreen;
      return {mode:host.active,gpHidden:document.getElementById('cv').hidden,
        stageHidden:document.getElementById('partyStage').hidden,
        owner:document.getElementById('partyStage').dataset.owner};
    });
    assert.equal(clean.mode,null,'Old mode survived reset before '+m);
    assert.equal(clean.gpHidden,false,'Grand Prix original canvas not restored');
    assert.equal(clean.stageHidden,true);
    assert.equal(clean.owner,undefined);
    await page.locator('#partyModeCards .partyModeCard[data-mode="'+m+'"]').click();
    await page.locator('#btnStart').click();
    await page.waitForFunction(mode=>window.__MR.state===mode,m,{timeout:11000});
    await page.waitForFunction(mode=>window.__MR.partyScreen.active===mode,m);
    assert.equal(await page.evaluate(()=>window.__MR.partyScreen.assertExclusive()),true,
      'Game restart produced old UI or double renderer: '+m);
  }
  // Elastic Derby camera proof using real runner progress, no independent
  // decorative scene and no physics code change. These mutations exist only
  // in this browser QA restart and cannot affect any scored playthrough.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>window.__MR.state==='derby');
  await page.evaluate(()=>{
    const g=window.__MR.MODES.derby.session();
    g.state.phase='racing';
    g.state.horses.forEach(h=>{h.x=600;h.v=0;});
  });
  await page.waitForTimeout(400);
  const closeZoom=await page.evaluate(()=>window.__MR.derbyCamera.zoom);
  await page.screenshot({path:'qa-real-derby-tight-pack.png'});
  await page.evaluate(()=>{
    const g=window.__MR.MODES.derby.session();
    g.state.horses[0].x=1110;
    for(let i=1;i<g.state.horses.length;i++)g.state.horses[i].x=150;
  });
  await page.waitForTimeout(850);
  const wide=await page.evaluate(()=>window.__MR.derbyCamera);
  await page.screenshot({path:'qa-real-derby-straggler-wide.png'});
  assert.ok(wide.spread>900,'Camera test never created a genuine straggler');
  assert.ok(wide.target<.92,'Wide camera did not respond to large separation');
  assert.ok(wide.zoom<closeZoom-.015,'Derby failed to ease OUT when a marble falls behind');
  await page.evaluate(()=>{
    const g=window.__MR.MODES.derby.session();
    g.state.horses.forEach(h=>{h.x=1200;h.v=0;});
  });
  await page.waitForTimeout(850);
  const caught=await page.evaluate(()=>window.__MR.derbyCamera);
  await page.screenshot({path:'qa-real-derby-catch-up-tight.png'});
  assert.ok(caught.target>1.0&&caught.zoom>wide.zoom+.015,
    'Derby camera did not smoothly return IN after the straggler caught up');
  await page.evaluate(()=>{window.__MR.settings.reduce=true;});
  await page.waitForTimeout(180);
  assert.ok(Math.abs((await page.evaluate(()=>window.__MR.derbyCamera.zoom))-1)<.002,
    'Reduced-motion setting must freeze the TV zoom');
  await page.evaluate(()=>{window.__MR.settings.reduce=false;});
  console.log('REAL-REBUILD-DERBY-CAMERA '+JSON.stringify({closeZoom,wide,caught,
    reducedMotion:'zoom held at 1.0'}));

  await page.evaluate(()=>window.__MR.Game.toLobby());
  const finalHost=await page.evaluate(()=>({
    active:window.__MR.partyScreen.active,
    oldCanvasHidden:document.getElementById('cv').hidden,
    history:window.__MR.partyScreen.retiredHistory
  }));
  assert.equal(finalHost.active,null);
  assert.equal(finalHost.oldCanvasHidden,false);
  assert.ok(finalHost.history.length>=5);
  console.log('REAL-REBUILD-RESTART '+JSON.stringify(finalHost));
  console.log('REAL-REBUILD-PERFORMANCE '+JSON.stringify(perfSnapshots));
  console.log('PASS: all five independent full-TV mode screens, real Golf 9-hole shots and scoring, four other modes, original Grand Prix intact');
 }catch(e){
  console.error('FAIL Party Pack v2 browser smoke:',e);
  await page.screenshot({path:'qa-ui-v2-error.png'}).catch(()=>{});
  process.exitCode=1;
 }finally{await browser.close();}
})();
