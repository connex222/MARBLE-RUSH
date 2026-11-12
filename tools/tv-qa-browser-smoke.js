/* End-to-end opt-in TV diagnostic overlay; one game host, never physical proof. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({
   viewport:{width:1920,height:1080},acceptDownloads:true
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/tv?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__MR?.qaDiagnostics?.enabled===true);
  await page.locator('#marbleRushQaDiagnostics').waitFor({state:'visible'});
  const diag=await page.evaluate(()=>document.getElementById('marbleRushQaDiagnostics'));
  assert.equal(diag.tagName,'ASIDE');
  await page.locator('#btnBoot').click();
  await page.locator('#btnKb').click();
  await page.locator('#btnCpu').click();
  await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>window.__MR.partyScreen.active==='derby');
  await page.waitForTimeout(2400);
  await page.locator('#derbyRunner').click();
  await page.locator('#derbyPick').click();
  await page.waitForTimeout(500);
  const d=await page.evaluate(()=>window.__MR.qaDiagnostics.report());
  assert.ok(d.metrics.derby.sampleCount>=25,'Real animation frames not captured');
  assert.ok(d.metrics.derby.p95FrameIntervalMs>0,'No p95 frame metric');
  assert.ok(d.handlerToFrameSamples.some(x=>x.mode==='derby'),
    'No local handler-to-frame samples were captured');
  assert.ok(d.rendererIsolationPassed,'Diagnostics broke the exclusive scene');
  assert.equal(d.manual.physicalPhonesConnected,null,
    'Headless browser must not report any physical phones');
  assert.ok(d.limitations.some(x=>x.includes('not physical')));
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#marbleRushQaSave').click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'MARBLE-RUSH-PHYSICAL-TV-QA.json');
  const file='qa-tv-diagnostics-headless-smoke.json';
  await download.saveAs(file);
  const saved=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(saved.version,'tv-qa-v1');
  assert.ok(saved.metrics.derby.sampleCount>=25);
  await page.evaluate(()=>window.__MR.Game.toLobby());
  const hidden=await page.evaluate(()=>document.getElementById('partyStage').hidden);
  assert.equal(hidden,true);
  assert.deepEqual(errors,[],'TV diagnostics emitted JavaScript errors');
  const normal=await browser.newPage();
  await normal.goto(base+'/tv',{waitUntil:'domcontentloaded'});
  assert.equal(await normal.locator('#marbleRushQaDiagnostics').count(),0,
    'Opt-in diagnostics leaked into regular players game');
  assert.equal(await normal.evaluate(()=>window.__MR.qaDiagnostics.enabled),false);
  await normal.close();
  console.log('PASS TV diagnostics browser: opt-in only, original exclusive Derby stage, frames, action-to-RAF proxy, downloaded local report, no false physical claims.');
 }catch(e){console.error('FAIL TV diagnostics browser smoke:',e);process.exitCode=1;}
 finally{await browser.close();}
})();
