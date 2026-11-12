/*
 * Real Chromium review: one native GPU-backed Derby canvas, real geometry,
 * old renderer retained only for non-pilot comparison. No physical TV claims.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:35993';
 const browser=await chromium.launch({
   headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']
 });
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const evidence={browser:'Chromium headless with SwiftShader',physicalDeviceTested:false,
   mode:'derby',frames:0,renderer:null,graphics:null,otherModesUntouched:null};
 try{
   await page.goto(base+'/tv?derby3d=1',{waitUntil:'domcontentloaded'});
   await page.locator('#btnBoot').click();
   await page.locator('#btnKb').click();
   await page.locator('#btnCpu').click();
   await page.locator('#partyModeCards .partyModeCard[data-mode="derby"]').click();
   await page.locator('#btnStart').click();
   await page.waitForFunction(()=>window.__MR?.partyScreen?.renderer==='derby-webgl-mesh-pilot-v1',
     {timeout:15000});
   await page.waitForTimeout(1800);
   let initial=await page.evaluate(()=>{
     const h=window.__MR.partyScreen,c=document.getElementById('partyStageCanvas');
     const gl=c.getContext('webgl2')||c.getContext('webgl');
     return {renderer:h.renderer,isolated:h.assertExclusive(),count:document.querySelectorAll('#partyStage canvas').length,
       visibleScreens:document.querySelectorAll('.screen:not([hidden])').length,
       gpHidden:document.getElementById('cv').hidden,
       graphics:c.dataset.graphics,viewport:[c.width,c.height],
       gpu:gl?gl.getParameter(gl.VERSION):null,
       draw:h.telemetry(),mesh:MarbleDerbyWebGL.debug()};
   });
   assert.equal(initial.renderer,'derby-webgl-mesh-pilot-v1');
   assert.equal(initial.isolated,true,'WebGL and legacy UI may not overlap');
   assert.equal(initial.count,1,'More than one mounted party game canvas');
   assert.equal(initial.visibleScreens,1);
   assert.equal(initial.gpHidden,true);
   assert.equal(initial.graphics,'webgl-real-meshes');
   assert.ok(/WebGL/.test(initial.gpu||''),'Native WebGL context not obtained');
   assert.equal(initial.mesh.realMeshes,true);
   assert.ok(initial.mesh.drawCalls>=40,'No live scene geometry drawn');
   console.log('DERBY-WEBGL-MESH-COUNT '+JSON.stringify(initial.mesh));
   assert.ok(initial.draw.frames>=2,'Derby not rendering in main frame loop');
   console.log('DERBY-WEBGL-HEADLESS-METRICS '+JSON.stringify(initial.draw));
   assert.equal(initial.draw.renderFailures,0);
   await page.screenshot({path:'qa-derby-webgl-3d-betting.png'});
   const originalState=await page.evaluate(()=>{
     const g=window.__MR.MODES.derby.session();
     return {heat:g.state.round,phase:g.state.phase,horseCount:g.state.horses.length};
   });
   assert.equal(originalState.horseCount,6);
   // Use the same original TV control buttons (virtual-gem betting).
   await page.locator('#derbyRunner').click();
   await page.locator('#derbyPick').click();
   await page.waitForFunction(()=>window.__MR.MODES.derby.session().state.phase==='racing',{timeout:20000});
   await page.waitForTimeout(900);
   const during=await page.evaluate(()=>{
     const game=window.__MR.MODES.derby.session().state;
     const scene=MarbleDerbyWebGL.debug();
     return {phase:game.phase,horseX:game.horses.map(h=>h.x),leadText:document.getElementById('ppBoardLabel').textContent,
       meshFrame:scene.frameCount,drawCalls:scene.drawCalls,isolated:window.__MR.partyScreen.assertExclusive(),
       renderer:window.__MR.partyScreen.renderer};
   });
   assert.equal(during.phase,'racing');
   assert.ok(during.horseX.some(x=>x>0),'Physics engine did not progress');
   assert.ok(during.leadText.startsWith('LIVE LEADER'),'Leader HUD not real state');
   assert.ok(during.drawCalls>=40&&during.isolated,'3D track was not drawn during the real race');
   await page.screenshot({path:'qa-derby-webgl-3d-racing.png'});
   // Capture the same five-heat rules engine completing, with no new rules.
   await page.evaluate(()=>{
     const g=window.__MR.MODES.derby.session();
     let ticks=0;
     while(!g.state.done&&ticks++<13000)g.step(.1);
     if(!g.state.done)throw Error('Derby five heats did not finish');
   });
   await page.waitForTimeout(300);
   const final=await page.evaluate(()=>{
     const g=window.__MR.MODES.derby.session();
     return {done:g.state.done,history:g.state.history.length,
       wagersPerHeat:g.state.history.map(h=>h.bets.length),
       totalGems:g.state.roster.map(p=>p.gems)};
   });
   assert.equal(final.done,true);
   assert.equal(final.history,5);
   assert.ok(final.totalGems.every(Number.isFinite));
   evidence.frames=initial.draw.frames;evidence.performance=initial.draw;
   evidence.renderer=initial.renderer;
   evidence.graphics=initial.mesh;evidence.completedFiveHeats=final;
   // Switching to 2D must destroy the WebGL surface and acquire a fresh 2D
   // context, never reveal the old Derby or Brawl screen.
   await page.evaluate(()=>window.__MR.Game.toLobby());
   await page.locator('#partyModeCards .partyModeCard[data-mode="dropzone"]').click();
   await page.locator('#btnStart').click();
   await page.waitForFunction(()=>window.__MR.partyScreen.renderer==='dropzone-cabinet-v3');
   await page.waitForTimeout(550);
   const switchCheck=await page.evaluate(()=>{
     const stage=document.getElementById('partyStage'),canvas=document.getElementById('partyStageCanvas');
     return {mode:stage.dataset.mode,isolated:window.__MR.partyScreen.assertExclusive(),
       canvasCount:stage.querySelectorAll('canvas').length,
       got2d:!!canvas.getContext('2d'),glFlag:canvas.dataset.graphics||null};
   });
   assert.equal(switchCheck.mode,'dropzone');
   assert.equal(switchCheck.isolated,true);
   assert.equal(switchCheck.canvasCount,1);
   assert.equal(switchCheck.got2d,true,'WebGL context leaked into the next 2D game');
   assert.equal(switchCheck.glFlag,null);
   evidence.otherModesUntouched=switchCheck;
   await page.evaluate(()=>window.__MR.Game.toLobby());
   const restored=await page.evaluate(()=>({
     gp:!document.getElementById('cv').hidden,
     mode:window.__MR.partyScreen.active,
     canvases:document.querySelectorAll('#partyStage canvas').length
   }));
   assert.equal(restored.gp,true,'Original Grand Prix canvas was not restored');
   assert.equal(restored.mode,null);
   assert.equal(restored.canvases,1);
   assert.deepEqual(errors,[],'Browser exceptions: '+errors.join('; '));
   fs.writeFileSync('qa-derby-webgl-physics-and-canvas.json',JSON.stringify(evidence,null,2));
   console.log('PASS: real WebGL Derby meshes, authoritative six runners, betting and five heats, one visible renderer, Drop Zone 2D switch, GP restored.');
 }catch(error){
   console.error(error);
   console.error('Browser errors:',errors);
   try{await page.screenshot({path:'qa-derby-webgl-failure.png'});}catch{}
   process.exitCode=1;
 }finally{await browser.close();}
})();
