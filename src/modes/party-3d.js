/* MARBLE RUSH — real WebGL 3D gameplay pilot (five Party Pack games).
 * Geometry is visually coupled to the existing authoritative simulation.
 * Does not touch physics, control events, scoring, Grand Prix or network.
 * If WebGL fails the original 2D Canvas remains fully playable.
 */
import * as T from '../vendor/three.module.js';

(()=>{
'use strict';
const supported=['derby','dropzone','brawl','curling','golf'];
const frames={
 derby:[485,190,1410,680],dropzone:[515,110,1030,810],
 brawl:[490,75,1390,930],curling:[480,212,1415,662],
 golf:[480,212,1415,670]
};
const root=document.getElementById('party3d');
const toggle=document.getElementById('party3dToggle');
if(!root||!toggle)return;
const palettes={
 derby:['#bc7647','#ffda8b','#8d4d36'],dropzone:['#3a2868','#ffd46e','#17a8e6'],
 brawl:['#59395c','#f6b75f','#df4a88'],curling:['#8dcde5','#f9ffff','#49a7df'],
 golf:['#348e61','#f5de92','#45a8ac']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let enabled=true,renderer=null,world=null,camera=null,scene=null,worldMode='',
  ballMap=new Map(),last=0,lowMotion=false,unsupported=false;
let quality='cinematic',slowFrames=0,fastFrames=0,qualityHold=0,frameRate=30,stageStartedAt=0;
const assetTextures=new Map();
 // Opt-in diagnostic on the separate Windows development preview only.
 // Players never see this badge on a normal TV URL.
 const perfDebug=new URLSearchParams(window.location.search).get('marblePerf')==='1'
   ?document.createElement('output'):null;
 if(perfDebug){
   perfDebug.id='marble3dPerf';
   perfDebug.setAttribute('aria-hidden','true');
   Object.assign(perfDebug.style,{
     position:'fixed',right:'16px',bottom:'16px',zIndex:'9999',
     pointerEvents:'none',padding:'9px 13px',borderRadius:'9px',
     background:'rgba(9,16,32,.89)',color:'#f4e8bd',
     font:'700 16px system-ui,sans-serif',border:'1px solid #ffd67e'
   });
   document.body.appendChild(perfDebug);
 }
 function showPerformance(mode,active){
   if(!perfDebug)return;
   perfDebug.hidden=!supported.includes(mode);
   if(perfDebug.hidden)return;
   const summary=active
     ?'3D · '+(root.dataset.fps||'?')+' FPS · '+quality+
       ' · '+(root.dataset.gpuTextures||'?')+' textures'
     :root.dataset.fallback==='low-frame-rate'
       ?'2D SAFE MODE · low GPU frame rate'
       :'2D CLASSIC VIEW';
   if(perfDebug.textContent!==summary)perfDebug.textContent=summary;
 }
function chooseQuality(next){
 if(!renderer || quality===next)return;
 quality=next;slowFrames=0;fastFrames=0;
 qualityHold=performance.now()+5500;
 renderer.setPixelRatio(Math.min(next==='cinematic'?1.3:.85,window.devicePixelRatio||1));
 renderer.shadowMap.enabled=next==='cinematic';
 renderer.shadowMap.needsUpdate=true;
 root.dataset.quality=quality;
}
function performanceFallback(){
 if(!enabled)return;
 enabled=false;slowFrames=0;fastFrames=0;
 root.dataset.fallback='low-frame-rate';
 root.dataset.quality='classic';
 root.hidden=true;
 toggle.hidden=false;toggle.setAttribute('aria-pressed','false');
 toggle.textContent='◇ CLASSIC VIEW (AUTO)';
 console.warn('[MARBLE RUSH] WebGL too slow; restoring the playable 2D board.');
 clean();worldMode='';
}
function trackFrameTime(dt,now){
 if(document.visibilityState==='hidden'||!Number.isFinite(dt)||dt>1000)return;
 frameRate=frameRate*.88+(1000/Math.max(1,dt))*.12;
 root.dataset.fps=String(Math.max(1,Math.min(120,Math.round(frameRate))));
 // The first seconds of a new scene compile shaders and upload artwork.
 if(now-stageStartedAt<1800)return;
 if(dt>90){slowFrames+=3;fastFrames=0;}
 else if(dt>43){slowFrames++;fastFrames=0;}
 else if(dt<38){fastFrames++;slowFrames=Math.max(0,slowFrames-2);}
 else{slowFrames=Math.max(0,slowFrames-1);fastFrames=0;}
 if(quality==='cinematic' && slowFrames>=9){
   chooseQuality('balanced');
 }else if(quality==='balanced'){
   if(slowFrames>=12 && window.__MR_CAPTURE_3D_QA!==true)performanceFallback();
   else if(fastFrames>220 && now>qualityHold)chooseQuality('cinematic');
 }
}
const ballGeo=new T.SphereGeometry(29,32,24);
// The marble swirl is generated once at runtime: actual painted detail on a
// 3D sphere, not a 2D overlay or a third-party graphics service.
const marblePaint=(()=>{
 const c=document.createElement('canvas');c.width=256;c.height=128;
 const g=c.getContext('2d');
 const background=g.createLinearGradient(0,0,256,128);
 background.addColorStop(0,'#ffffff');background.addColorStop(.5,'#cfe5f8');
 background.addColorStop(1,'#fff7dc');g.fillStyle=background;g.fillRect(0,0,256,128);
 for(let k=0;k<11;k++){
   const start=k*26-55;
   g.beginPath();g.moveTo(start,-12);
   g.bezierCurveTo(start+78,22,start-18,86,start+82,150);
   g.strokeStyle=k%3===0?'rgba(255,214,84,.67)':k%3===1?'rgba(32,87,150,.50)':'rgba(255,255,255,.85)';
   g.lineWidth=k%3===0?15:k%3===1?9:5;g.stroke();
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=T.RepeatWrapping;tex.anisotropy=2;return tex;
})();
const ringGeo=new T.TorusGeometry(34,4,8,40);
const shadowGeo=new T.CircleGeometry(30,28);
const trailGeo=new T.BoxGeometry(1,1,1);
const defaultColors=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
const FXKINDS={
 derby:{heat_start:'speed',cheer:'confetti',photoFinish:'photo',lateSurge:'surge',payout:'laurel',gate_open:'dust'},
 dropzone:{release:'fall',goldPeg:'multiplier',pegImpact:'peg',jackpot:'superjackpot',bucket:'coins',jackpotMove:'jackpot'},
 brawl:{hit:'impact',ram:'shockwave',out:'ko',lastTwo:'warning',hazardReveal:'spin',hazardImpact:'ricochet',round_end:'victory'},
 curling:{throw:'sweep',sweep:'scrape',hit:'impact',measurement:'target',lastStone:'aurora',end_result:'victory'},
 golf:{shot:'putt',water:'ricochet',holeInOne:'holeinone',cup:'cup',tunnel:'roll',flyThrough:'flag',spectatorCheer:'confetti'}
};
const vfx=new Map(),fxTextures=new Map();
function fxPosition(mode,e,state){
 let ex=Number.isFinite(e.x)?e.x:null,ey=Number.isFinite(e.y)?e.y:null;
 if(mode==='brawl'){
   // Hit, RAM and knockout effects belong on the physical marble, rather
   // than flashing inexplicably in the empty middle of the arena.
   const who=(state.marbles||[]).find(m=>m.id===e.id)||null;
   if(ex===null&&who)ex=who.x;if(ey===null&&who)ey=who.y;
   return [ex===null?0:ex*1.03,55,ey===null?0:ey*1.03];
 }
 if(mode==='curling'){
   const stone=(state.stones||[]).find(m=>m.id===e.id)||null;
   if(ex===null&&stone)ex=stone.x;if(ey===null&&stone)ey=stone.y;
   return [ex===null?290:ex-650,39,ey===null?0:ey-265];
 }
 if(mode==='golf'){
   if(ex===null&&state.ball)ex=state.ball.x;
   if(ey===null&&state.ball)ey=state.ball.y;
   return [ex===null?0:ex-620,39,ey===null?0:ey-290];
 }
 if(mode==='dropzone')return [ex===null?0:ex-500,ey===null?0:350-ey,82];
 const length=Math.max(1,Number(state.length)||1300);
 const lane=Number.isInteger(e.horse)?e.horse:
   (state.horses||[]).findIndex(h=>h.id===(e.horse??e.winner));
 return [ex===null?0:-630+Math.max(0,Math.min(1,ex/length))*1230,48,
   lane<0?0:-260+104*lane];
}
function fxTexture(mode,kind){
 const key=mode+'_'+kind;
 if(fxTextures.has(key))return fxTextures.get(key);
 const texture=new T.TextureLoader().load('assets/img/pp_'+mode+'_fx_'+kind+'.webp',t=>{t.colorSpace=T.SRGBColorSpace;},undefined,()=>{});
 fxTextures.set(key,texture);return texture;
}
function updateEffects(mode,state){
 const now=Number(state.elapsed??state.time??0),duration=lowMotion?.25:.88;
 const live=new Set();
 if(Array.isArray(state.events)){
  for(const e of state.events.slice(-12)){
   const kind=FXKINDS[mode]?.[e.kind],t=e.time;
   if(!kind||!Number.isFinite(t))continue;
   const age=now-t;if(age<0||age>duration)continue;
   const key=mode+'|'+e.kind+'|'+t+'|'+(e.x??'')+'|'+(e.y??'');
   live.add(key);
   let sprite=vfx.get(key);
   if(!sprite){
     const mat=new T.SpriteMaterial({map:fxTexture(mode,kind),color:0xffffff,transparent:true,
       depthWrite:false,opacity:1,blending:T.NormalBlending});
     sprite=new T.Sprite(mat);sprite.position.set(...fxPosition(mode,e,state));
     scene.add(sprite);vfx.set(key,sprite);
   }
   const big=/jackpot|holeinone|victory|photo|laurel|ko/.test(kind);
   const size=(big?240:152)*(lowMotion?1:.8+age/duration*.35);
   sprite.scale.set(size,size,1);
   sprite.material.opacity=Math.max(0,.95*(1-age/duration));
  }
 }
 for(const [key,sprite] of vfx)if(!live.has(key)){
  scene.remove(sprite);sprite.material.dispose();vfx.delete(key);
 }
}

const material=(color,metal=.12,rough=.29)=>new T.MeshPhysicalMaterial({
 color:new T.Color(color),metalness:metal,roughness:rough,clearcoat:.8,
 clearcoatRoughness:.13
});
const pale=material('#fff5cd',.66,.23);
function mesh(geom,mat,x=0,y=0,z=0){
 const m=new T.Mesh(geom,mat);m.position.set(x,y,z);
 // Tiny bulbs, pegs and lane marks cost extra shadow draws without useful silhouettes.
 const param=geom.parameters||{};
 const tinySphere=geom.type==='SphereGeometry'&&param.radius<22;
 const flatMark=geom.type==='BoxGeometry'&&param.height<12;
 m.receiveShadow=true;m.castShadow=!tinySphere&&!flatMark;scene.add(m);return m;
}
function box(w,h,d,color,x=0,y=0,z=0,metal=.12){
 return mesh(new T.BoxGeometry(w,h,d),material(color,metal),x,y,z);
}
function cylinder(r,h,color,x=0,y=0,z=0,metal=.4){
 return mesh(new T.CylinderGeometry(r,r,h,28),material(color,metal),x,y,z);
}
function lineRing(r,t,color,x=0,y=2,z=0){
 const m=mesh(new T.TorusGeometry(r,t,8,96),material(color,.55,.2),x,y,z);
 m.rotation.x=Math.PI/2;return m;
}
// Camera-aligned environmental art. Previously this giant photographed
// plane was foreshortened into a distracting trapezoid behind the boards.
// Keeping it aligned to the camera lets the *real* 3D world be the focus.
// Reuse identical textures between the nine Golf holes, preventing GPU
// uploads and decode pauses on each level transition.
function cachedArt(key,url,repeatX=1,repeatY=1){
 let tex=assetTextures.get(key);
 if(tex)return tex;
 tex=new T.TextureLoader().load(url,t=>{
   t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
   // Surface textures tile; decorative transparent props must clamp edges.
   const isSurface=key.startsWith('surface:');
   t.wrapS=isSurface?T.RepeatWrapping:T.ClampToEdgeWrapping;
   t.wrapT=isSurface?T.RepeatWrapping:T.ClampToEdgeWrapping;
   if(isSurface)t.repeat.set(repeatX,repeatY);
   t.needsUpdate=true;
 },undefined,()=>{});
 assetTextures.set(key,tex);
 return tex;
}
function addBackdrop(mode) {
 const owner=world;
 const mat=new T.MeshBasicMaterial({color:0xb1bccf,depthWrite:true,depthTest:true});
 const plane=new T.Mesh(new T.PlaneGeometry(6450,3650),mat);
 plane.receiveShadow=false;plane.castShadow=false;
 world.backdrop=plane;
 const key='backdrop:'+mode;
 if(assetTextures.has(key)){
   mat.map=assetTextures.get(key);mat.color.set('#ffffff');mat.needsUpdate=true;return;
 }
 new T.TextureLoader().load('assets/img/pp_'+mode+'_bg.webp',t=>{
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;
   const ctx=canvas.getContext('2d');
   if(!ctx){
     if(world===owner){mat.map=t;mat.color.set('#ffffff');mat.needsUpdate=true;}
     else t.dispose();
     return;
   }
   ctx.filter='blur(3px)';ctx.drawImage(t.image,-15,-15,1054,606);
   ctx.filter='none';
   ctx.save();ctx.beginPath();ctx.rect(0,275,1024,301);ctx.clip();
   ctx.filter='blur(19px)';ctx.drawImage(t.image,-30,-32,1084,640);
   ctx.restore();ctx.filter='none';
   const fade=ctx.createLinearGradient(0,205,0,576);
   fade.addColorStop(0,'rgba(7,13,30,0)');
   fade.addColorStop(.42,'rgba(8,13,29,.12)');
   fade.addColorStop(.76,'rgba(8,13,29,.42)');
   fade.addColorStop(1,'rgba(8,13,29,.74)');
   ctx.fillStyle=fade;ctx.fillRect(0,160,1024,416);
   const texture=new T.CanvasTexture(canvas);
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;
   assetTextures.set(key,texture);
   if(world===owner){mat.map=texture;mat.color.set('#ffffff');mat.needsUpdate=true;}
   t.dispose();
 },undefined,()=>{});
}
function surfaceTexture(object,mode,repeatX=1,repeatY=1){
 world.surfaceCount=(world.surfaceCount||0)+1;
 object.material.map=cachedArt('surface:'+mode,
   'assets/img/pp_'+mode+'_surface_main.webp',repeatX,repeatY);
 object.material.color.set('#ffffff');
 object.material.needsUpdate=true;
 return object;
}
// Decorative approved sprites have zero collision effect.
function sceneProps(mode) {
 const placements={
  derby:[['grandstand',-450,146,-487,470,255],['hay_bales',470,68,429,230,150]],
  dropzone:[['glass_chute',-567,276,-12,177,270],['gold_bucket',555,-295,25,171,142]],
  brawl:[['spin_hazard',-565,98,-454,240,155],['striped_bumper',550,75,434,206,157]],
  curling:[['alpine_lodge',-490,175,-401,310,210],['ice_blocks',489,67,390,190,139]],
  golf:[['stone_bridge',-530,120,392,305,219],['windmill',532,153,-439,221,248]]
 };
 world.propCount=(placements[mode]||[]).length;
 for(const [name,x,y,z,w,h] of placements[mode]||[]){
   const tex=cachedArt('prop:'+mode+':'+name,
     'assets/img/pp_'+mode+'_prop_'+name+'.webp');
   const mat=new T.SpriteMaterial({
     map:tex,color:0xffffff,transparent:true,depthTest:true,
     depthWrite:false,opacity:.98
   });
   const prop=new T.Sprite(mat);prop.position.set(x,y,z);prop.scale.set(w,h,1);
   prop.renderOrder=4;scene.add(prop);
 }
}
function stageDressing(mode){
 // Physical sets, not flat backdrops: all outside authoritative collision
 // shapes. Keep the active marbles and score panel entirely unobstructed.
 const lit=(color)=>new T.MeshStandardMaterial({
   color:new T.Color(color),emissive:new T.Color(color),emissiveIntensity:.85,
   metalness:.35,roughness:.4
 });
 if(mode==='derby'){
   for(const z of [-425,425]){
     box(1440,34,45,z<0?'#bd6461':'#f5c678',0,18,z,.47);
     for(let i=-6;i<=6;i++){
       const x=i*109;
       const lamp=mesh(new T.SphereGeometry(10,10,8),lit(i%2?'#ffdb8c':'#91d5ff'),x,53,z);
       lamp.castShadow=false;
     }
   }
   for(const x of [-640,640]){
     box(28,205,27,'#986647',x,98,-395,.24);
     box(29,205,27,'#986647',x,98,395,.24);
     box(1390,30,24,'#f7d796',0,215,-395,.5);
   }
 } else if(mode==='dropzone'){
   for(let i=0;i<16;i++){
     const y=-365+i*48;
     for(const x of [-513,513]){
       const light=mesh(new T.BoxGeometry(10,20,16),
         lit(i%2?'#ffc15a':'#62beff'),x,y,72);
       light.castShadow=false;
     }
   }
   for(let i=0;i<8;i++){
     const x=-368+i*105;
     box(94,11,23,'#fff0aa',x,-395,105,.43);
   }
 } else if(mode==='brawl'){
   for(let k=0;k<16;k++){
     const a=k*Math.PI/8,x=Math.cos(a)*685,z=Math.sin(a)*685;
     cylinder(17,120,k%2?'#ab5777':'#d6a65e',x,-5,z,.45);
     const lamp=mesh(new T.SphereGeometry(13,10,10),lit(k%2?'#fe7e9d':'#ffc765'),x,58,z);
     lamp.castShadow=false;
   }
   for(const radius of [510,565]){
     const ring=lineRing(radius,5,radius===510?'#ff9e6c':'#6fd3f9',0,-52,0);
     ring.material.emissive=new T.Color(radius===510?'#c34765':'#317ba5');
     ring.material.emissiveIntensity=.42;
   }
 } else if(mode==='curling'){
   for(const z of [-320,320]){
     box(1400,65,42,'#a9d9ec',0,19,z,.12);
     box(1400,11,15,'#f6fbff',0,54,z,.22);
     for(let x=-640;x<=640;x+=160)box(15,95,14,'#b8e7fa',x,72,z,.22);
   }
   for(let x=-660;x<=660;x+=180){
     const a=mesh(new T.ConeGeometry(33,95,8),material('#1c6171',.12,.6),x,30,-460);
     a.castShadow=false;
   }
 } else if(mode==='golf'){
   // Rounded miniature topiary stays BEHIND the putting surface.
   // Earlier angular cones along the front edge obscured the marble path.
   for(const [i,x] of [-590,-370,-150,210,440,615].entries()){
     const z=-410-(i%3)*16;
     cylinder(12,76,'#976d46',x,28,z,.09);
     const canopy=mesh(new T.IcosahedronGeometry(44,2),
       material(i%2?'#388f60':'#50a86a',.06,.62),x,97,z);
     const crown=mesh(new T.IcosahedronGeometry(34,2),
       material(i%2?'#61b67b':'#78c98e',.06,.53),x+10,133,z-2);
     canopy.castShadow=false;crown.castShadow=false;
   }
   for(const z of [-320,320])box(1350,37,30,'#b99565',0,16,z,.24);
   // Show-scale windmill is scenery beside the course, never a fake obstacle.
   const tower=mesh(new T.ConeGeometry(42,132,7),material('#e7cc9a',.08,.6),520,70,-417);
   const cap=mesh(new T.ConeGeometry(54,47,7),material('#b85751',.28,.38),520,154,-417);
   const arms=new T.Group();arms.position.set(520,100,-360);
   for(let k=0;k<4;k++){
     const blade=new T.Mesh(new T.BoxGeometry(10,118,6),material('#fff6d3',.13,.44));
     blade.position.y=57;blade.rotation.z=k*Math.PI/2;arms.add(blade);
   }
   arms.rotation.z=.23;scene.add(arms);world.windmill=arms;
 }
}

function stage(mode,s) {
 scene=new T.Scene();
 scene.background=new T.Color('#111b31');
 const ambient=new T.HemisphereLight(0xd8edff,0x302337,1.35);scene.add(ambient);
 const key=new T.DirectionalLight(0xffdfb1,3.1);key.position.set(-490,950,690);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-1000;
 key.shadow.camera.right=1000;key.shadow.camera.top=1000;key.shadow.camera.bottom=-1000;
 key.shadow.bias=-.00025;scene.add(key);
 const rim=new T.PointLight(0x67caff,105000,2100,2);rim.position.set(680,580,-380);scene.add(rim);
 const gold=new T.PointLight(0xffc061,90000,1500,2);gold.position.set(-650,500,250);scene.add(gold);
 addBackdrop(mode);
 const p=palettes[mode];
 if(mode==='brawl'){
   // Real stadium deck beneath the curved play bowl; fills the foreground
   // rather than leaving a large empty navy rectangle.
   box(1450,55,1480,'#243951',0,-92,0,.46);
   for(let n=-650;n<=650;n+=130){
     box(3,3,1430,'#4e6480',n,-63,0,.54);
     box(1430,3,3,'#4e6480',0,-63,n,.54);
   }
   for(let k=0;k<8;k++){
     const a=k*Math.PI/4,x=Math.cos(a)*605,z=Math.sin(a)*605;
     const pad=box(106,32,90,k%2?'#ef4f68':'#ffbd4b',x,-47,z,.55);
     pad.rotation.y=-a;
     box(38,65,38,'#fff5b8',x,-4,z,.68);
   }
   const profile=[
     [0,-11],[310,-11],[350,-5],[380,14],[402,34],[419,66],[440,78]
   ].map(a=>new T.Vector2(a[0],a[1]));
   const shell=mesh(new T.LatheGeometry(profile,96),material(p[0],.5,.24));
   // Tactile arena felt is a top-facing material INSIDE the raised rim.
   const floor=cylinder(306,2,p[0],0,-10,0,.09);
   surfaceTexture(floor,'brawl');
   floor.material.roughness=.66;floor.receiveShadow=true;
   shell.material.side=T.DoubleSide;
   lineRing(420,16,p[1],0,78,0);
   lineRing(392,4,'#f2a6de',0,38,0);
   world.rim=lineRing(360,8,'#ffdc75',0,4,0);
   for(let i=0;i<12;i++){
     const ang=i*2*Math.PI/12;
     const x=455*Math.cos(ang),z=455*Math.sin(ang);
     cylinder(13,62,i%2?'#e6526a':'#ffd67a',x,67,z);
     if(i%3===0){
       const lamp=new T.PointLight(i%2?0xff467b:0xffbb4d,5800,310);
       lamp.position.set(x,115,z);scene.add(lamp);
     }
   }
   cylinder(44,35,'#e0a53a',0,7,0,.82);
   world.rotor=new T.Group();scene.add(world.rotor);
   for(let arm=0;arm<4;arm++){
     const m=new T.Mesh(new T.BoxGeometry(195,16,24),
       material(arm%2?'#ffcb5c':'#d04e63',.78,.2));
     m.rotation.y=arm*Math.PI/2;m.position.y=43;world.rotor.add(m);
   }
   world.rotor.visible=false;
   for(let i=0;i<8;i++){
     const a=i*Math.PI/4,px=Math.cos(a)*308,pz=Math.sin(a)*308;
     const bumper=box(53,38,45,i%2?'#ffdd83':'#db4867',px,24,pz,.75);
     bumper.rotation.y=a;
   }
 } else if(mode==='dropzone'){
   box(1005,850,65,'#4d2957',0,0,-35,.78);
   box(950,790,5,'#17264d',0,5,5,.45);
   const face=mesh(new T.PlaneGeometry(934,776),material('#ffffff',.13,.4),0,5,9.2);
   surfaceTexture(face,'dropzone');
   face.receiveShadow=true;face.castShadow=false;
   for(let row=0;row<10;row++)for(let col=0;col<(row%2?8:9);col++){
     const x=(row%2?178:132)+92*col-500,y=350-(160+row*46);
     const peg=mesh(new T.SphereGeometry(13,18,14),
       material(row%3===0?'#ffd777':'#d0eeff',.75,.17),x,y,24);
     peg.scale.z=1.25;
   }
   for(let i=0;i<8;i++){
     const c=defaultColors[i];box(100,90,68,c,-368+i*105,-349,16,.65);
     box(8,110,78,'#fff0b3',-420+i*105,-347,30,.6);
   }
   box(1020,24,100,p[1],0,445,-16,.7);
   box(24,870,100,p[1],-500,0,-16,.7);
   box(24,870,100,p[1],500,0,-16,.7);
 } else {
   const w=mode==='derby'?1370:mode==='curling'?1300:1240;
   const d=mode==='derby'?650:mode==='curling'?530:580;
   box(w+30,34,d+30,p[1],0,-24,0,.52);
   // Layered miniature display plinth: the course now sits on a solid
   // sculpted base instead of floating above a blurred poster.
   box(w+115,25,d+115,mode==='curling'?'#759dba':'#4e3d45',0,-60,0,.36);
   box(w+150,21,d+150,mode==='golf'?'#b98b59':'#2a3349',0,-82,0,.24);
   box(w+163,6,d+163,p[1],0,-96,0,.65);
   const deck=box(w,16,d,p[0],0,-5,0,mode==='curling'?.29:.1);
   surfaceTexture(deck,mode,mode==='derby'?2.0:1.0,mode==='derby'?1.1:1.0);
   deck.material.roughness=mode==='curling'?.11:mode==='golf'?.82:.48;
   box(w+30,55,14,'#f3d69e',0,16,-d/2);
   box(w+30,55,14,'#f3d69e',0,16,d/2);
   box(14,55,d+24,'#f3d69e',-w/2,16,0);
   box(14,55,d+24,'#f3d69e',w/2,16,0);
   if(mode==='derby'){
     for(let i=0;i<6;i++){
       const z=-260+i*104;
       box(1330,1,3,'#ffe6a8',0,6,z-52);
       box(1330,1,3,'#ffe6a8',0,6,z+52);
       box(22,5,87,i%2?'#fff8ea':'#1a213c',619,10,z);
     }
     for(let i=0;i<8;i++){
       const xx=-640+i*175;
       box(27,32,25,'#ffca65',xx,23,-335);
       box(27,32,25,'#d44861',xx,23,335);
     }
   }
   if(mode==='curling'){
     const cx=1140-650,cz=265-265;
     for(const [rad,col] of [[140,'#2b76c7'],[100,'#f2f5ff'],[65,'#d94767'],[27,'#fbfcff']]){
       cylinder(rad,2,col,cx,6,cz,0).material.roughness=.08;
     }
     cylinder(8,3,'#285ea6',cx,8,cz);
     for(const z of [-190,190])box(1300,1,5,'#e7fcff',0,10,z);
   }
   if(mode==='curling'){
     world.guide=new T.ArrowHelper(new T.Vector3(1,0,0),
       new T.Vector3(-575,25,0),300,0xffe38e,32,14);
     scene.add(world.guide);world.guide.visible=false;
   }
   if(mode==='golf') {
     // Miniature golf holes come from the existing authoritative layout.
     const layout=s.layout||{};
     for(const a of layout.walls||[]){
       box(a[2],51,a[3],'#b47b52',a[0]+a[2]/2-620,30,a[1]+a[3]/2-290);
     }
     for(const a of layout.water||[]){
       const water=box(a[2],3,a[3],'#249ed0',a[0]+a[2]/2-620,6,a[1]+a[3]/2-290,.13);
       water.material.roughness=.08;water.material.transparent=true;water.material.opacity=.88;
     }
     for(const a of layout.bumpers||[]){
       cylinder(a[2],25,'#df8d4b',a[0]-620,22,a[1]-290,.65);
       lineRing(a[2],5,'#ffedaa',a[0]-620,36,a[1]-290);
     }
     world.guide=new T.ArrowHelper(new T.Vector3(1,0,0),
       new T.Vector3(-500,30,0),200,0xffef8c,26,13);
     scene.add(world.guide);world.guide.visible=false;
     if(layout.cup){
       cylinder(27,3,'#101a20',layout.cup[0]-620,9,layout.cup[1]-290,.1);
       lineRing(32,4,'#ffd56a',layout.cup[0]-620,11,layout.cup[1]-290);
       const pole=cylinder(4,110,'#fff4d9',layout.cup[0]-620,68,layout.cup[1]-290);
       const flag=box(54,35,3,'#e94659',layout.cup[0]-592,111,layout.cup[1]-290);
     }
   }
 }
 if(mode==='dropzone'){
   for(let i=0;i<8;i++){
     const tag=document.createElement('div');
     tag.className='p3bin';tag.style.left=(11+i*11.1)+'%';
     tag.textContent=[50,100,200,500,1000,500,200,100][i];
     root.appendChild(tag);
   }
 }
 // Themed three-dimensional set dressing frames the physical gameplay.
 stageDressing(mode);
 sceneProps(mode);
 // Add actual miniature-diorama depth outside the board.
 if(mode!=='dropzone'){
   for(let i=0;i<7;i++){
     const x=(i-3)*210, z=-510-Math.abs(i-3)*20;
     const tower=cylinder(13,180,'#a7906b',x,85,z);
     const spotlight=mesh(new T.SphereGeometry(26,12,12),
       new T.MeshBasicMaterial({color:i%2?0xffd57f:0x90dfff}),x,188,z);
     // Emissive floodlight fixtures instead of seven expensive point lights.
   }
 }
 const aspect=(frames[mode][2]/frames[mode][3]);
 camera=new T.PerspectiveCamera(mode==='dropzone'?41:mode==='brawl'?42:45,aspect,1,4500);
 if(mode==='dropzone')camera.position.set(0,0,1350);
 else if(mode==='brawl')camera.position.set(0,765,1045);
 else if(mode==='derby')camera.position.set(0,620,900);
 else camera.position.set(0,625,930);
 camera.lookAt(0,0,0);
 if(world.backdrop){
   // 3 km camera-relative plane: permanently behind the sculpted playfield.
   world.backdrop.position.set(0,0,-3100);
   camera.add(world.backdrop);
   scene.add(camera);
 }
}
function marbleSkin(color){
  // Painted glass swirl under a clear glossy physical coating. This is an
  // inexpensive repeatable shader texture, not a static image billboard.
  const mat=material(/^#[a-f\d]{6}$/i.test(color||'')?color:'#ff526c',.14,.095);
  mat.clearcoat=1;mat.clearcoatRoughness=.025;
  mat.iridescence=.35;mat.iridescenceIOR=1.3;mat.map=marblePaint;
  return mat;
}
function getBall(id,color,label){
 let item=ballMap.get(id);
 if(item)return item;
 const mat=marbleSkin(color);
 const sphere=new T.Mesh(ballGeo,mat);sphere.castShadow=true;scene.add(sphere);
 const shadow=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({color:0x071125,transparent:true,opacity:.43,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=5;scene.add(shadow);
 const glow=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:mat.color,transparent:true,opacity:.28,depthWrite:false}));
 glow.rotation.x=Math.PI/2;glow.position.y=9;scene.add(glow);
 const trail=new T.Mesh(trailGeo,
   new T.MeshBasicMaterial({color:mat.color,transparent:true,opacity:.3,depthWrite:false}));
 trail.visible=false;trail.position.y=5;trail.renderOrder=2;scene.add(trail);
 const arrow=new T.ArrowHelper(new T.Vector3(1,0,0),
   new T.Vector3(0,63,0),48,0xfff3ae,16,9);
 arrow.visible=false;scene.add(arrow);
 const el=document.createElement('div');el.className='p3label';el.textContent=String(label||'').slice(0,17);
 el.style.setProperty('--tagcolor',color||'#ffdf78');root.appendChild(el);
 item={sphere,shadow,glow,trail,arrow,el};ballMap.set(id,item);
 return item;
}
function releaseBall(it){
 if(!it)return;
 if(scene)scene.remove(it.sphere,it.shadow,it.glow,it.trail,it.arrow);
 it.el.remove();
 for(const mat of [it.sphere.material,it.shadow.material,it.glow.material,it.trail.material])mat.dispose();
 // ArrowHelper owns per-instance materials but shares Three.js geometries.
 it.arrow.traverse(o=>{
   if(o.material){
     for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();
   }
 });
}
function placeBall(id,x,y,z,color,label,seen){
 const it=getBall(id,color,label);seen.add(id);
 if(it.seen){
   const dx=x-it.sphere.position.x,dz=z-it.sphere.position.z;
   const dist=Math.hypot(dx,dz);
   if(dist>0&&dist<140){
     it.sphere.rotation.z-=dx/29*.35;
     it.sphere.rotation.x+=dz/29*.35;
   }
   // Physical three-dimensional speed ribbon, not an animated GIF.
   // Teleports and reduced-motion settings never generate a false trail.
   it.trail.visible=!lowMotion&&dist>1.8&&dist<90;
   if(it.trail.visible){
     const length=Math.min(105,22+dist*2.5);
     it.trail.scale.set(length,1.8,8);
     it.trail.position.set(x-dx/dist*length*.55,6,z-dz/dist*length*.55);
     it.trail.rotation.y=-Math.atan2(dz,dx);
     it.trail.material.opacity=Math.min(.48,.13+dist*.016);
   }
 }
 it.seen=true;
 it.sphere.scale.setScalar(worldMode==='brawl'?1.5:1);
 it.shadow.scale.setScalar(worldMode==='brawl'?1.35:1);
 it.sphere.position.set(x,y,z);it.shadow.position.set(x,5,z);it.glow.position.set(x,6,z);
 it.el.textContent=String(label||'').slice(0,17);
}
function update(mode,s){
 const seen=new Set();
 if(mode==='brawl'){
   const radius=s.radius||390;if(world.rim)world.rim.scale.setScalar(radius/360);
   if(world.rotor){world.rotor.visible=s.hazard==='rotor';
     world.rotor.rotation.y=(Number(s.elapsed)||0)*1.8+Number(s.hazardAngle||0);}
   for(const m of s.marbles||[]){
     if(!m.alive)continue;
     const player=(s.roster||[]).find(p=>p.id===m.id)||{};
     placeBall(m.id,m.x*1.03,26,m.y*1.03,player.color,player.name,seen);
     const arrow=ballMap.get(m.id).arrow;
     arrow.visible=true;arrow.position.set(m.x*1.03,62,m.y*1.03);
     arrow.setDirection(new T.Vector3(Math.cos(m.heading),0,Math.sin(m.heading)));
   }
 }else if(mode==='derby'){
   for(let i=0;i<(s.horses||[]).length;i++){
     const h=s.horses[i];
     placeBall(h.id||'horse'+i,-630+clamp(h.x/1500,0,1)*1230,27,-260+i*104,
       h.color,h.name+' · '+(Number(h.odds)||0).toFixed(1)+'×',seen);
   }
 }else if(mode==='dropzone'){
   const balls=s.ball?[s.ball]:[];
   if(!balls.length&&!s.done)balls.push({x:s.x,y:35,color:'#ff526b'});
   balls.forEach((b,i)=>placeBall('drop'+i,b.x-500,350-b.y,58,b.color||'#ff526b','',seen));
 }else if(mode==='curling'){
   for(let i=0;i<(s.stones||[]).length;i++){
     const b=s.stones[i],p=(s.roster||[]).find(p=>p.id===b.id)||{};
     placeBall('stone'+i,b.x-650,26,b.y-265,p.color,p.name,seen);
   }
 }
 if(mode==='curling'&&world.guide){
   world.guide.visible=s.phase==='aim';
   if(s.phase==='aim'){
     const ang=(Number(s.aim)||0)*Math.PI/180;
     world.guide.position.set(-575,32,0);
     world.guide.setDirection(new T.Vector3(Math.cos(ang),0,Math.sin(ang)));
     world.guide.setLength(360,38,16);
   }
 }
 if(mode==='golf'&&world.guide){
   world.guide.visible=s.phase==='aim';
   if(s.phase==='aim'&&s.ball){
     const ang=(Number(s.angle)||0)*Math.PI/180;
     world.guide.position.set(s.ball.x-620,40,s.ball.y-290);
     world.guide.setDirection(new T.Vector3(Math.cos(ang),0,Math.sin(ang)));
     world.guide.setLength(120+clamp(Number(s.power)||0,0,100)*2,29,15);
   }
 }
 if(mode==='golf'&&world.windmill)
   world.windmill.rotation.z=(Number(s.elapsed)||0)*.2;
 if(mode==='golf'&&s.ball){
   const p=(s.roster||[])[s.turn%Math.max(1,(s.roster||[]).length)]||{};
   placeBall('golfball',s.ball.x-620,27,s.ball.y-290,p.color,p.name,seen);
 }
 for(const [id,it] of ballMap)if(!seen.has(id)){
   releaseBall(it);ballMap.delete(id);
 }
 const cx=new T.Vector3();
 if(seen.size){
   for(const o of ballMap.values())cx.add(o.sphere.position);
   cx.divideScalar(seen.size);
 }
 lowMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 updateEffects(mode,s);
 const sec=performance.now()/1000;
 if(mode==='dropzone'){
   // Entire pegboard and all jackpot bins must remain visible even when a
   // ball drops to the bottom: pan by a few pixels, never lose the target.
   const x=lowMotion?0:Math.sin(sec*.19)*8;
   const y=lowMotion?0:Math.max(-16,Math.min(16,(s.ball?.y||300)-390)*.027);
   camera.position.x+=(x-camera.position.x)*.025;
   camera.position.y+=(y-camera.position.y)*.025;
   camera.position.z+=(1345-camera.position.z)*.03;
   camera.lookAt(0,y*.23,0);
 }else{
   let z=mode==='brawl'?1045:mode==='derby'?900:930;
   let focusX=cx.x*.12,focusZ=cx.z*.09;
   if(mode==='derby' && (s.horses||[]).length){
     // Camera operator follows the pack, but widens to include a marble that
     // falls behind. As the gap closes, it gently returns to the race.
     const dist=(s.horses||[]).map(h=>Number(h.x)||0);
     const gap=Math.max(...dist)-Math.min(...dist);
     z=Math.min(1170,900+gap*.23);
     focusX=cx.x*.18;
   }else if(mode==='brawl'){
     const alive=(s.marbles||[]).filter(m=>m.alive).length;
     z=alive>2?1045:965;
     focusX=cx.x*.10;focusZ=cx.z*.09;
   }else if(mode==='golf' && s.ball){
     const cup=s.layout?.cup;
     const bx=s.ball.x-620;
     const gx=Array.isArray(cup)?cup[0]-620:bx;
     focusX=Math.max(-160,Math.min(160,(bx+gx)*.095));
     const gap=Array.isArray(cup)?Math.hypot(s.ball.x-cup[0],s.ball.y-cup[1]):300;
     z=Math.max(850,Math.min(1020,865+gap*.24));
   }else if(mode==='curling'){
     focusX=cx.x*.11;
     z=950;
   }
   const motion=lowMotion?0:Math.sin(sec*.18)*(mode==='brawl'?15:9);
   const rate=lowMotion?.05:.027;
   const px=lowMotion?0:focusX+motion;
   camera.position.x+=(px-camera.position.x)*rate;
   const targetY=mode==='brawl'?765:mode==='derby'?620:625;
   camera.position.y+=(targetY-camera.position.y)*rate;
   camera.position.z+=(z-camera.position.z)*rate;
   camera.lookAt(lowMotion?0:focusX*.48,0,lowMotion?0:focusZ*.5);
 }
}
function clean(){
 if(!scene)return;
 for(const sprite of vfx.values()){
   scene.remove(sprite);sprite.material.dispose();
 }
 vfx.clear();
 root.querySelectorAll('.p3bin').forEach(el=>el.remove());
 for(const item of ballMap.values())releaseBall(item);
 ballMap.clear();
 // Cached art and shared glass paint must survive a scene switch. Disposing
 // them here caused repeated Golf holes to re-upload large GPU textures.
 const shared=new Set([marblePaint,...assetTextures.values(),...fxTextures.values()]);
 const disposedMat=new Set(),disposedGeo=new Set(),disposedTex=new Set();
 scene.traverse(o=>{
   if(o.geometry && ![ballGeo,ringGeo,shadowGeo,trailGeo].includes(o.geometry)
       && o.parent?.type!=='ArrowHelper' && !disposedGeo.has(o.geometry)){
     o.geometry.dispose();disposedGeo.add(o.geometry);
   }
   if(o.material){
     for(const m of Array.isArray(o.material)?o.material:[o.material]){
       if(disposedMat.has(m))continue;
       if(m.map&&!shared.has(m.map)&&!disposedTex.has(m.map)){
         m.map.dispose();disposedTex.add(m.map);
       }
       m.dispose();disposedMat.add(m);
     }
   }
 });
 scene.clear();scene=null;camera=null;world=null;
}
function boot(){
 if(renderer||unsupported)return;
 try{
   renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
   renderer.setPixelRatio(Math.min(1.3,window.devicePixelRatio||1));
   renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.15;
   renderer.shadowMap.enabled=true;
   renderer.shadowMap.type=T.PCFSoftShadowMap;
   root.dataset.quality=quality;
   renderer.domElement.addEventListener('webglcontextlost',event=>{
     event.preventDefault();unsupported=true;enabled=false;
     root.hidden=true;toggle.hidden=true;
   },{passive:false});
   renderer.domElement.setAttribute('aria-hidden','true');
   root.insertBefore(renderer.domElement,root.firstChild);
 }catch(e){
   unsupported=true;enabled=false;root.hidden=true;
   toggle.hidden=true;
   console.warn('[MARBLE RUSH] WebGL unavailable; 2D fallback retained:',e.message);
 }
}
const labelProjection=new T.Vector3();
function frame(time){
 requestAnimationFrame(frame);
 const dt=time-last;
 if(dt<30)return;
 last=time;
 const mr=window.__MR,mode=mr?.state;
 const active=enabled&&!unsupported&&supported.includes(mode);
 root.hidden=!active;toggle.hidden=!supported.includes(mode)||unsupported;
 if(!active){delete root.dataset.rendered;delete root.dataset.mode;}
 const pressed=String(enabled);
 if(toggle.getAttribute('aria-pressed')!==pressed)toggle.setAttribute('aria-pressed',pressed);
 const label=enabled?'✦ CINEMATIC':root.dataset.fallback==='low-frame-rate'?'◇ CLASSIC VIEW (AUTO)':'◇ CLASSIC VIEW';
 if(toggle.textContent!==label)toggle.textContent=label;
 const title=enabled?'Switch to the classic 2D board':'Switch to the cinematic 3D board';
 if(toggle.title!==title)toggle.title=title;
 if(!active){
   showPerformance(mode,false);
   if(worldMode){clean();worldMode='';}
   slowFrames=0;fastFrames=0;return;
 }
 boot();if(!renderer)return;
 // The original game-mode canvas belongs to a #ui screen above the global
 // canvas. Mount the new renderer immediately after THAT canvas so it really
 // replaces the flat playfield instead of being hidden underneath it.
 const activeScreen=document.querySelector('[data-screen="'+mode+'"]');
 const oldCanvas=activeScreen?.querySelector('canvas');
 if(activeScreen&&oldCanvas&&root.parentElement!==activeScreen)
   activeScreen.insertBefore(root,oldCanvas.nextSibling);
 const game=mr.MODES?.[mode]?.session?.(),s=game?.state;
 if(!s){
   // Room transitions can temporarily have no active session: restore the 2D board.
   root.hidden=true;delete root.dataset.rendered;delete root.dataset.mode;
   showPerformance(mode,false);
   if(worldMode){clean();worldMode='';}
   return;
 }
 if(worldMode!==mode || (mode==='golf'&&world?.hole!==s.hole)){
   clean();world={hole:s.hole};worldMode=mode;stage(mode,s);
   stageStartedAt=time;slowFrames=0;fastFrames=0;
 }
 if(root.dataset.layoutMode!==mode){
   // CSS var(--u) handles TV resize without rewriting geometry styles per frame.
   const [left,top,width,height]=frames[mode];
   root.style.left='calc('+left+'*var(--u))';
   root.style.top='calc('+top+'*var(--u))';
   root.style.width='calc('+width+'*var(--u))';
   root.style.height='calc('+height+'*var(--u))';
   root.dataset.layoutMode=mode;
 }
 const ww=Math.max(64,Math.round(root.clientWidth)),hh=Math.max(64,Math.round(root.clientHeight));
 if(renderer.domElement.width!==Math.round(ww*renderer.getPixelRatio())||
    renderer.domElement.height!==Math.round(hh*renderer.getPixelRatio())){
   renderer.setSize(ww,hh,false);
   camera.aspect=ww/hh;camera.updateProjectionMatrix();
 }
 try{
   update(mode,s);
   renderer.render(scene,camera);
   trackFrameTime(dt,time);
   showPerformance(mode,enabled&&!unsupported);
   if(!enabled){delete root.dataset.rendered;return;}
   root.dataset.rendered='true';
   root.dataset.mode=mode;
   // Read-only acceptance diagnostics to prove premium visuals are genuine
   // textured physical geometry with independent scene props.
   root.dataset.surfaceCount=String(world?.surfaceCount||0);
   root.dataset.propCount=String(world?.propCount||0);
   root.dataset.gpuTextures=String(renderer.info.memory.textures);
   const cw=root.clientWidth,ch=root.clientHeight;
   for(const it of ballMap.values()){
     labelProjection.copy(it.sphere.position);labelProjection.y+=55;labelProjection.project(camera);
     it.el.style.left=(labelProjection.x*.5+.5)*cw+'px';
     it.el.style.top=(-labelProjection.y*.5+.5)*ch+'px';
     it.el.hidden=(!it.el.textContent||labelProjection.z>1||labelProjection.z< -1);
   }
 }catch(e){
   console.warn('[MARBLE RUSH] 3D frame failed; restoring 2D:',e.message);
   unsupported=true;root.hidden=true;toggle.hidden=true;clean();
   showPerformance(mode,false);
 }
}
toggle.addEventListener('click',()=>{
 enabled=!enabled;
 if(enabled){delete root.dataset.fallback;boot();}
});
requestAnimationFrame(frame);
})();
