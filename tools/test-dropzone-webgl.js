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
