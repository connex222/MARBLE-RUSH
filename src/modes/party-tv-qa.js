/*
 * MARBLE RUSH — local TV / physical-device acceptance recorder.
 * Opt in with /tv?qa=1. One small panel outside the game screen, no canvas,
 * no network calls, no added rendering loop, no saved personal identifiers.
 * Input metric is handler-receipt -> subsequent animation frame only.
 * It is NOT phone tap -> TV pixel latency (which requires hardware capture).
 */
const MarbleRushQA=(()=>{
 'use strict';
 const enabled=new URLSearchParams(location.search).get('qa')==='1';
 const MAX_SAMPLES=1800;
 const all=new Map(),actions=[];
 let panel=null,lines=null,lastFrame=null,lastUI=0,pending=[];
 const percentile=(numbers,fraction)=>{
   if(!numbers.length)return null;
   const sorted=numbers.slice().sort((a,b)=>a-b);
   return Number(sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)].toFixed(2));
 };
 const asNumber=n=>Number.isFinite(n)?Number(n.toFixed(2)):null;
 const recordFor=mode=>{
   if(!all.has(mode))all.set(mode,{times:[],draws:[],first:null,last:null,frames:0});
   return all.get(mode);
 };
 function init(){
   if(!enabled||panel)return;
   panel=document.createElement('aside');
   panel.id='marbleRushQaDiagnostics';
   panel.setAttribute('aria-label','Local frame and input acceptance diagnostics');
   panel.style.cssText='position:fixed;bottom:12px;right:12px;z-index:99999;'+
      'width:320px;max-width:32vw;border:2px solid #e6d39b;border-radius:12px;'+
      'background:rgba(6,16,28,.93);color:#f9f4df;padding:12px;'+
      'box-sizing:border-box;font:600 14px/1.4 ui-monospace,Consolas,monospace;'+
      'box-shadow:0 7px 25px #0009;pointer-events:none';
   const heading=document.createElement('strong');
   heading.textContent='MARBLE RUSH · TV QA (LOCAL)';
   heading.style.cssText='display:block;color:#ffe0a0;font-size:14px';
   lines=document.createElement('pre');
   lines.style.cssText='white-space:pre-wrap;margin:8px 0;font:inherit;'+
      'max-height:200px;overflow:auto';
   lines.textContent='Collecting live frames…';
   const save=document.createElement('button');
   save.type='button';save.id='marbleRushQaSave';
   save.textContent='SAVE QA REPORT (.JSON)';
   save.style.cssText='width:100%;background:#e9bd75;color:#17253b;'+
      'border:0;border-radius:7px;padding:9px;cursor:pointer;font-weight:900;'+
      'pointer-events:auto';
   save.addEventListener('click',()=>{
     const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'});
     const a=document.createElement('a'),url=URL.createObjectURL(blob);
     a.href=url;a.download='MARBLE-RUSH-PHYSICAL-TV-QA.json';
     document.body.appendChild(a);a.click();a.remove();
     // Browser revokes only after the download has started.
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   const note=document.createElement('div');
   note.textContent='Handler→frame ≠ physical phone→pixel latency.';
   note.style.cssText='font-size:11px;color:#bdd5e4;margin-top:6px';
   panel.append(heading,lines,save,note);
   document.body.appendChild(panel);
 }
 function noteAction(mode,action){
   if(!enabled||!MarblePartyScreen.isMode(mode)||typeof action!=='string')return;
   const item={mode,action:action.slice(0,24),received:performance.now(),handlerToNextFrameMs:null};
   // Capture at handler receipt. If the next frame is missing/delayed, leave
   // latency null rather than silently discarding the action.
   actions.push(item);if(actions.length>MAX_SAMPLES)actions.shift();
   pending.push(item);
   if(pending.length>80)pending.shift();
 }
 function frame(now,mode){
   if(!enabled)return;
   if(!panel)init();
   const key=MarblePartyScreen.isMode(mode)?mode:mode==='race'?'grandprix':null;
   if(key){
     const d=recordFor(key);
     if(d.last!==null&&now-d.last>0&&now-d.last<1000){
       d.times.push(now-d.last);
       if(d.times.length>MAX_SAMPLES)d.times.shift();
     }
     if(d.first===null)d.first=now;
     d.last=now;d.frames++;
     const perf=MarblePartyScreen.isMode(mode)?MarblePartyScreen.telemetry():null;
     if(perf&&Number.isFinite(perf.averageDrawMs)){
       d.draws.push(perf.averageDrawMs);
       if(d.draws.length>MAX_SAMPLES)d.draws.shift();
     }
   }
   // The next animation callback is only a proxy for handler-to-paint delay.
   // It does not assert that a rejected gameplay action changed a pixel.
   pending=pending.filter(p=>{
     const elapsed=now-p.received;
     if(elapsed>=0&&elapsed<2500){
       p.handlerToNextFrameMs=asNumber(elapsed);return false;
     }
     // Some browsers report the scheduled RAF timestamp slightly earlier
     // than a handler which ran in the same visual frame. Keep until next.
     return elapsed<2500;
   });
   if(now-lastUI<600||!lines)return;lastUI=now;
   const r=key?recordFor(key):null;
   const median=r?percentile(r.times,.5):null;
   const p95=r?percentile(r.times,.95):null;
   const valid=r&&r.times.length>=120;
   const draw=MarblePartyScreen.telemetry();
   lines.textContent=[
    'Mode: '+(key||mode.toUpperCase()),
    'Frames sampled: '+(r?.times.length||0)+(valid?'':' (warming up)'),
    'Median FPS proxy: '+(median?asNumber(1000/median):'—'),
    'p95 frame: '+(p95??'—')+' ms',
    'Latest draw avg: '+(draw?.averageDrawMs?.toFixed(2)||'—')+' ms',
    'Current renderer: '+(MarblePartyScreen.renderer||'Grand Prix/lobby'),
    'Exclusive stage: '+(MarblePartyScreen.isMode(mode)?
       (MarblePartyScreen.assertExclusive()?'PASS':'FAIL'):'n/a'),
    'Captured actions: '+actions.length
   ].join('\n');
 }
 function report(){
   const modes={};
   for(const [name,d] of all){
     const n=d.times.length;
     const med=percentile(d.times,.5),p95=percentile(d.times,.95);
     modes[name]={
       sampleCount:n,usable:n>=120,
       observedFpsProxy:med?asNumber(1000/med):null,
       p95FrameIntervalMs:p95,
       medianFrameIntervalMs:med,
       slowFramesOver33ms:d.times.filter(ms=>ms>33.4).length,
       slowFramesOver50ms:d.times.filter(ms=>ms>50).length,
       frameShareOver33ms:n?asNumber(d.times.filter(ms=>ms>33.4).length/n):null
     };
   }
   return {
     title:'MARBLE RUSH local physical acceptance sample',
     version:'tv-qa-v1',
     collectedAtUtc:new Date().toISOString(),
     environment:'Real TV computer when run locally; CI browser only if executed there',
     device:{viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio,
       visibility:document.visibilityState},
     metrics:modes,
     handlerToFrameSamples:actions.map(({mode,action,handlerToNextFrameMs})=>({
       mode,action,handlerToNextFrameMs
     })),
     awaitingNextFrame:pending.length,
     rendererIsolationPassed:MarblePartyScreen.active?
       MarblePartyScreen.assertExclusive():null,
     limitations:[
       'Frame intervals are requestAnimationFrame cadence, not a monitor refresh measurement.',
       'Handler-to-frame is not physical phone-tap-to-screen latency.',
       'Do not call these physical phone results without actual connected devices.',
       'An unchanged scene or dropped packet cannot be proven solely by this recorder.'
     ],
     manual:{tv1080p:null,tv4k:null,physicalPhonesConnected:null,
       wifiRejoin:null,touchLatency:null,motionComfort:null,
       allFiveGamesComplete:null,grandPrixComplete:null,visualAccepted:null}
   };
 }
 return Object.freeze({enabled,init,noteAction,frame,report});
})();
