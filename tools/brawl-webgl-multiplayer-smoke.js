/* Actual WebSocket multiplayer smoke for the protected Crucible preview.
 * Chromium runs a full-screen host and two distinct mobile/touch phone clients.
 * This is NOT a substitute for two real physical phones or TV FPS acceptance.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle',
  '--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const contexts=await Promise.all([
  browser.newContext({viewport:{width:1920,height:1080}}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
 ]);
 const [tv,a,b]=await Promise.all(contexts.map(c=>c.newPage()));
 const errors=[];for(const p of [tv,a,b])p.on('pageerror',e=>errors.push(String(e.message)));
 const messages=new Map([[a,[]],[b,[]]]);
 for(const p of [a,b])p.on('websocket',ws=>{
  if(!ws.url().includes('/ws'))return;
  ws.on('framesent',f=>{try{messages.get(p).push(JSON.parse(f.payload));}catch(_){}});
 });
 try{
  await tv.goto(base+'/tv?brawl3d=1',{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('#btnBoot').click();
  await tv.waitForFunction(()=>/^[A-Z]{4}$/.test(
    document.querySelector('#roomCode')?.textContent||''),null,{timeout:20000});
  const code=(await tv.locator('#roomCode').textContent()).trim();
  for(const [p,name] of [[a,'Crucible Alice'],[b,'Crucible Bob']]){
    await p.goto(base+'/play?room='+code,{waitUntil:'domcontentloaded',timeout:30000});
    await p.locator('#inCode').fill(code);
    await p.locator('#inName').fill(name);
    await p.locator('#btnJoin').click();
    await p.locator('#ctl').waitFor({state:'visible',timeout:15000});
  }
  await tv.waitForFunction(()=>window.__MR?.players?.size===2,null,{timeout:15000});
  // The first phone acts as VIP, but game selection also works directly on TV.
  await tv.locator('#partyModeCards .partyModeCard[data-mode="brawl"]').click();
  await tv.waitForFunction(()=>window.__MR?.selectedMode==='brawl');
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR?.state==='brawl'&&
    document.querySelector('#partyStage')?.dataset.renderer===
      'brawl-the-crucible-native-webgl-v1',null,{timeout:16000});
  for(const p of [a,b])await p.waitForFunction(()=>
    document.body.dataset.mode==='brawl',null,{timeout:12000});
  await a.locator('#modeActions button[data-action="ram"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.brawl.session().state.events.some(
    e=>e.kind==='ram'),null,{timeout:12000});
  await b.locator('#modeActions button[data-action="anchor"]').click();
  await tv.waitForFunction(()=>window.__MR.MODES.brawl.session().state.events.some(
    e=>e.kind==='anchor'),null,{timeout:12000});
  for(const [p,action] of [[a,'ram'],[b,'anchor']]){
   assert.ok(messages.get(p).some(m=>m.t==='act'&&m.a===action),
     'The mobile controller did not send '+action+' over the socket');
  }
  const diag=await tv.evaluate(()=>{
    const st=document.querySelector('#partyStage'),session=window.__MR.MODES.brawl.session();
    return {state:window.__MR.state,renderer:st.dataset.renderer,
      brawl3d:MarbleBrawlWebGL.debug(),exclusive:window.__MR.partyScreen.assertExclusive(),
      canvases:st.querySelectorAll('canvas').length,
      events:session.state.events.filter(e=>e.kind==='ram'||e.kind==='anchor').length};
  });
  assert.equal(diag.renderer,'brawl-the-crucible-native-webgl-v1');
  assert.equal(diag.exclusive,true);
  assert.equal(diag.canvases,1);
  assert.equal(diag.brawl3d.active,true);
  assert.ok(diag.events>=2);
  await tv.locator('#partyBackLobby').click();
  await tv.waitForFunction(()=>window.__MR?.state==='lobby'&&
    !document.getElementById('cv').hidden,null,{timeout:12000});
  const restored=await tv.evaluate(()=>({
    mainCanvasVisible:!document.getElementById('cv').hidden,
    partyStageHidden:document.getElementById('partyStage').hidden,
    modeCount:document.querySelectorAll('#partyModeCards .partyModeCard').length
  }));
  assert.deepEqual(restored,{mainCanvasVisible:true,partyStageHidden:true,modeCount:2});
  assert.deepEqual(errors,[]);
  console.log('PASS REAL BROWSER WEBSOCKET: 2 distinct phone clients, RAM, ANCHOR, '+
    'native 3D canvas ownership, exit and protected Grand Prix canvas restoration');
 }finally{await browser.close();}
})().catch(error=>{console.error('CRUCIBLE TWO-PHONE FAIL:',error);process.exitCode=1;});
