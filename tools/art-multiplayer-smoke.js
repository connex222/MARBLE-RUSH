/* MARBLE RUSH three-device local WebSocket smoke acceptance.
 * One TV plus two independent mobile browser sessions, exercising QR room,
 * join, host controls, vote, countdown, race HUD and pad input.
 * Runs only against local ephemeral server in GitHub Actions.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const tv=await browser.newPage({viewport:{width:1600,height:900}});
  const p1=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p2=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  for(const [name,page] of [['TV',tv],['Phone A',p1],['Phone B',p2]]){
    page.on('pageerror',e=>errors.push(name+': '+e.message));
  }
  const flows=new Map([[p1,{sent:[],received:[]}],[p2,{sent:[],received:[]}]]);
  for(const [page,log] of flows){
    page.on('websocket',ws=>{
      if(!ws.url().includes('/ws'))return;
      ws.on('framesent',frame=>{try{log.sent.push(JSON.parse(frame.payload));}catch(e){}});
      ws.on('framereceived',frame=>{try{log.received.push(JSON.parse(frame.payload));}catch(e){}});
    });
  }
  try{
    await tv.goto(base+'/tv',{waitUntil:'domcontentloaded',timeout:25000});
    await tv.locator('#btnBoot').click();
    await tv.waitForFunction(()=>/^[A-Z]{4}$/.test(document.querySelector('#roomCode')?.textContent||''),{timeout:20000});
    const room=await tv.locator('#roomCode').textContent();
    assert.match(room,/^[A-Z]{4}$/);
    for(const [page,name] of [[p1,'Test Alice'],[p2,'Test Bob']]){
      await page.goto(base+'/play?room='+room,{waitUntil:'domcontentloaded',timeout:25000});
      await page.locator('#inCode').fill(room);
      await page.locator('#inName').fill(name);
      // Separate phone contexts must use different generated player IDs.
      await page.waitForTimeout(900);
      await page.locator('#btnJoin').click();
      await page.locator('#ctl').waitFor({state:'visible',timeout:15000});
      await page.waitForFunction(
        () => document.querySelector('#join .logo.asset-logo img')?.complete === true,
        null,{timeout:15000}
      );
      const themed=await page.evaluate(()=>({
        background:getComputedStyle(document.body).backgroundImage,
        mini:getComputedStyle(document.querySelector('#meMarble')).backgroundImage,
        swatch:getComputedStyle(document.querySelector('#swirls .sw')).backgroundImage
      }));
      assert.ok(themed.background.includes('bg_phone.webp'),'Approved controller background not applied to '+name);
      assert.ok(themed.mini.includes('marble_swirl_'),'Approved marble texture not on phone HUD for '+name);
      assert.ok(themed.swatch.includes('marble_swirl_01.webp'),'Approved 12-marble picker art not applied for '+name);
    }
    await tv.waitForFunction(()=>{
      const names=[...document.querySelectorAll('#lobbyPlayers .pname span')].map(x=>x.textContent);
      return names.includes('Test Alice')&&names.includes('Test Bob');
    },{timeout:10000});
    const a=flows.get(p1),b=flows.get(p2);
    assert.ok(a.sent.some(x=>x.t==='join'&&x.code===room));
    assert.ok(b.sent.some(x=>x.t==='join'&&x.code===room));
    assert.ok(a.received.some(x=>x.t==='hud'&&x.s==='lobby'));
    assert.ok(b.received.some(x=>x.t==='hud'&&x.s==='lobby'));
    // The first joined phone should be VIP. Mode choice must be carried by
    // the existing <4 KB action message and never unlock unfinished modes.
    await p1.waitForFunction(()=>[...document.querySelectorAll('#vip button')].some(b=>b.textContent.includes('Grand Prix')),{timeout:10000});
    await p1.locator('#vip button').filter({hasText:'Grand Prix'}).click();
    await tv.waitForFunction(()=>window.__MR?.selectedMode==='grandprix',{timeout:10000});
    assert.ok(a.sent.some(x=>x.t==='act'&&x.a==='mode'&&x.v==='grandprix'),'VIP mode choice did not reach TV');
    assert.equal(await tv.locator('#partyModeCards .partyModeCard[data-locked="true"]').count(),5,'Unfinished modes must remain locked');
    await tv.locator('#btnStart').click();
    await p1.locator('#votes button').first().waitFor({state:'visible',timeout:15000});
    await p1.locator('#votes button').first().click();
    assert.ok(a.sent.some(x=>x.t==='act'&&x.a==='vote'));
    const skip=tv.locator('#btnSkipVote');
    if(await skip.isVisible())await skip.click();
    await tv.locator('#raceHud').waitFor({state:'visible',timeout:20000});
    await tv.waitForFunction(()=>document.querySelector('#raceTime')?.textContent!=='0:00.0',{timeout:25000});
    await p1.locator('#pad').tap({force:true});
    await p2.locator('#pad').tap({force:true});
    await p1.waitForTimeout(1500);
    for(const [name,flow] of [['Alice',a],['Bob',b]]){
      assert.ok(flow.received.some(x=>x.t==='hud'&&x.s==='race'),'Missing live race HUD for '+name);
      assert.ok(flow.sent.some(x=>x.t==='in'&&x.k==='p'),'Missing boost pad press from '+name);
      assert.ok(flow.sent.some(x=>x.t==='in'&&x.k==='r'),'Missing boost pad release from '+name);
    }
    assert.deepEqual(errors,[],'Uncaught JS errors in TV/phone sessions');
    await tv.screenshot({path:'qa-art-multiplayer-tv.png',fullPage:true});
    await p1.screenshot({path:'qa-art-multiplayer-phone.png',fullPage:true});
    console.log('PASS: TV + 2 independent phones joined room '+room+', loaded approved phone art, voted, received active race HUD, sent real boost press/release');
    console.log('MULTIPLAYER SMOKE STATS:',JSON.stringify({room,
      a:{messages:a.sent.length,hud:a.received.filter(x=>x.t==='hud').length},
      b:{messages:b.sent.length,hud:b.received.filter(x=>x.t==='hud').length},
      track:await tv.locator('#trackName').textContent()}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error('FAIL:',e.stack||e);process.exitCode=1;});
