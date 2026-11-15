/* Crucible native GPU smoke — real Chromium/WebGL + render ownership.
 * Run from an existing local game server after: npm run build
 * npm install --no-save playwright@1.57.0
 * TEST_BASE_URL=http://127.0.0.1:35993 node tools/brawl-webgl-browser-smoke.js
 * Captured browser screenshots are design review, NOT automatic AAA approval.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const sharp=require('sharp');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle',
  '--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const tv=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const exceptions=[],browserLog=[];
 tv.on('pageerror',e=>exceptions.push(String(e.message)));
 tv.on('console',m=>{if(['warning','error'].includes(m.type()))browserLog.push(m.type()+': '+m.text());});
 const measurements=[];
 try{
  await tv.goto(base+'/tv?brawl3d=1',{waitUntil:'domcontentloaded',timeout:30000});
  const webglProbe=await tv.evaluate(()=>{
     const canvas=document.createElement('canvas');
     const ctx=canvas.getContext('webgl');
     return {available:!!ctx,renderer:ctx?.getParameter(ctx.RENDERER)||null};
   });
   console.log('BRAWL-WEBGL-BROWSER-PROBE',JSON.stringify(webglProbe));
   await tv.locator('#btnBoot').click();
  await tv.waitForFunction(()=>window.__MR?.state==='lobby');
  const selectable=await tv.locator('#partyModeCards .partyModeCard').evaluateAll(
    cards=>cards.map(c=>({name:c.dataset.mode,disabled:c.disabled})));
  assert.deepEqual(selectable.map(c=>c.name),['grandprix','brawl'],
    'Preview must expose only protected Grand Prix and active Brawl work');
  assert.ok(selectable.every(c=>!c.disabled));
  await tv.locator('#btnKb').click();
  await tv.locator('#btnCpu').click();
  await tv.locator('#partyModeCards .partyModeCard[data-mode="brawl"]').click();
  await tv.waitForFunction(()=>window.__MR?.selectedMode==='brawl');
  await tv.locator('#btnStart').click();
  await tv.waitForFunction(()=>window.__MR?.state==='brawl'&&
    document.querySelector('#partyStage:not([hidden])')?.dataset.mode==='brawl',
    {timeout:15000});
  await tv.waitForTimeout(2500);
  const info=await tv.evaluate(()=>{
    const st=document.getElementById('partyStage');
    const diag=window.__MR?.partyScreen;
    return {mode:st.dataset.mode,renderer:st.dataset.renderer,
      fallback:st.dataset.brawl3dFallback||null,exclusive:diag?.assertExclusive(),
      stageCanvas:st.querySelectorAll('canvas').length,
      grandPrixCanvasHidden:document.getElementById('cv').hidden,
      reported:diag?.telemetry(),gpu:MarbleBrawlWebGL.debug()};
  });
  console.log('BRAWL-WEBGL-DIAGNOSTICS',JSON.stringify({
    renderer:info.renderer,fallback:info.fallback,
    gpu:info.gpu,browserLog:browserLog.slice(-12),pageErrors:exceptions}));
   await tv.screenshot({path:'qa-brawl-crucible-browser-diagnostic.png'});
   assert.equal(info.renderer,'brawl-the-crucible-native-webgl-v1',
    'Brawl silently reverted to Canvas2D — native WebGL not verified');
  assert.equal(info.fallback,null);
  assert.equal(info.exclusive,true,'Multiple canvases or stale screen ownership');
  assert.equal(info.stageCanvas,1);
  assert.equal(info.grandPrixCanvasHidden,true);
  const graphics=info.reported?.graphics;
  assert.ok(graphics?.realMeshes,'WebGL shader did not compile or mesh missing');
  assert.ok(graphics?.staticTriangles>3000,'Bowl missing full 3D geometry');
  assert.ok(graphics?.dynamicTriangles>100,'Marbles or hazards missing');
  // SwiftShader is CPU-based and deliberately uses half-resolution output.
  // This is a functional shader/pixel test, NOT a living-room TV FPS test.
  // Only a physical GPU can satisfy the release threshold of 60 FPS.
  const softwareGpu=/swiftshader|llvmpipe|software/i.test(graphics.gpu||'');
  assert.ok(info.reported.frames>(softwareGpu?7:20),
    'Native WebGL stopped painting; '+JSON.stringify({
      frames:info.reported.frames,softwareGpu,gpu:graphics.gpu}));
  assert.equal(info.reported.renderFailures,0,'WebGL frame failure');
  const full=await tv.screenshot({path:'qa-brawl-crucible-actual-webgl.png'});
  // Central gameplay zone excludes HUD. A black/flat 3D arena is a hard fail.
  const {data,info:im}=await sharp(full)
    .extract({left:620,top:330,width:670,height:440})
    .resize({width:134,height:88}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let min=255,max=0,colors=new Set();
  for(let i=0;i<data.length;i+=im.channels){
    const r=data[i],g=data[i+1],b=data[i+2];
    const lum=(r*3+g*6+b)/10;min=Math.min(min,lum);max=Math.max(max,lum);
    colors.add((r>>3)+':'+(g>>3)+':'+(b>>3));
  }
  assert.ok(colors.size>70&&max-min>40,
    'GPU game surface is blank, flat, or incorrectly composed: '+JSON.stringify({
      colors:colors.size,contrast:max-min}));
  // Exercise five genuinely different engine-defined arena variants; no
  // second hitbox/render pipeline may appear after changing its input state.
  for(const mode of ['bumpers','ice','rotor','crumbling','clean']){
    const result=await tv.evaluate(hazard=>{
      const session=window.__MR.MODES.brawl.session();
      if(!session)throw Error('No Brawl session');
      const previous=session.state.hazard;
      session.state.hazard=hazard;
      const rendered=MarbleBrawlWebGL.draw(session.state,{}, {});
      const debug=MarbleBrawlWebGL.debug();
      session.state.hazard=previous;
      return {rendered,triangles:debug.dynamicTriangles,renderer:debug.renderer};
    },mode);
    assert.equal(result.rendered,true,mode+' real GPU draw failed');
    assert.ok(result.triangles>150,mode+' hazard lacks 3D geometry');
    measurements.push({mode,...result});
  }
  await tv.screenshot({path:'qa-brawl-crucible-broadcast.png'});
  fs.writeFileSync('qa-brawl-crucible-gpu.json',JSON.stringify({
    result:'GPU smoke passed',renderer:info.renderer,graphics,
    frames:info.reported.frames,frameTiming:info.reported.p95FrameIntervalMs,
    draws:info.reported.p95DrawMs,softwareGpu,contrast:max-min,colors:colors.size,
    hazards:measurements,pageErrors:exceptions
  },null,2));
  assert.deepEqual(exceptions,[],'Uncaught page errors during Bowl Brawl');
  console.log('PASS REAL CHROMIUM WEBGL: one active arena, nonblank pixels, '+
    'all five hazard meshes, live physics render, TV screenshot; '+colors.size+' colour bins');
 }finally{await browser.close();}
})().catch(e=>{console.error('BRAWL GPU ACCEPTANCE FAILED',e);process.exitCode=1;});
