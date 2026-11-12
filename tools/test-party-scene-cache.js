'use strict';
/*
 * Pure deterministic cache tests. A background buffer is NOT a second DOM
 * canvas or game scene; only physically dynamic layers are drawn each frame.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
let now=0,created=0,staticDraws=0,displayDraws=0,domCanvasCreates=0;
class Buffer{
 constructor(width,height){this.width=width;this.height=height;created++;}
 getContext(type){assert.equal(type,'2d');return {drawImage(){},fillRect(){}};}
}
const scope=vm.createContext({
 OffscreenCanvas:Buffer,
 performance:{now(){return now;}},
 document:{createElement(){domCanvasCreates++;throw Error('A DOM canvas cannot be used when OffscreenCanvas exists');}}
});
vm.runInContext(fs.readFileSync('src/modes/party-scene-cache.js','utf8'),scope);
const cache=vm.runInContext('MarbleSceneCache',scope);
const ctx={drawImage(){displayDraws++;}};
const scenery={pp_derby_bg:{complete:true,naturalWidth:1920,naturalHeight:1080,src:'derby.webp'}};
const fn=()=>{staticDraws++};
for(let n=0;n<100;n++){now=n*10;cache.paint('derby',ctx,scenery,['pp_derby_bg'],fn);}
assert.equal(displayDraws,100,'Every visible frame must receive the composed backdrop');
assert.equal(staticDraws,2,'Static atmosphere should be rebuilt only when the TTL expires');
assert.equal(cache.stats().hits,98);
assert.equal(cache.stats().bufferCount,1);
assert.equal(cache.stats().allocatedBytes,8294400);
assert.equal(domCanvasCreates,0);
assert.equal(created,2);
const before=cache.stats().rebuilds;
now+=20;cache.keepOnly('brawl');
assert.equal(cache.stats().active,null,'A former mode cannot retain the previous art');
cache.paint('brawl',ctx,{},[],fn);
assert.equal(cache.stats().rebuilds,before+1);
assert.equal(cache.stats().bufferCount,1);
cache.clear();
assert.equal(cache.stats().allocatedBytes,0);
const unloaded={pp_golf_bg:{complete:false,naturalWidth:0,src:'golf.webp'}};
const drawsBefore=staticDraws;
cache.paint('golf',ctx,unloaded,['pp_golf_bg'],fn);
assert.equal(cache.stats().bufferCount,0,'Do not cache a blank background while assets load');
assert.equal(staticDraws,drawsBefore+1,'Pending art must be drawn directly');
unloaded.pp_golf_bg.complete=true;unloaded.pp_golf_bg.naturalWidth=1920;
unloaded.pp_golf_bg.naturalHeight=1080;
cache.paint('golf',ctx,unloaded,['pp_golf_bg'],fn);
assert.equal(cache.stats().active,'golf');
assert.equal(cache.stats().bufferCount,1);
console.log('PASS: one detached scenery buffer, 98/100 cache hits, asset loading, 850ms refresh, cross-game release and zero DOM canvas creation.');
