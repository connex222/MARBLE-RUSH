/* UI v2 multiplayer QA: two real WebSocket phone sessions and a Derby TV. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const contexts=await Promise.all([browser.newContext({viewport:{width:1920,height:1080}}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})]);
 const [tv,p1,p2]=await Promise.all(contexts.map(c=>c.newPage()));
 const errs=[];for(const p of [tv,p1,p2])p.on('pageerror',e=>errs.push(e.message));
 const actions=new Map([[p1,[]],[p2,[]]]);
 const e2eLatency=[];
 for(const p of [p1,p2])p.on('websocket',ws=>{
  if(!ws.url().includes('/ws'))return;
  ws.on('framesent',f=>{try{actions.get(p).push(JSON.parse(f.payload));}catch(e){}});
 });
 try{
  await tv.goto(base+'/tv',{waitUntil:'domcontentloaded'});
  await tv.locator('#btnBoot').click();
  await tv.waitForFunction(()=>/^[A-Z]{4}$/.test(document.querySelector('#roomCode')?.textContent||''),{timeout:18000});
  const code=await tv.locator('#roomCode').textContent();
  for(const [p,name] of [[p1,'Derby Alice'],[p2,'Derby Bob']]){
   await p.goto(base+'/play?room='+code,{waitUntil:'domcontentloaded'});
   await p.locator('#inCode').fill(code);
   await p.locator('#inName').fill(name);
   await p.locator('#btnJoin').click();
   await p.locator('#ctl').waitFor({state:'visible',timeout:15000});
  }
  await tv.waitForFunction(()=>window.__MR.players.size===2,{timeout:15000});
  // Only the VIP selects a currently playable mode.
  await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
   .some(b=>b.textContent.includes('Marble Derby')),{timeout:10000});
  await p1.locator('#vip button').filter({hasText:'Marble Derby'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='derby',{timeout:8000});
  await tv.locator('#btnStart').click();
  await tv.locator('#partyStage').waitFor({state:'visible',timeout:10000});
  await p1.waitForFunction(()=>document.body.dataset.mode==='derby',{timeout:8000});
  await p2.waitForFunction(()=>document.body.dataset.mode==='derby',{timeout:8000});
  let inputAt=Date.now();
  await p1.locator('#modeActions button').filter({hasText:'Rocket'}).click();
  await tv.waitForFunction(()=>window.__MR.MODES.derby.session()?.state.wagers.size>=1,{timeout:10000});
  e2eLatency.push({mode:'derby',action:'bet',ms:Date.now()-inputAt});
  await p2.locator('#modeActions button').filter({hasText:'Comet'}).click();
  await tv.waitForFunction(()=>window.__MR.MODES.derby.session()?.state.wagers.size===2,{timeout:10000});
  const wagers=await tv.evaluate(()=>{
   const g=window.__MR.MODES.derby.session();
   return {count:g.state.wagers.size,round:g.state.round,phase:g.state.phase,
    roster:g.state.roster.map(p=>({name:p.name,gems:p.gems}))};
  });
  assert.equal(wagers.count,2);
  assert.ok(wagers.roster.every(p=>p.gems>=0),'Virtual gem balance invalid');
  for(const p of [p1,p2])assert.ok(actions.get(p).some(m=>m.t==='act'&&m.a==='bet'),
   'Phone must send authorised Derby bet over WebSocket');
  assert.deepEqual(errs,[],'JS exceptions in Derby multiplayer');
  await tv.screenshot({path:'qa-ui-v2-derby-two-phones-tv.png'});
  await p1.screenshot({path:'qa-ui-v2-derby-phone.png'});
  console.log('PASS: one TV + two independently joined phones, VIP Derby selection, synced HUD and distinct bets.');
  // Same room and two connected phones must survive the new Drop Zone swap.
  await tv.evaluate(()=>window.__MR.Game.toLobby());
  await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
    .some(b=>b.textContent.includes('Drop Zone')),{timeout:10000});
  await p1.locator('#vip button').filter({hasText:'Drop Zone'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='dropzone',{timeout:10000});
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR.state==='dropzone' &&
    document.getElementById('partyStage').dataset.mode==='dropzone',{timeout:10000});
  await p1.waitForFunction(()=>document.body.dataset.mode==='dropzone' &&
    document.body.dataset.dropPhase==='aim',{timeout:10000});
  await p2.waitForFunction(()=>document.body.dataset.mode==='dropzone',{timeout:10000});
  await p1.screenshot({path:'qa-ui-v2-dropzone-phone-aim.png'});
  const before=await tv.evaluate(()=>window.__MR.MODES.dropzone.session().state.x);
  await p1.locator('#modeActions button[data-action="left"]').click();
  await tv.waitForFunction(x=>window.__MR.MODES.dropzone.session().state.x<x,before,{timeout:8000});
  // User controls travel through the original authenticated phone channel.
  inputAt=Date.now();
  await p1.locator('#modeActions button[data-action="drop"]').click();
  await tv.waitForFunction(()=>!!window.__MR.MODES.dropzone.session().state.ball,{timeout:8000});
  e2eLatency.push({mode:'dropzone',action:'drop',ms:Date.now()-inputAt});
  await p2.waitForFunction(()=>document.body.dataset.dropPhase==='falling',{timeout:8000});
  await p2.locator('#dropGuide').waitFor({state:'visible',timeout:8000});
  const predictions=p2.locator('#modeActions button[data-action="predict"]');
  if(await predictions.count())await predictions.first().click();
  const drop=await tv.evaluate(()=>{
    const s=window.__MR.MODES.dropzone.session().state;
    return {mode:document.getElementById('partyStage').dataset.mode,
      round:s.round,turn:s.turn,ball:!!s.ball,pegs:s.pegs.length,owner:s.ball?.id};
  });
  assert.equal(drop.mode,'dropzone');
  assert.equal(drop.pegs,85);
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='left'));
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='drop'));
  assert.ok(actions.get(p2).some(m=>m.t==='act'&&m.a==='predict'),
    'Second phone did not send a prize prediction');
  await tv.screenshot({path:'qa-ui-v2-dropzone-two-phones-tv.png'});
  await p1.screenshot({path:'qa-ui-v2-dropzone-phone.png'});
  await p2.screenshot({path:'qa-ui-v2-dropzone-predict.png'});
  assert.deepEqual(errs,[],'JS errors during new Drop Zone: '+errs.join(' | '));
  console.log('PASS: same TV plus two connected phones used new Drop Zone UI, live aim/drop and spectator prediction.');
  // Brawl mode shares the already-established authenticated two-phone room.
  await tv.evaluate(()=>window.__MR.Game.toLobby());
  await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
    .some(b=>b.textContent.includes('Bowl Brawl')),{timeout:10000});
  await p1.locator('#vip button').filter({hasText:'Bowl Brawl'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='brawl',{timeout:8000});
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR.state==='brawl'&&
    document.getElementById('partyStage').dataset.mode==='brawl',{timeout:10000});
  await p1.waitForFunction(()=>document.body.dataset.mode==='brawl'&&
    document.body.dataset.s==='brawl',{timeout:10000});
  await p2.waitForFunction(()=>document.body.dataset.mode==='brawl',{timeout:10000});
  const e0=await tv.evaluate(()=>window.__MR.MODES.brawl.session().state.marbles.map(m=>m.energy));
  inputAt=Date.now();
  await p1.locator('#modeActions button[data-action="ram"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.brawl.session().state.events.some(e=>e.kind==='ram'),{timeout:8000});
  e2eLatency.push({mode:'brawl',action:'ram',ms:Date.now()-inputAt});
  await p2.locator('#modeActions button[data-action="anchor"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.brawl.session().state.events.some(e=>e.kind==='anchor'),{timeout:8000});
  const brawl=await tv.evaluate(()=>{
    const s=window.__MR.MODES.brawl.session().state;
    return {round:s.round,alive:s.marbles.filter(m=>m.alive).length,
      hazard:s.hazard,ram:s.events.filter(e=>e.kind==='ram').length,
      anchor:s.events.filter(e=>e.kind==='anchor').length};
  });
  assert.equal(brawl.round,1);
  assert.equal(brawl.hazard,'bumpers');
  assert.ok(brawl.ram>=1&&brawl.anchor>=1);
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='ram'),
    'First phone did not send Brawl RAM');
  assert.ok(actions.get(p2).some(m=>m.t==='act'&&m.a==='anchor'),
    'Second phone did not send Brawl ANCHOR');

  // Real multiplayer recovery: the first phone must rescue its own marble.
  const p1BrawlId=await tv.evaluate(()=>{
    const g=window.__MR.MODES.brawl.session();
    return g.state.events.find(e=>e.kind==='ram')?.id;
  });
  assert.ok(p1BrawlId);
  await tv.evaluate(id=>{
    const g=window.__MR.MODES.brawl.session(),m=g.current(id);
    m.x=g.state.radius-22-46;m.y=0;m.vx=0;m.vy=0;m.heading=Math.PI;
    m.energy=90;m.cooldown=0;m.recoverUsed=false;
  },p1BrawlId);
  await p1.waitForFunction(()=>!!document.querySelector('#modeActions button[data-action="recover"]'),
    {timeout:8000});
  await p1.screenshot({path:'qa-ui-v2-brawl-phone-edge-recover.png'});
  await p1.locator('#modeActions button[data-action="recover"]').click();
  await tv.waitForFunction(id=>window.__MR.MODES.brawl.session().state.events
    .some(e=>e.kind==='recover'&&e.id===id),p1BrawlId,{timeout:8000});
  const mAfter=await tv.evaluate(id=>{
    const m=window.__MR.MODES.brawl.session().current(id);
    return {energy:m.energy,used:m.recoverUsed,vx:m.vx};
  },p1BrawlId);
  assert.ok(mAfter.used&&mAfter.energy<65,
    'Recover must cost 35 energy and consume one life-saving action');
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='recover'),
    'First phone did not transmit its authorised Brawl escape');

  assert.equal(await p1.locator('#padZone').isVisible(),false,
    'Old boost pad must be absent from Brawl interface');
  await tv.screenshot({path:'qa-ui-v2-brawl-two-phones-tv.png'});
  await p1.screenshot({path:'qa-ui-v2-brawl-phone-ram.png'});
  await p2.screenshot({path:'qa-ui-v2-brawl-phone-anchor.png'});
  assert.deepEqual(errs,[],'Uncaught error in new Bowl Brawl '+errs.join(' | '));
  console.log('PASS: two authenticated phones control newly rendered Brawl, RAM and ANCHOR, shared TV synced.');

  // Curling keeps the two-phone room and uses the old authorised action protocol.
  await tv.evaluate(()=>window.__MR.Game.toLobby());
  await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')].some(b=>b.textContent.includes('Marble Curling')),{timeout:10000});
  await p1.locator('#vip button').filter({hasText:'Marble Curling'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='curling',{timeout:8000});
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR.state==='curling'&&document.getElementById('partyStage').dataset.mode==='curling',{timeout:10000});
  await p1.waitForFunction(()=>document.body.dataset.mode==='curling',{timeout:10000});
  await p2.waitForFunction(()=>document.body.dataset.mode==='curling',{timeout:10000});
  await p1.screenshot({path:'qa-ui-v2-curling-phone-aim.png'});
  await p1.locator('#modeActions button[data-action="right"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.curling.session().state.aim>0,{timeout:8000});
  inputAt=Date.now();
  await p1.locator('#modeActions button[data-action="throw"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.curling.session().state.phase==='slide',{timeout:8000});
  e2eLatency.push({mode:'curling',action:'throw',ms:Date.now()-inputAt});
  await p1.locator('#modeActions button[data-action="sweep"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.curling.session().state.events.some(e=>e.kind==='sweep'),{timeout:8000});
  await p2.locator('#modeActions button[data-action="predict"]').first().click();
  await tv.waitForFunction(()=>window.__MR.MODES.curling.session().state.events.some(e=>e.kind==='prediction'),{timeout:8000});
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='throw'));
  assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a==='sweep'));
  assert.ok(actions.get(p2).some(m=>m.t==='act'&&m.a==='predict'));
  assert.equal(await p1.locator('#padZone').isVisible(),false);
  await tv.screenshot({path:'qa-ui-v2-curling-two-phones-tv.png'});
  await p1.screenshot({path:'qa-ui-v2-curling-phone-sweep.png'});
  await p2.screenshot({path:'qa-ui-v2-curling-phone-predict.png'});
  assert.deepEqual(errs,[],'Curling browser error');
  console.log('PASS: two phones correctly throw, sweep and predict on the new Curling rink.');

  // Fifth new mode: same TV room, two independent phones and real Golf actions.
  await tv.evaluate(()=>window.__MR.Game.toLobby());
  await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
    .some(b=>b.textContent.includes('Marble Golf')));
  await p1.locator('#vip button').filter({hasText:'Marble Golf'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='golf');
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR.state==='golf'&&
    document.getElementById('partyStage').dataset.mode==='golf');
  await p1.waitForFunction(()=>document.body.dataset.mode==='golf'&&
    document.body.dataset.s==='golf');
  await p2.waitForFunction(()=>document.body.dataset.mode==='golf');
  const golf0=await tv.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {angle:s.angle,power:s.power,holes:s.holes,player:s.roster[s.turn]?.id};
  });
  assert.equal(golf0.holes,9,'Golf standalone game must be nine holes');
  await p1.locator('#modeActions button[data-action="right"]').click();
  await tv.waitForFunction(x=>window.__MR.MODES.golf.session().state.angle>x,golf0.angle);
  await p1.locator('#modeActions button[data-action="powerup"]').click();
  await tv.waitForFunction(x=>window.__MR.MODES.golf.session().state.power>x,golf0.power);
  await p1.locator('#modeActions button[data-action="preview"]').click();
  await tv.waitForFunction(()=>!!window.__MR.MODES.golf.session().state.ghost);
  await p1.screenshot({path:'qa-ui-v2-golf-phone-aim.png'});
  inputAt=Date.now();
  await p1.locator('#modeActions button[data-action="shoot"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.golf.session().state.phase==='rolling');
  e2eLatency.push({mode:'golf',action:'shoot',ms:Date.now()-inputAt});
  await p2.waitForFunction(()=>document.querySelector('#modeActions button[data-action="cheer"]'));
  await p2.locator('#modeActions button[data-action="cheer"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.golf.session().state.events.some(e=>e.kind==='spectatorCheer'));
  const golfLive=await tv.evaluate(()=>{
    const s=window.__MR.MODES.golf.session().state;
    return {phase:s.phase,strokes:s.strokes,hole:s.hole,holes:s.holes,
      shot:s.events.some(e=>e.kind==='shot'),
      cheers:s.events.filter(e=>e.kind==='spectatorCheer').length,
      ghost:!!s.ghost};
  });
  assert.equal(golfLive.holes,9);
  assert.equal(golfLive.strokes,1);
  assert.equal(golfLive.ghost,false,'Trajectory hint remained after Golf shot');
  assert.ok(golfLive.shot&&golfLive.cheers>=1);
  for(const action of ['right','powerup','preview','shoot'])
    assert.ok(actions.get(p1).some(m=>m.t==='act'&&m.a===action),
      'Phone did not send Golf '+action+' over WebSocket');
  assert.ok(actions.get(p2).some(m=>m.t==='act'&&m.a==='cheer'),
    'Other phone did not send Golf spectator cheer');
  assert.equal(await p1.locator('#padZone').isVisible(),false,
    'Old Grand Prix pad leaked into new Golf phone UI');
  await tv.screenshot({path:'qa-ui-v2-golf-two-phones-tv.png'});
  await p1.screenshot({path:'qa-ui-v2-golf-phone-after-putt.png'});
  await p2.screenshot({path:'qa-ui-v2-golf-phone-spectator.png'});
  assert.deepEqual(errs,[],'Browser JS errors in Golf multiplayer');
  console.log('PASS: two phones successfully aim, power, preview, putt and cheer in new Golf UI.');
  assert.equal(e2eLatency.length,5,'Must record one real phone→TV action for every mode');
  const ordered=e2eLatency.map(v=>v.ms).sort((a,b)=>a-b);
  const e2eReport={
    samples:e2eLatency,medianMs:ordered[2],p95Ms:ordered[4],
    measurement:'Playwright phone tap through WebSocket to authoritative TV state; browser CI, not physical Wi-Fi',
    physicalDevicesTested:false
  };
  fs.writeFileSync('qa-real-phone-latency.json',JSON.stringify(e2eReport,null,2));
  console.log('HEADLESS-WEBSOCKET-LATENCY '+JSON.stringify({
    samples:e2eLatency,medianMs:ordered[2],p95Ms:ordered[4],
    measurement:'Playwright phone tap through WebSocket to authoritative TV state; browser CI, not physical Wi-Fi'
  }));
  assert.deepEqual(errs,[],'Phone/TV session JS errors: '+errs.join(' | '));



 }catch(e){console.error('FAIL Derby UI v2 2-phone smoke:',e);process.exitCode=1;}
 finally{await browser.close();}
})();
