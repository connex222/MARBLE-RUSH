/* Architectural P0 contract for the genuine Derby 3D review pilot. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const gl=read('src/modes/party-derby-webgl.js');
const host=read('src/modes/party-screen-host.js');
const original=read('src/modes/party-ui-v2.js');
const build=read('tools/build.js');
assert.ok(gl.includes('gl.createShader(')&&gl.includes('gl.createBuffer(')&&
  gl.includes('gl.drawElements(')&&gl.includes('gl.enable(gl.DEPTH_TEST)'),
  'Pilot has no genuine WebGL mesh/vertex/depth pipeline');
assert.ok(gl.includes('sphereGeometry()')&&gl.includes('boxGeometry()')&&
  gl.includes('perspective(')&&gl.includes('lookAt('),
  'Pilot lacks actual 3D geometry or perspective camera');
assert.ok(gl.includes('Number(h.x)')&&gl.includes('LENGTH=1500')&&
  gl.includes('s.horses'),
  'Pilot must consume real authoritative horse positions, never simulate them');
assert.ok(gl.includes('oldCanvas.replaceWith(canvas)')&&
  gl.includes('canvas.replaceWith(fresh)')&&
  !gl.includes('requestAnimationFrame(')&&!gl.includes('setInterval('),
  'Pilot may not mount an overlay or start a parallel animation loop');
assert.ok(!gl.includes("getContext('2d'"),'No 2D fake-3D stage in pilot');
assert.ok(host.includes("new URLSearchParams(location.search).get('derby3d')==='1'")&&
  host.includes("MarbleDerbyWebGL.mount(canvas)")&&
  host.includes("MarbleDerbyWebGL.unmount()")&&
  host.includes('MarbleDerbyWebGL.draw(s,assets,options)'),
  'Screen host must exclusively own WebGL pilot mount/render/unmount');
assert.ok(host.includes("MarblePartyUI.drawDerby(s,assets,options)"),
  'Normal Derby comparison must remain available');
assert.ok(original.includes('updateDerby')&&
  original.includes("options.hudOnly"),'Original live Derby betting HUD was not reused');
assert.ok(build.includes("'party-derby-webgl'"),'Standalone build excludes pilot renderer');
assert.ok(gl.includes("kind:'buffer'")&&gl.includes("kind:'shader'")&&
  gl.includes("kind:'program'")&&!gl.includes('gl.isBuffer(r)'),
  'WebGL teardown must not pass a shader/program to isBuffer');
assert.ok(!gl.includes('registerMode(')&&!gl.includes('new WebSocket('),
  'Renderer must never own game rules or phone networking');
console.log('PASS Derby true-3D architecture: native triangles/lighting/depth, one canvas, real positions, opt-in flag, original mode preserved.');
