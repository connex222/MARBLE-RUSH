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
  assert.deepEqual(menu.filter(c=>!c.disabled).map(c=>c.mode),['grandprix','derby'],
   'Only Grand Prix and rebuilt Derby may be selected');
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
    buttons:[...stage.querySelectorAll('button')].map(b=>b.id)};
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
  // A second mode start must still reach original Grand Prix, untouched by the reset.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="grandprix"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>['vote','countdown','race'].includes(window.__MR.state),{timeout:12000});
  assert.ok(await page.locator('#raceHud').count(),'Original Grand Prix screen was deleted');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('PASS: exclusive 1920×1080 Derby stage, old canvases absent, real wager, five heat finale, Grand Prix preserved');
 }catch(e){
  console.error('FAIL Party Pack v2 browser smoke:',e);
  await page.screenshot({path:'qa-ui-v2-error.png'}).catch(()=>{});
  process.exitCode=1;
 }finally{await browser.close();}
})();
