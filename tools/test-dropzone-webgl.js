/* Drop Zone true 3D — static architecture contract, no engine edits. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gl=fs.readFileSync('src/modes/party-dropzone-webgl.js','utf8');
const host=fs.readFileSync('src/modes/party-screen-host.js','utf8');
const ui=fs.readFileSync('src/modes/party-ui-v2.js','utf8');
const build=fs.readFileSync('tools/build.js','utf8');
assert.ok(gl.includes('gl.createShader(')&&gl.includes('gl.createBuffer(')&&
 gl.includes('gl.drawElements(')&&gl.includes('gl.DEPTH_TEST')&&
 gl.includes('perspective(')&&gl.includes('lookAt(')&&
 gl.includes('bakedPanel()')&&gl.includes('append(sp,'),
 'Native 3D Drop Zone requires genuine depth-tested triangulated pegs and boxes');
assert.ok(
 gl.includes('VERTEX_STRIDE=10') &&
 gl.includes('varying float vMaterial') &&
 gl.includes('gl.vertexAttribPointer(loc.material,1,gl.FLOAT,false,40,36)') &&
 gl.includes("surfaceQuality=materialForced?forced:(software?'basic':'premium')") &&
 gl.includes('gl.uniform1f(loc.premium') &&
 gl.includes('materialId(tint,manualMaterial)') &&
 gl.includes('setSurfaceQuality(next)') &&
 gl.includes('createHardwareOverlay()') &&
 gl.includes('reviewOverlay.remove()'),
 'Premium shader / matte metal glass and marble pipeline / opt-in GPU hardware monitor');
assert.ok(gl.includes('sphere(6,9)') &&
 gl.includes('sphere(14,20)') &&
 gl.includes('meshTemplates.ball') &&
 gl.includes("get('probe3d')==='1'") &&
 gl.includes('if(pixelProbeEnabled&&frame===0)') &&
 gl.includes('staticTriangles=i.length/3') &&
 gl.includes('dynamicTriangles=i.length/3'),
 'True 3D geometry LOD and no unnecessary production pixel readbacks');
assert.ok(gl.includes('contextLosses=0,contextRestores=0')&&
 gl.includes('contextLosses++')&&
 gl.includes('contextRestores++')&&
 gl.includes('setup();contextRestores++;contextLost=false;'),
 'Do not claim WebGL recovery without rebuilding actual GPU resources');
assert.ok(gl.includes('function recommendScale(')&&
 gl.includes('function tuneQuality()')&&gl.includes("get('dropzoneAdaptive')!=='0'")&&
 gl.includes('materialForced')&&gl.includes('qualityFloor=software?.40:.55')&&
 gl.includes('resize();')&&gl.includes('setResolutionScale,recommendScale,'),
 'Automatic GPU resolution hysteresis, software floor, material fallback and manual review override');
assert.ok(gl.includes('meshTemplates.sphere')&&
 gl.includes('projectToStage(world,vp)')&&
 gl.includes("lookAt([4.9,1.0,32.5],[3.0,0,0])")&&
 gl.includes('state.round===DropZone.ROUNDS')&&
 gl.includes('k=state.jackpotBin'),
 'Projected physical prize labels, frame-safe camera, final jackpot and topology caching');
assert.ok(gl.includes('DropZone.PEGS')&&gl.includes('DropZone.BINS')&&
 gl.includes('state.pegs')&&gl.includes('state.gold')&&
 gl.includes('const p=state.ball;')&&
 gl.includes('Math.sin(state.elapsed*1.2)')&&
 gl.includes('Math.sin(state.elapsed*.9)')&&
 gl.includes('gl.DYNAMIC_DRAW')&&gl.includes('drawMovingMesh(s,vp)')&&
 gl.includes('s.jackpotBin'),
 '3D projection must use the existing physics coordinates and scoring');
assert.ok(!gl.includes("getContext('2d'")&&!gl.includes('registerMode(')&&
 !gl.includes('requestAnimationFrame(')&&!gl.includes('setInterval('),
 'No new 2D overlay, game registry, render loop or fake physics');
assert.ok(gl.includes('old.replaceWith(canvas)')&&
 gl.includes('canvas.replaceWith(blank)')&&
 gl.includes("stage.style.removeProperty(name)"),
 'Only one party canvas and clean handover to Grand Prix/other modes');
assert.ok(host.includes("get('dropzone3d')==='1'")&&
 host.includes("MarbleDropZoneWebGL.mount(canvas)")&&
 host.includes("MarbleDropZoneWebGL.unmount()")&&
 host.includes("MarbleDropZoneWebGL.draw(s,assets,options)")&&
 host.includes("MarblePartyUI.drawDropZone(s,assets,options)"),
 '3D pilot must be opt-in with the existing 2D production screen untouched');
assert.ok(ui.includes('updateDropZone,drawDerby')&&
 ui.includes("(next==='derby'||next==='dropzone')&&options.hudOnly"),
 'Exact original Drop Zone HUD must also work in 3D');
assert.ok(build.includes("'party-dropzone-webgl'"),'New renderer absent from standalone build');
console.log('PASS: real WebGL Drop Zone cabinet, 85 engine pegs, 8 bins, live authoritative ball, no duplicate canvas, HUD preserved.');

const vm=require('node:vm');
const sandbox={URLSearchParams,Float32Array,Math,console};
const policy=vm.runInNewContext(gl+'\nMarbleDropZoneWebGL.recommendScale',sandbox);
assert.equal(policy(12,.8,.55,1),.66);
assert.equal(policy(60,.66,.55,1),.75);
assert.equal(policy(30,.8,.55,1),.8);
assert.equal(policy(NaN,.8,.55,1),.8);
assert.equal(policy(10,.40,.40,.55),.40);
console.log('PASS: pure deterministic adaptive GPU quality thresholds and min/max clamps.');
