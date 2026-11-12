/*
 * MARBLE RUSH — single-host static atmosphere cache.
 * Detached drawing buffer, never a second DOM canvas, mode screen or renderer.
 * State-dependent obstacles, marbles, camera, collisions and HUD are ALWAYS
 * painted live by their exclusive mode renderer.
 */
const MarbleSceneCache=(()=>{
 'use strict';
 const W=1920,H=1080,MAX_AGE=850;
 let entry=null,hits=0,rebuilds=0,skips=0;
 const ready=img=>!img||(img.complete&&img.naturalWidth>0);
 function keyFor(assets,names){
   return names.map(name=>{
     const im=assets?.[name];
     return im?.naturalWidth?name+':'+im.naturalWidth+'x'+im.naturalHeight+':'+(im.currentSrc||im.src||''):name+':pending';
   }).join('|');
 }
 function paint(mode,context,assets,names,paintStatic){
   if(!context||typeof paintStatic!=='function')return false;
   // Before artwork loads, render directly rather than caching a blank scene.
   const allReady=names.every(name=>ready(assets?.[name]));
   if(!allReady){skips++;paintStatic(context);return true;}
   const stamp=keyFor(assets,names),now=performance.now();
   if(!entry||entry.mode!==mode||entry.stamp!==stamp||now-entry.at>MAX_AGE){
     // OffscreenCanvas is not attached to the DOM. The fallback element is
     // never mounted. The actual visible TV screen remains the single host.
     const raster=typeof OffscreenCanvas!=='undefined'?
       new OffscreenCanvas(W,H):document.createElement('canvas');
     raster.width=W;raster.height=H;
     const brush=raster.getContext('2d',{alpha:false});
     if(!brush){paintStatic(context);return true;}
     paintStatic(brush);
     entry={mode,stamp,at:now,buffer:raster};rebuilds++;
   }else hits++;
   context.drawImage(entry.buffer,0,0,W,H);
   return true;
 }
 function keepOnly(mode){if(entry&&entry.mode!==mode)entry=null;}
 function clear(){entry=null;}
 function stats(){return Object.freeze({
   active:entry?.mode||null,hits,rebuilds,skips,
   bufferCount:entry?1:0,allocatedBytes:entry?W*H*4:0
 });}
 return Object.freeze({paint,keepOnly,clear,stats});
})();
