/*
 * MARBLE RUSH — TV Party Pack wall-clock adapter.
 *
 * Render frames are NOT gameplay ticks. A slow display can show fewer frames,
 * but cannot make timers, physical races or phone decision windows run slower.
 * All authoritative engines still integrate their own deterministic fixed
 * steps; this module only feeds them bounded wall-time chunks.
 *
 * Grand Prix is explicitly outside this adapter and remains untouched.
 */
const MarblePartyClock=(()=>{
 'use strict';
 const MAX_WINDOW_SECONDS=.5,MAX_STEP_SECONDS=.05,MAX_STEPS=10;
 let frames=0,steps=0,advancedSeconds=0,droppedSeconds=0,maxObservedGap=0,clampedFrames=0;
 function advance(wallDelta,tick,isActive=()=>true){
   if(typeof tick!=='function'||typeof isActive!=='function')
     throw Error('Party Pack clock needs a rules tick and a live-mode guard');
   const raw=Number.isFinite(wallDelta)?Math.max(0,wallDelta):0;
   const allowed=Math.min(MAX_WINDOW_SECONDS,raw);
   let remaining=allowed,advanced=0,n=0;
   while(remaining>1e-9&&n<MAX_STEPS&&isActive()){
     const dt=Math.min(MAX_STEP_SECONDS,remaining);
     tick(dt);
     remaining-=dt;advanced+=dt;n++;
   }
   frames++;steps+=n;advancedSeconds+=advanced;
   droppedSeconds+=Math.max(0,raw-advanced);
   maxObservedGap=Math.max(maxObservedGap,raw);
   if(raw>MAX_WINDOW_SECONDS)clampedFrames++;
   return Object.freeze({advanced,steps:n,dropped:Math.max(0,raw-advanced)});
 }
 function stats(){return Object.freeze({
   frames,steps,advancedSeconds,droppedSeconds,maxObservedGap,clampedFrames,
   maxWindowSeconds:MAX_WINDOW_SECONDS,maxStepSeconds:MAX_STEP_SECONDS
 });}
 function reset(){frames=0;steps=0;advancedSeconds=0;droppedSeconds=0;maxObservedGap=0;clampedFrames=0;}
 return Object.freeze({advance,stats,reset,MAX_WINDOW_SECONDS,MAX_STEP_SECONDS,MAX_STEPS});
})();
if(typeof module!=='undefined')module.exports=MarblePartyClock;
