/* UI v2 multiplayer QA: two real WebSocket phone sessions and a Derby TV. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const contexts=await Promise.all([browser.newContext({viewport:{width:1920,height:1080}}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})]);
 const [tv,p1,p2]=await Promise.all(contexts.map(c=>c.newPage()));
 const errs=[];for(const p of [tv,p1,p2])p.on('pageerror',e=>errs.push(e.message));
 const actions=new Map([[p1,[]],[p2,[]]]);
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
  await p1.locator('#modeActions button').filter({hasText:'Rocket'}).click();
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
  await p1.locator('#modeActions button[data-action="drop"]').click();
  await tv.waitForFunction(()=>!!window.__MR.MODES.dropzone.session().state.ball,{timeout:8000});
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

 }catch(e){console.error('FAIL Derby UI v2 2-phone smoke:',e);process.exitCode=1;}
 finally{await browser.close();}
})();
