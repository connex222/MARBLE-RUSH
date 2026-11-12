/* Physical rejoin workflow simulated with two independent browser phone contexts.
 * Not proof of a physical Wi-Fi session. Prevents duplicate-tab controller theft.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const [tvCtx,aCtx,bCtx]=await Promise.all([
  browser.newContext({viewport:{width:1920,height:1080}}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
  browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
 ]);
 const [tv,a,b]=await Promise.all([tvCtx.newPage(),aCtx.newPage(),bCtx.newPage()]);
 const errors=[];for(const p of [tv,a,b])p.on('pageerror',e=>errors.push(e.message));
 try{
  await tv.goto(base+'/tv',{waitUntil:'domcontentloaded'});
  await tv.locator('#btnBoot').click();
  await tv.waitForFunction(()=>/^[A-Z]{4}$/.test(document.getElementById('roomCode')?.textContent||''));
  const code=(await tv.locator('#roomCode').textContent()).trim();
  async function join(p,name){
    await p.goto(base+'/play?room='+code,{waitUntil:'domcontentloaded'});
    await p.locator('#inCode').fill(code);
    await p.locator('#inName').fill(name);
    await p.locator('#btnJoin').click();
    await p.locator('#ctl').waitFor({state:'visible',timeout:15000});
  }
  await join(a,'Refresh A');
  await join(b,'Refresh B');
  await tv.waitForFunction(()=>window.__MR.players.size===2);
  const stablePid=await b.evaluate(()=>localStorage.getItem('mr_pid'));
  await a.waitForFunction(()=>[...document.querySelectorAll('#vip button')]
    .some(x=>x.textContent.includes('Marble Derby')));
  await a.locator('#vip button').filter({hasText:'Marble Derby'}).click();
  await tv.waitForFunction(()=>window.__MR.selectedMode==='derby');
  await tv.locator('#btnStart').click();
  await b.waitForFunction(()=>document.body.dataset.mode==='derby');
  const before=await tv.evaluate(()=>({
    players:[...window.__MR.players.keys()],
    heat:window.__MR.MODES.derby.session()?.state.round
  }));
  assert.equal(before.players.length,2);
  await b.reload({waitUntil:'domcontentloaded'});
  await b.locator('#ctl').waitFor({state:'visible',timeout:12000});
  await b.waitForFunction(()=>document.body.dataset.mode==='derby');
  assert.equal(await b.evaluate(()=>localStorage.getItem('mr_pid')),stablePid);
  await tv.waitForFunction(id=>window.__MR.players.get(id)?.connected===true,stablePid);
  assert.deepEqual((await tv.evaluate(()=>[...window.__MR.players.keys()])).sort(),before.players.sort(),
    'Reload must not add a duplicate racer');
  // A cloned tab carrying the same stored ID supersedes the first, without
  // creating a second player or an endless two-tab reconnection fight.
  const clone=await bCtx.newPage();
  clone.on('pageerror',e=>errors.push(e.message));
  await clone.goto(base+'/play?room='+code,{waitUntil:'domcontentloaded'});
  await clone.locator('#ctl').waitFor({state:'visible',timeout:12000});
  await clone.waitForFunction(()=>document.body.dataset.mode==='derby');
  await b.waitForFunction(()=>document.getElementById('joinErr')?.textContent
    .includes('another tab'),{timeout:12000});
  await b.waitForTimeout(900);
  assert.equal(await b.locator('#ctl').isVisible(),false,
    'Superseded tab remained an active race controller');
  assert.equal(await clone.locator('#ctl').isVisible(),true,
    'Winning tab lost control due to reconnect ping-pong');
  assert.equal(await tv.evaluate(()=>window.__MR.players.size),2);
  await clone.close();
  await b.reload({waitUntil:'domcontentloaded'});
  await b.locator('#ctl').waitFor({state:'visible',timeout:12000});
  await b.waitForFunction(()=>document.body.dataset.mode==='derby');
  assert.equal(await b.evaluate(()=>localStorage.getItem('mr_pid')),stablePid);
  await tv.waitForFunction(id=>window.__MR.players.get(id)?.connected===true,stablePid);
  assert.equal(await tv.evaluate(()=>window.__MR.players.size),2);
  assert.ok((await tv.evaluate(()=>window.__MR.partyScreen.assertExclusive())),
    'Reconnect reactivated a previous/duplicate mode UI');
  assert.deepEqual(errors,[]);
  console.log('PASS reconnect: two phones, in-game reload, same stable player, duplicate-tab close 4009, no take-over ping-pong, recovered phone + exclusive Derby stage.');
  console.log('LIMITATION: browser Wi-Fi simulation is not a physical-device reconnection test.');
 }catch(e){console.error('FAIL real-rebuild reconnect smoke:',e);process.exitCode=1;}
 finally{await browser.close();}
})();
