/*
 * Headless SwiftShader smoke for real 3D Drop Zone only; not TV hardware QA.
 * Physically simulated pegged ball is always read from DropZone.state.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
 ]});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const proof={reviewOnly:true,physicalTv:false,mode:'dropzone',graphics:null,physics:null,otherMode:null};
 try{
  await page.goto(BASE+'/tv?dropzone3d=1&probe3d=1',{waitUntil:'domcontentloaded'});
  await page.locator('#btnBoot').click();
  await page.locator('#btnKb').click();
  await page.locator('#btnCpu').click();
  await page.locator('#partyModeCards .partyModeCard[data-mode="dropzone"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>
   window.__MR?.partyScreen?.renderer==='dropzone-webgl-native-3d-v1',
   null,{timeout:15000});
  await page.waitForTimeout(900);
  const first=await page.evaluate(()=>{
   const screen=window.__MR.partyScreen,g=window.__MR.MODES.dropzone.session();
   const canvas=document.getElementById('partyStageCanvas');
   return {renderer:screen.renderer,owner:screen.assertExclusive(),
    graphics:MarbleDropZoneWebGL.debug(),
    canvasCount:document.querySelectorAll('#partyStage canvas').length,
    webgl:!!(canvas.getContext('webgl2')||canvas.getContext('webgl')),
    pegs:g.state.pegs.length,slots:DropZone.BINS.length,
    ball:!!g.state.ball,round:g.state.round};
  });
  assert.equal(first.renderer,'dropzone-webgl-native-3d-v1');
  assert.equal(first.owner,true,'Two renderers overlap');
  assert.equal(first.canvasCount,1,'More than one active stage canvas');
  assert.equal(first.webgl,true);
  assert.equal(first.pegs,85);assert.equal(first.slots,8);
  assert.ok(first.graphics.realMeshes&&first.graphics.drawCalls>=2&&
   first.graphics.drawCalls<=4,'Must batch native 3D pegs');
  assert.equal(first.graphics.labels,9,'Eight scored bins and one event callout');
  assert.equal(first.graphics.meshTemplatesCached,true,'3D shape topology cache absent');
  assert.equal(first.graphics.materialAttributeFloats,10);
  assert.equal(first.graphics.pixelProbeEnabled,true);
  assert.equal(first.graphics.autoScaleEnabled,true);
  assert.equal(first.graphics.resolutionScale,.55);
  assert.equal(await page.evaluate(()=>MarbleDropZoneWebGL.recommendScale(12,.8,.55,1)),.66);

  assert.ok(first.graphics.staticTriangles>18000&&
    first.graphics.staticTriangles<28000,
    'Real fixed 3D pegs should be both present and less costly: '+first.graphics.staticTriangles);
  assert.ok(first.graphics.dynamicTriangles>400&&
    first.graphics.dynamicTriangles<2500,
    'Higher-quality moving marble should remain a genuine 3D mesh');
  assert.equal(first.graphics.surfaceQuality,'basic',
    'Software SwiftShader must default to cheaper material shading');
  const frameBefore=first.graphics.frame;
  assert.equal(await page.evaluate(()=>MarbleDropZoneWebGL.setSurfaceQuality('premium')),true);
  await page.waitForFunction(frame=>MarbleDropZoneWebGL.debug().frame>frame,
    frameBefore,{timeout:12000});
  const premium=await page.evaluate(()=>{
    const ctx=document.getElementById('partyStageCanvas').getContext('webgl2')||
      document.getElementById('partyStageCanvas').getContext('webgl');
    return {surface:MarbleDropZoneWebGL.debug().surfaceQuality,error:ctx.getError()};
  });
  assert.equal(premium.surface,'premium');
  assert.equal(premium.error,0,'Premium material shader generated GL error');
  await page.screenshot({path:'qa-dropzone-webgl-premium-shaders.png'});
  assert.equal(await page.evaluate(()=>MarbleDropZoneWebGL.setSurfaceQuality('basic')),true);
  assert.deepEqual(first.graphics.cameraTarget,[3.0,0,0]);
  const slots=await page.evaluate(()=>
    [...document.querySelectorAll('#ppDrop3dBinLabels [data-bin]')]
     .map(x=>({i:Number(x.dataset.bin),left:parseFloat(x.style.left),
       top:parseFloat(x.style.top)})));
  assert.equal(slots.length,8);
  assert.ok(slots.every((x,i)=>x.left>17&&x.left<80&&x.top>50&&x.top<94&&
    (i===0||x.left>slots[i-1].left)),
   '3D-scored bins escaped HUD-safe viewport: '+JSON.stringify(slots));
  console.log('DROPZONE-3D-PIXEL-PROBE '+JSON.stringify(first.graphics.geometryProbe));
  assert.equal(first.graphics.geometryProbe?.error,0,
    'WebGL rendered a GL error even though draw calls completed');
  assert.notDeepEqual(first.graphics.geometryProbe?.before,
    first.graphics.geometryProbe?.after,
    'Native 3D marble draw call did not change its actual pixel; mesh invisible');
  proof.graphics=first.graphics;
  await page.screenshot({path:'qa-dropzone-webgl-aim.png'});
  await page.locator('#dropNow').click();
  // Under very slow SwiftShader rendering the game clock stays correct:
  // a complete scored drop may happen before the browser's next screenshot.
  // Both phases are valid; the test must not interpret a scored ball as lost.
  await page.waitForFunction(()=>{
   const st=window.__MR.MODES.dropzone.session().state;
   return !!st.ball||st.turn>=1;
  },null,{timeout:10000});
  const flight=await page.evaluate(()=>{
   const st=window.__MR.MODES.dropzone.session().state;
   return {x:st.ball?.x,y:st.ball?.y,vy:st.ball?.vy,
    turn:st.turn,elapsed:st.elapsed,draw:MarbleDropZoneWebGL.debug(),
    scored:st.events.some(e=>e.kind==='bucket'&&e.round===1),
    count:st.events.length};
  });
  // A newly released marble legitimately starts at y=35 with positive vy.
  // A two-frame headless browser may inspect it before its first physics step.
  const releasedOrMoving=Number.isFinite(flight.x)&&
    Number.isFinite(flight.y)&&flight.y>=35&&Number.isFinite(flight.vy)&&flight.vy>0;
  assert.ok(releasedOrMoving||(flight.turn>=1&&flight.scored),
    'Drop must be released, airborne or officially scored: '+JSON.stringify(flight));
  assert.ok(flight.draw.frame>first.graphics.frame,'3D renderer stopped submitting frames');
  await page.screenshot({path:'qa-dropzone-webgl-flight.png'});
  // Drive deterministic engine until that dropped marble scores.
  await page.evaluate(()=>{
   const g=window.__MR.MODES.dropzone.session();
   let n=0;
   while(g.state.turn===0&&n++<2400)g.step(.05);
   if(g.state.turn!==1)throw Error('Native 3D Drop Zone ball failed to score');
  });
  const scored=await page.evaluate(()=>{
   const st=window.__MR.MODES.dropzone.session().state;
   return {turn:st.turn,score:st.roster[0].score,drops:st.roster[0].drops,
    events:st.events.slice(-4).map(x=>x.kind)};
  });
  assert.equal(scored.turn,1);assert.equal(scored.drops,1);
  assert.ok(scored.score>=50&&scored.score<=1000);
  proof.physics={first,flight,scored};
  // Deliberately lose and restore the actual WebGL GPU context, not a CSS
  // canvas. The original rule engine must retain every completed score.
  const recovery=await page.evaluate(()=>{
    const canvas=document.getElementById('partyStageCanvas');
    const ctx=canvas.getContext('webgl2')||canvas.getContext('webgl');
    const extension=ctx.getExtension('WEBGL_lose_context');
    if(!extension)return {supported:false};
    window.__dropZoneContextRecovery=extension;
    const state=window.__MR.MODES.dropzone.session().state;
    const before={turn:state.turn,drops:state.roster[0].drops,
      score:state.roster[0].score,frame:MarbleDropZoneWebGL.debug().frame};
    extension.loseContext();
    return {supported:true,before};
  });
  assert.equal(recovery.supported,true,
    'Chromium should support WEBGL_lose_context for this recovery test');
  await page.waitForFunction(()=>MarbleDropZoneWebGL.debug().contextLost,
    null,{timeout:9000});
  assert.equal(await page.evaluate(()=>MarbleDropZoneWebGL.active),false);
  await page.evaluate(()=>window.__dropZoneContextRecovery.restoreContext());
  await page.waitForFunction(()=>
    MarbleDropZoneWebGL.active&&
    MarbleDropZoneWebGL.debug().contextRestores===1,
    null,{timeout:14000});
  await page.waitForFunction(previous=>
    MarbleDropZoneWebGL.debug().frame>previous,
    recovery.before.frame,{timeout:14000});
  const restored=await page.evaluate(()=>{
    const st=window.__MR.MODES.dropzone.session().state;
    const canvas=document.getElementById('partyStageCanvas');
    return {turn:st.turn,drops:st.roster[0].drops,score:st.roster[0].score,
      graphics:MarbleDropZoneWebGL.debug(),
      canvasCount:canvas.parentElement.querySelectorAll('canvas').length,
      owner:window.__MR.partyScreen.assertExclusive(),
      glError:(canvas.getContext('webgl2')||canvas.getContext('webgl')).getError()};
  });
  assert.equal(restored.graphics.contextRestores,1);
  assert.equal(restored.graphics.contextLosses,1);
  assert.equal(restored.glError,0);
  assert.equal(restored.owner,true);
  assert.equal(restored.canvasCount,1);
  assert.equal(restored.score,recovery.before.score,
    'GPU context reset destroyed authoritative Drop Zone scores');
  assert.equal(restored.drops,recovery.before.drops);
  assert.equal(restored.turn,recovery.before.turn);
  assert.ok(restored.graphics.staticTriangles>18000);
  proof.gpuRecovery={supported:true,restored};
  // Resize the actual live GPU canvas while preserving the same physical
  // camera aspect, 85 pegs, rules state, score and single-renderer ownership.
  const scaled=await page.evaluate(()=>{
    // Explicitly establish the upper software quality setting; adaptive
    // tuning may otherwise have already brought the canvas below .48.
    MarbleDropZoneWebGL.setResolutionScale(.55);
    const before=MarbleDropZoneWebGL.debug().resolution;
    const accepted=MarbleDropZoneWebGL.setResolutionScale(.48);
    const g=MarbleDropZoneWebGL.debug();
    const c=document.getElementById('partyStageCanvas');
    const st=window.__MR.MODES.dropzone.session().state;
    return {before,accepted,after:g.resolution,scale:g.resolutionScale,
      auto:g.autoScaleEnabled,owner:window.__MR.partyScreen.assertExclusive(),
      score:st.roster[0].score,turn:st.turn};
  });
  assert.equal(scaled.accepted,true);
  assert.equal(scaled.scale,.48);
  assert.equal(scaled.auto,false,'Manual review scale must disable automatic changes');
  assert.ok(scaled.after[0]<scaled.before[0]);
  assert.equal(scaled.after[0]*9,scaled.after[1]*16);
  assert.equal(scaled.owner,true);
  assert.equal(scaled.score,recovery.before.score);
  assert.equal(scaled.turn,recovery.before.turn);

  await page.screenshot({path:'qa-dropzone-webgl-after-gpu-restore.png'});
  // Switch back to the normal Derby Canvas2D, no WebGL remnants.
  await page.evaluate(()=>window.__MR.Game.toLobby());
  await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
  await page.locator('#btnStart').click();
  await page.waitForFunction(()=>window.__MR.partyScreen.renderer==='derby-track-v3');
  const after=await page.evaluate(()=>{
   const c=document.getElementById('partyStageCanvas'),stage=document.getElementById('partyStage');
   return {mode:stage.dataset.mode,exclusive:window.__MR.partyScreen.assertExclusive(),
    canvasCount:stage.querySelectorAll('canvas').length,
    canvas2d:!!c.getContext('2d'),
    ghosts:!!document.getElementById('ppDrop3dBinLabels')||
      !!stage.style.backgroundImage||!!stage.dataset.dropzoneScenery};
  });
  assert.equal(after.mode,'derby');assert.equal(after.exclusive,true);
  assert.equal(after.canvasCount,1);assert.equal(after.canvas2d,true);assert.equal(after.ghosts,false);
  await page.evaluate(()=>window.__MR.Game.toLobby());
  const gp=await page.evaluate(()=>!document.getElementById('cv').hidden);
  assert.equal(gp,true,'Original Grand Prix canvas not restored');
  // Force WebGL acquisition failure on the exclusive stage (but not
  // Canvas2D), then start the *same* Drop Zone game from the same lobby.
  // The original physics, player and controls must continue untouched.
  const fallbackPage=await browser.newPage({viewport:{width:1920,height:1080}});
  const fallbackErrors=[];
  fallbackPage.on('pageerror',e=>fallbackErrors.push(String(e.message)));
  await fallbackPage.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...options){
      if(this.id==='partyStageCanvas'&&
        (kind==='webgl'||kind==='webgl2'))return null;
      return original.call(this,kind,...options);
    };
  });
  await fallbackPage.goto(BASE+'/tv?dropzone3d=1',{waitUntil:'domcontentloaded'});
  for(const sel of ['#btnBoot','#btnKb','#btnCpu',
   '#partyModeCards .partyModeCard[data-mode="dropzone"]','#btnStart'])
   await fallbackPage.locator(sel).click();
  await fallbackPage.waitForFunction(()=>
    window.__MR?.partyScreen?.renderer==='dropzone-cabinet-v3',
    null,{timeout:15000});
  const fallback=await fallbackPage.evaluate(()=>{
    const screen=window.__MR.partyScreen;
    const state=window.__MR.MODES.dropzone.session().state;
    const c=document.getElementById('partyStageCanvas');
    return {renderer:screen.renderer,owner:screen.assertExclusive(),
      fallback:screen.telemetry().dropzone3dFallback,
      canvasCount:document.querySelectorAll('#partyStage canvas').length,
      twoD:!!c.getContext('2d'), pegs:state.pegs.length,
      notice:document.getElementById('ppDrop3dFallback')?.textContent};
  });
  assert.equal(fallback.renderer,'dropzone-cabinet-v3');
  assert.equal(fallback.fallback,'gpu-unavailable');
  assert.equal(fallback.owner,true);assert.equal(fallback.canvasCount,1);
  assert.equal(fallback.twoD,true);assert.equal(fallback.pegs,85);
  assert.ok(fallback.notice?.includes('original 2D'));
  await fallbackPage.locator('#dropNow').click();
  await fallbackPage.evaluate(()=>{
    const g=window.__MR.MODES.dropzone.session();
    if(!g.state.ball)throw Error('2D GPU fallback could not release a marble');
    let n=0;while(g.state.turn===0&&n++<2400)g.step(.05);
    if(g.state.turn!==1||g.state.roster[0].drops!==1)
      throw Error('2D GPU fallback did not retain the real rules engine');
  });
  await fallbackPage.screenshot({path:'qa-dropzone-webgl-fallback-2d.png'});
  await fallbackPage.evaluate(()=>window.__MR.Game.toLobby());
  assert.equal(await fallbackPage.evaluate(()=>
    !!document.getElementById('cv')&&!document.getElementById('cv').hidden),true);
  assert.deepEqual(fallbackErrors,[]);
  proof.gpuUnavailableFallback=fallback;
  await fallbackPage.close();
  assert.deepEqual(errors,[],'Browser exceptions: '+errors.join(', '));
  proof.otherMode=after;
  fs.writeFileSync('qa-dropzone-webgl-review.json',JSON.stringify(proof,null,2));
  console.log('PASS: native 3D plinko geometry, authoritative live ball scored in one slot, one canvas, original Derby and Grand Prix restored');
 }catch(e){
  console.error(e);console.error('Page errors:',errors);
  try{await page.screenshot({path:'qa-dropzone-webgl-failure.png'});}catch{}
  process.exitCode=1;
 }finally{await browser.close();}
})();
