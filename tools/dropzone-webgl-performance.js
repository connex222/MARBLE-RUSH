/*
 * Native Drop Zone on-screen timing. Headless software GPU evidence ONLY.
 * Frame rate is measured from rendered TV frames, not from gl.drawElements.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
const intervalMs=Number(process.env.DROPZONE_BENCH_MS||6500);
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
 ]});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto(base+'/tv?dropzone3d=1&debug3d=1',{waitUntil:'domcontentloaded'});
  for(const selector of ['#btnBoot','#btnKb','#btnCpu',
    '#partyModeCards .partyModeCard[data-mode="dropzone"]','#btnStart'])
   await page.locator(selector).click();
  await page.waitForFunction(()=>window.__MR?.partyScreen?.renderer==='dropzone-webgl-native-3d-v1',
    null,{timeout:15000});
  await page.locator('#dropNow').click();
  await page.waitForTimeout(750);
  const start=await page.evaluate(()=>({
    time:performance.now(),
    frames:window.__MR.partyScreen.telemetry().frames,
    advanced:MarblePartyClock.stats().advancedSeconds
  }));
  await page.waitForTimeout(intervalMs);
  const end=await page.evaluate(()=>({
    time:performance.now(),
    frames:window.__MR.partyScreen.telemetry().frames,
    advanced:MarblePartyClock.stats().advancedSeconds,
    hud:window.__MR.partyScreen.telemetry(),
    graphics:MarbleDropZoneWebGL.debug(),
    gameClock:window.__MR.MODES.dropzone.session().state.elapsed,
    monitor:document.getElementById('ppDrop3dHardwareQA')?.textContent||null
  }));
  const duration=(end.time-start.time)/1000,rendered=end.frames-start.frames;
  const gameDuration=end.advanced-start.advanced;
  assert.ok(rendered>=4,'Not enough actual 3D rendered frames');
  assert.ok(duration>=intervalMs/1000*.8,'Wall-time observation invalid');
  assert.ok(gameDuration>=duration*.68,'Renderer starved the authoritative wall clock');
  assert.equal(end.hud.renderFailures,0,'WebGL renderer failed a frame');
  assert.equal(end.graphics.drawCalls,2,'Batching has regressed');
  assert.equal(end.graphics.meshTemplatesCached,true);
  assert.ok(end.graphics.hardwareQaOverlayActive);
  assert.ok(end.monitor?.includes('FPS'),'On-screen target hardware frame monitor failed');
  assert.deepEqual(errors,[]);
  const result={
    environment:'Playwright Chromium / SwiftShader software GPU, NOT target TV',
    hardwareCertified:false,
    viewport:[1920,1080],backingResolution:end.graphics.resolution,
    gpu:end.graphics.gpu,
    sampledSeconds:+duration.toFixed(2),
    displayedFrames:rendered,displayedFps:+(rendered/duration).toFixed(2),
    engineAdvancedSeconds:+gameDuration.toFixed(2),
    engineAdvanceRatio:+(gameDuration/duration).toFixed(3),
    drawCalls:end.graphics.drawCalls,
    liveOnscreenMonitor:end.monitor,
    meanDrawMs:+end.hud.averageDrawMs.toFixed(2),
    p95DrawMs:end.hud.p95DrawMs,
    p95FrameIntervalMs:end.hud.p95FrameIntervalMs,
    note:'Frame rate here is not a pass for TV hardware, gaming laptops, mobile Wi-Fi or input latency.'
  };
  fs.writeFileSync('qa-dropzone-webgl-performance.json',JSON.stringify(result,null,2));
  console.log('DROPZONE-WEBGL-SOFTWARE-PERF '+JSON.stringify(result));
  console.log('PASS actual canvas frame count and authoritative clock despite slow software GPU');
 }catch(e){console.error(e);console.error('page errors',errors);process.exitCode=1;}
 finally{await browser.close();}
})();
