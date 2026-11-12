/*
 * MARBLE RUSH Derby GPU composition A/B, using the SAME Playwright + SwiftShader
 * process and first-heat rules. These results are HEADLESS SOFTWARE ONLY.
 * Device acceptance must be run separately on an actual Windows TV GPU.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
const seconds=Number(process.env.DERBY_BENCH_SECONDS||8);
const samples=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
 ]});
 try{
  for(const backend of ['css','gpu']){
   const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
   const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
   try{
    await page.goto(base+'/tv?derby3d=1'+(backend==='gpu'?'&derbyBackdrop=gpu':''),
      {waitUntil:'domcontentloaded'});
    await page.locator('#btnBoot').click();
    await page.locator('#btnKb').click();
    await page.locator('#btnCpu').click();
    await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
    await page.locator('#btnStart').click();
    await page.waitForFunction(()=>window.__MR?.partyScreen?.renderer==='derby-webgl-mesh-pilot-v1');
    await page.locator('#derbyPick').click();
    await page.waitForFunction(()=>window.__MR.MODES.derby.session().state.phase==='racing',
      null,{timeout:20000});
    await page.waitForTimeout(1800);
    const start=await page.evaluate(()=>({
     frames:window.__MR.partyScreen.telemetry().frames,
     now:performance.now(),
     gameTime:window.__MR.MODES.derby.session().state.time
    }));
    await page.waitForTimeout(seconds*1000);
    const end=await page.evaluate(()=>({
     frames:window.__MR.partyScreen.telemetry().frames,
     now:performance.now(),
     gameTime:window.__MR.MODES.derby.session().state.time,
     mode:window.__MR.MODES.derby.session().state.phase,
     metrics:window.__MR.partyScreen.telemetry(),
     gpu:MarbleDerbyWebGL.debug(),
     clock:MarblePartyClock.stats(),
     stageBackground:!!document.getElementById('partyStage').style.backgroundImage,
     isolated:window.__MR.partyScreen.assertExclusive()
    }));
    const elapsed=(end.now-start.now)/1000,frames=end.frames-start.frames;
    assert.ok(elapsed>seconds*.85,'Insufficient wall-time sample');
    assert.ok(frames>3,'Race frames not rendered');
    assert.equal(end.isolated,true);
    assert.equal(end.metrics.renderFailures,0);
    assert.equal(end.gpu.scenicSource,backend==='css'?'css-static-approved-art':'webgl-fullscreen-texture');
    assert.equal(end.stageBackground,backend==='css');
    assert.deepEqual(pageErrors,[]);
    // This is the P0 invariant the earlier test exposed: eight seconds
    // of game time must not turn into two when SwiftShader renders slowly.
    const engineSeconds=end.gameTime-start.gameTime;
    assert.ok(engineSeconds>=elapsed*.75,
      'Low FPS slowed authoritative Derby clock: '+engineSeconds.toFixed(2)+' game seconds / '+elapsed.toFixed(2)+' wall seconds');
    const result={backend,environment:'Playwright Chromium + SwiftShader software renderer',
     hardwareCertified:false,windowPixels:[1920,1080],requestedSeconds:seconds,
     elapsedSeconds:+elapsed.toFixed(2),sampledFrames:frames,
     deliveredFrameRate:+(frames/elapsed).toFixed(2),
     engineSeconds:+engineSeconds.toFixed(2),
     clockCatchUp:end.clock,
     renderer:end.gpu.gpuLabel,canvasBacking:end.gpu.backingPixels,
     qualityScale:end.gpu.qualityScale,drawCalls:end.gpu.drawCalls,
     hostP95FrameIntervalMs:end.metrics.p95FrameIntervalMs,
     hostP95DrawMs:end.metrics.p95DrawMs,
     hostSamples:end.metrics.measurements,
     note:'Not an actual GPU or TV/phone latency result; do not claim 60 FPS.'};
    samples.push(result);
    await page.screenshot({path:'qa-derby-webgl-'+backend+'-after-benchmark.png'});
    console.log('DERBY-COMPOSITOR-'+backend.toUpperCase()+' '+JSON.stringify(result));
   }finally{await page.close();}
  }
  const css=samples.find(x=>x.backend==='css'),gpu=samples.find(x=>x.backend==='gpu');
  const report={date:new Date().toISOString(),goal:'background compositor A/B',results:samples,
   comparison:{cssVsGpuFrameRateRatio:+(css.deliveredFrameRate/gpu.deliveredFrameRate).toFixed(2)},
   warning:'DO NOT use this headless software benchmark for target-GPU release acceptance.'};
  fs.writeFileSync('qa-derby-webgl-compositor-benchmark.json',JSON.stringify(report,null,2));
  console.log('PASS headless compositor A/B evidence produced; no hardware acceptance claim');
 }catch(e){console.error(e);process.exitCode=1;}
 finally{await browser.close();}
})();
