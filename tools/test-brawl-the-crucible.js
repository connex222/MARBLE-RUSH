/* Offline Bowl Brawl Crucible WebGL geometry and release-gate smoke.
 * Run: node tools/test-brawl-the-crucible.js
 * This is a CPU GL-mock functional test, NOT a proof of on-screen AAA quality,
 * real TV frame rate, phone latency, real GPU materials, or CORS availability.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const preview=read('src/tv.js'),phone=read('src/play.html'),build=read('tools/build.js');
const host=read('src/modes/party-screen-host.js');
assert.match(preview,/const isPublishedMode = id => id === 'grandprix' \|\|/,
  'unapproved add-ons must remain hidden from normal TV mode selection');
assert.match(preview,/if \(!isPublishedMode\(selectedMode\) \|\| \(partyLength !== 0 && !PARTY_LOCAL_QA\)\) return;/,
  'direct game start must not bypass the public release gate');
assert.match(preview,/availableModes: Object\.values\(MODES\)\.filter\(m => m\.available && isPublishedMode\(m\.id\)\)/,
  'normal phone picker must match TV release status');
assert.match(preview,/if \(a === 'party' && isVip && state === 'lobby' && \(v === 0 \|\| \(PARTY_LOCAL_QA/,
  'Party Night must not select hidden modes');
assert.match(phone,/h\.partyNightEnabled \? \[0,3,5,7\] : \[\]/,
  'phone host must hide unavailable party options');
assert.match(preview,/const PARTY_LOCAL_QA = \/\^\(localhost\|127/,'unapproved modes can be QA-enabled only on localhost');
assert.match(build,/'party-brawl-webgl'/,'build must bundle the real GPU renderer');
assert.match(host,/MarbleBrawlWebGL\.mount\(canvas\)/);
assert.match(host,/MarbleBrawlWebGL\.unmount\(\)/);
assert.match(host,/fallbackBrawl\('render-failure'\)/);

const counts={static:0,dynamic:0,draws:0,frame:0};
const gl=new Proxy({
 VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,
 LINK_STATUS:35714,ARRAY_BUFFER:34962,STATIC_DRAW:35044,
 DYNAMIC_DRAW:35048,FLOAT:5126,DEPTH_TEST:2929,LEQUAL:515,
 COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,TRIANGLES:4,NO_ERROR:0,RENDERER:7937,
 createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
 getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:()=>0,getUniformLocation:()=>({}),
 getParameter:()=>'QA mock GPU',getExtension:()=>null,
 bufferData:(_target,data,usage)=>{assert.ok(ArrayBuffer.isView(data)&&data.BYTES_PER_ELEMENT===4);
   assert.ok(data.length>100);if(usage===35044)counts.static=data.length;else counts.dynamic=data.length;},
 drawArrays:(_mode,start,n)=>{assert.equal(start,0);assert.ok(n>100);counts.draws++;},
 getError:()=>0
},{get:(target,key)=>key in target?target[key]:(()=>{})});
let mounted=null;
function makeCanvas(){
 return {id:'partyStageCanvas',width:1920,height:1080,dataset:{},
  getContext:()=>gl,cloneNode:()=>makeCanvas(),replaceWith(next){mounted=next;},
  addEventListener(){},removeEventListener(){},removeAttribute(){},setAttribute(){}};
}
mounted=makeCanvas();let hudCalls=0;
const context={performance:{now:()=>125},MarbleBrawlUI:{updateHud(){hudCalls++;}}};
vm.createContext(context);
vm.runInContext(read('src/modes/party-brawl-webgl.js')+';this.renderer=MarbleBrawlWebGL;',context,
  {filename:'party-brawl-webgl.js'});
const renderer=context.renderer;
assert.equal(renderer.mount(mounted),true);
assert.equal(renderer.active,true);
const hazards=['bumpers','ice','rotor','crumbling','clean'];
for(const [i,hazard] of hazards.entries()){
 const st={hazard,hazardAngle:i*.8,round:i+1,radius:380-i*50,
   elapsed:12,time:12+i*42,pulseAt:14,lastPulseAt:-99,
   roster:[{id:'p1',name:'Red',color:'#FF3B5C'},{id:'p2',name:'Blue',color:'#4CC9F0'}],
   marbles:[{id:'p1',alive:true,x:70,y:85,anchored:i===1?1:0,ramWindow:i===0?.5:0},
            {id:'p2',alive:true,x:-130,y:-55,edgeHanging:i===3}],
   events:[{kind:'hit',x:20,y:10,time:11.9+i*42}]};
 assert.equal(renderer.draw(st,{},{}),true,hazard+' should render');
 assert.equal(renderer.debug().drawCalls,2);
 assert.ok(renderer.debug().staticTriangles>1000,'real static arena geometry');
 assert.ok(renderer.debug().dynamicTriangles>150,'dynamic real hazard/marble geometry');
}
assert.equal(hudCalls,5);
assert.equal(counts.draws,10);
renderer.unmount();
assert.equal(renderer.active,false);
assert.equal(mounted.id,'partyStageCanvas','one exclusive stage restored');

console.log('PASS: public release gate, independent Grand Prix, five GPU hazard-state scenes, '+
  'single renderer mount/unmount and display HUD delegation.');
console.log('Static triangles:',counts.static/27,'last dynamic triangles:',counts.dynamic/27);
