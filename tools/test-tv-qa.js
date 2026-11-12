'use strict';
/* Local no-network TV acceptance recorder: no extra scene, frame loop or identifiers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/modes/party-tv-qa.js','utf8');
assert.ok(!source.includes('requestAnimationFrame('),'QA may not create a second animation loop');
assert.ok(!source.includes('fetch(')&&!source.includes('WebSocket('),'QA must remain local');
assert.ok(!source.includes('localStorage.'),'QA must not persist user data');
let clock=0,appends=[],canvasElements=0;
const stage={
 style:{},dataset:{},
 setAttribute(){},
 append(...els){this.children=(this.children||[]).concat(els)},
 addEventListener(type,cb){this.handlers=(this.handlers||{});this.handlers[type]=cb}
};
const document={
 visibilityState:'visible',
 createElement(tag){if(tag==='canvas')canvasElements++;return Object.assign(Object.create(stage),{
   style:{},children:[],handlers:{},tagName:tag.toUpperCase()
 })},
 body:{appendChild(el){appends.push(el);},removeChild(){}}
};
const ctx=vm.createContext({
 URLSearchParams,Date,Math,Number,Object,Array,
 location:{search:'?qa=1'},
 performance:{now(){return clock}},
 innerWidth:1920,innerHeight:1080,devicePixelRatio:1,
 document,Blob:class Blob{},URL,
 setTimeout(){},
 MarblePartyScreen:{
   active:'brawl',renderer:'brawl-arena-v3',
   isMode(mode){return mode==='brawl'},
   assertExclusive(){return true},
   telemetry(){return {averageDrawMs:1.5}}
 }
});
vm.runInContext(source,ctx,{filename:'party-tv-qa.js'});
const qa=vm.runInContext('MarbleRushQA',ctx);
assert.equal(qa.enabled,true);
qa.init();qa.init();
assert.equal(appends.length,1,'QA created duplicate overlay');
assert.equal(appends[0].id,'marbleRushQaDiagnostics');
assert.match(appends[0].style.cssText,/pointer-events:none/,
  'Diagnostics panel must not block underlying lobby and mode controls');
const saveButton=appends[0].children.find(el=>el.id==='marbleRushQaSave');
assert.ok(saveButton,'QA export button missing');
assert.match(saveButton.style.cssText,/pointer-events:auto/,
  'Report export must remain clickable when panel is click-through');
qa.noteAction('brawl','ram');
for(let i=0;i<200;i++){clock=i*16.7;qa.frame(clock,'brawl');}
const result=qa.report();
assert.equal(result.metrics.brawl.usable,true);
assert.ok(result.metrics.brawl.sampleCount>=190);
assert.ok(result.metrics.brawl.observedFpsProxy>59&&result.metrics.brawl.observedFpsProxy<61);
assert.ok(result.metrics.brawl.p95FrameIntervalMs>16&&result.metrics.brawl.p95FrameIntervalMs<17);
assert.equal(result.handlerToFrameSamples.length,1);
assert.equal(result.handlerToFrameSamples[0].action,'ram');
assert.equal(result.rendererIsolationPassed,true);
assert.equal(result.manual.physicalPhonesConnected,null,'Physical phones cannot be auto-certified');
assert.equal(canvasElements,0,'QA may never create a second visible canvas');
assert.ok(result.limitations.some(x=>x.includes('not physical')));
const offContext=vm.createContext({
 URLSearchParams,Date,Math,Number,Object,Array,
 location:{search:''},performance:{now(){return 0}},
 document:{createElement(){throw Error('QA should never draw by default');}},
 MarblePartyScreen:{isMode(){return false}}
});
vm.runInContext(source,offContext);
const off=vm.runInContext('MarbleRushQA',offContext);
assert.equal(off.enabled,false);
off.init();off.frame(0,'derby');off.noteAction('derby','bet');
console.log('PASS TV QA: opt-in only, 200 frames at 60FPS proxy, local-only data, bounded samples, no duplicate canvas or animation loop, physical-device results unclaimed.');
