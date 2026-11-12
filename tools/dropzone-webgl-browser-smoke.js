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
  await page.goto(BASE+'/tv?dropzone3d=1',{waitUntil:'domcontentloaded'});
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
  assert.ok(first.graphics.realMeshes&&first.graphics.drawCalls>=6&&
   first.graphics.drawCalls<=16,'Must batch native 3D pegs');
  assert.equal(first.graphics.labels,9,'Eight scored bins and one event callout');
  console.log('DROPZONE-3D-PIXEL-PROBE '+JSON.stringify(first.graphics.geometryProbe));
  assert.equal(first.graphics.geometryProbe?.error,0,
    'WebGL rendered a GL error even though draw calls completed');
  assert.notDeepEqual(first.graphics.geometryProbe?.before,
    first.graphics.geometryProbe?.after,
    'Native 3D marble draw call did not change its actual pixel; mesh invisible');
  proof.graphics=first.graphics;
  await page.screenshot({path:'qa-dropzone-webgl-aim.png'});
  await page.locator('#dropNow').click();
  await page.waitForFunction(()=>!!window.__MR.MODES.dropzone.session().state.ball,
   null,{timeout:8000});
  await page.waitForTimeout(300);
  const flight=await page.evaluate(()=>{
   const st=window.__MR.MODES.dropzone.session().state;
   return {x:st.ball?.x,y:st.ball?.y,vy:st.ball?.vy,
    elapsed:st.elapsed,draw:MarbleDropZoneWebGL.debug(),count:st.events.length};
  });
  assert.ok(Number.isFinite(flight.x)&&Number.isFinite(flight.y)&&flight.y>35);
  assert.ok(flight.draw.frame>first.graphics.frame,'Live 3D ball did not move');
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
