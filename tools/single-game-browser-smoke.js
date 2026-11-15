/* Public Marble Rush: TV + two phone browsers + original Grand Prix.
 * Deliberately does NOT use the internal ?partyQa=1 developer switch.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const tv=await browser.newPage({viewport:{width:1920,height:1080}});
 const a=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const b=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],received=new Map([[a,[]],[b,[]]]),sent=new Map([[a,[]],[b,[]]]);
 for(const [name,page] of [['TV',tv],['Phone A',a],['Phone B',b]])
  page.on('pageerror',e=>errors.push(name+': '+e.message));
 for(const p of [a,b])p.on('websocket',ws=>{
  if(!ws.url().includes('/ws'))return;
  ws.on('framereceived',f=>{try{received.get(p).push(JSON.parse(f.payload));}catch(_){}});
  ws.on('framesent',f=>{try{sent.get(p).push(JSON.parse(f.payload));}catch(_){}});
 });
 try{
  await tv.goto(base+'/tv',{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('#btnBoot').click();
  await tv.waitForFunction(()=>/^[A-Z]{4}$/.test(
    document.querySelector('#roomCode')?.textContent||''),null,{timeout:18000});
  const room=(await tv.locator('#roomCode').textContent()).trim();
  assert.equal(await tv.locator('#partyPicker').isVisible(),false,
    'Party Pack choice panel leaked into the public Grand Prix lobby');
  assert.equal(await tv.locator('#partyModeCards button').count(),0,
    'Discontinued mode cards were built on the public page');
  assert.equal(await tv.locator('#partyNightOptions').isVisible(),false);
  const guard=await tv.evaluate(()=>{
   const g=window.__MR;
   g.Game.onAction('tv','mode','brawl');
   g.Game.onAction('tv','mode','golf');
   g.Game.onAction('tv','party',3);
   return {mode:g.selectedMode,partyLength:g.partyLength};
  });
  assert.deepEqual(guard,{mode:'grandprix',partyLength:0},
    'Public player action bypassed the sole Grand Prix gate');
  for(const [page,name] of [[a,'Alice GP'],[b,'Bob GP']]){
   await page.goto(base+'/play?room='+room,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#inCode').fill(room);
   await page.locator('#inName').fill(name);
   await page.locator('#btnJoin').click();
   await page.locator('#ctl').waitFor({state:'visible',timeout:15000});
  }
  await tv.waitForFunction(()=>window.__MR.players.size===2,null,{timeout:12000});
  await a.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
    .some(b=>/start race/i.test(b.textContent)),null,{timeout:10000});
  for(const p of [a,b]){
   const hud=received.get(p).filter(m=>m.t==='hud').at(-1);
   assert.ok(hud,'phone missing Grand Prix HUD');
   assert.equal(hud.mode,'grandprix');
   assert.deepEqual(hud.availableModes,[],
     'phone HUD exposes the retired five modes');
   assert.equal(hud.partyNightEnabled,false);
   assert.equal(await p.locator('#modePanel').isVisible(),false,
     'retired mode controls visible in Grand Prix');
  }
  const vip=await a.locator('#vip button').allTextContents();
  assert.ok(!vip.some(t=>/Grand Prix|Bowl Brawl|Drop Zone|Marble Derby|Curling|Golf|Party Night/i.test(t)),
    'VIP phone displays a game-choice button despite one-game release');
  await tv.locator('#btnStart').click();
  await a.locator('#votes button').first().waitFor({state:'visible',timeout:16000});
  await a.locator('#votes button').first().click();
  const skip=tv.locator('#btnSkipVote');
  if(await skip.isVisible())await skip.click();
  await tv.locator('#raceHud').waitFor({state:'visible',timeout:25000});
  await a.locator('#pad').tap({force:true});
  await b.locator('#pad').tap({force:true});
  await a.waitForTimeout(650);
  for(const p of [a,b]){
   assert.ok(sent.get(p).some(m=>m.t==='in'&&m.k==='p'),
    'phone race boost press not transmitted');
   assert.ok(sent.get(p).some(m=>m.t==='in'&&m.k==='r'),
    'phone boost/grip release not transmitted');
  }
  assert.equal(await tv.locator('#partyStage').isVisible(),false,
    'Grand Prix was replaced by a Party Pack game stage');
  assert.equal(await tv.evaluate(()=>window.__MR.selectedMode),'grandprix');
  assert.deepEqual(errors,[],errors.join(' | '));
  await tv.screenshot({path:'qa-single-marble-rush-tv.png'});
  await a.screenshot({path:'qa-single-marble-rush-phone.png'});
  console.log('PASS: one published Marble Rush Grand Prix, no Party Pack/Party Night, two phones, track vote, race and boost.');
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL GRAND PRIX-ONLY BROWSER QA',e);process.exitCode=1;});
