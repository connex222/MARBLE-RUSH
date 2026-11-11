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
 brawl:[490,164,1390,756],curling:[480,212,1415,662],
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
  ballMap=new Map(),labels=new Map(),halos=new Map(),last=0,lowMotion=false,unsupported=false;
const ballGeo=new T.SphereGeometry(24,32,24);
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
const shadowGeo=new T.CircleGeometry(25,24);
const defaultColors=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
const FXKINDS={
 derby:{heat_start:'speed',cheer:'confetti',photoFinish:'photo',lateSurge:'surge',payout:'laurel',gate_open:'dust'},
 dropzone:{release:'fall',goldPeg:'multiplier',pegImpact:'peg',jackpot:'superjackpot',bucket:'coins',jackpotMove:'jackpot'},
 brawl:{hit:'impact',ram:'shockwave',out:'ko',lastTwo:'warning',hazardReveal:'spin',hazardImpact:'ricochet',round_end:'victory'},
 curling:{throw:'sweep',sweep:'scrape',hit:'impact',measurement:'target',lastStone:'aurora',end_result:'victory'},
 golf:{shot:'putt',water:'ricochet',holeInOne:'holeinone',cup:'cup',tunnel:'roll',flyThrough:'flag',spectatorCheer:'confetti'}
};
const vfx=new Map(),fxTextures=new Map(),fxClock=()=>performance.now();
function fxPosition(mode,e,state){
 const ex=Number.isFinite(e.x)?e.x:null,ey=Number.isFinite(e.y)?e.y:null;
 if(mode==='brawl')return [ex===null?0:ex*1.03,55,ey===null?0:ey*1.03];
 if(mode==='curling')return [ex===null?290:ex-650,39,ey===null?0:ey-265];
 if(mode==='golf')return [ex===null?0:ex-620,39,ey===null?0:ey-290];
 if(mode==='dropzone')return [ex===null?0:ex-500,ey===null?0:350-ey,82];
 const length=Math.max(1,Number(state.length)||1300);
 return [ex===null?0:-630+Math.max(0,Math.min(1,ex/length))*1230,48,Number.isInteger(e.horse)?-260+104*e.horse:0];
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
 m.receiveShadow=true;m.castShadow=true;scene.add(m);return m;
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
function addBackdrop(mode) {
 const texture=new T.TextureLoader().load('assets/img/pp_'+mode+'_bg.webp',t=>{
   t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;
 },undefined,()=>{});
 const mat=new T.MeshBasicMaterial({
   map:texture,color:0xb1bccf,depthWrite:true,depthTest:true
 });
 const plane=new T.Mesh(new T.PlaneGeometry(6450,3650),mat);
 plane.receiveShadow=false;plane.castShadow=false;
 world.backdrop=plane;
}
function surfaceTexture(object,mode,repeatX=1,repeatY=1){
 const tex=new T.TextureLoader().load(
   'assets/img/pp_'+mode+'_surface_main.webp',t=>{
     t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;
   },undefined,()=>{});
 tex.wrapS=T.RepeatWrapping;tex.wrapT=T.RepeatWrapping;
 tex.repeat.set(repeatX,repeatY);
 object.material.map=tex;
 object.material.color.set('#ffffff');
 object.material.needsUpdate=true;
 return object;
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
       const light=box(10,20,16,i%2?'#ffd476':'#8fe1ff',x,y,72,.12);
       light.material=lit(i%2?'#ffc15a':'#62beff');
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
   for(let x=-630;x<=630;x+=200){
     const z=x%400===0?-355:355;
     cylinder(14,74,'#9e7549',x,26,z,.13);
     const tree=mesh(new T.ConeGeometry(54,115,9),material('#39875a',.08,.64),x,105,z);
     tree.castShadow=false;
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
 const ambient=new T.HemisphereLight(0xdbf3ff,0x38202b,2.1);scene.add(ambient);
 const key=new T.DirectionalLight(0xffd5a3,3.3);key.position.set(-490,950,690);
 key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.camera.left=-1000;
 key.shadow.camera.right=1000;key.shadow.camera.top=1000;key.shadow.camera.bottom=-1000;
 key.shadow.bias=-.00025;scene.add(key);
 const rim=new T.PointLight(0x67caff,230000,2100,2);rim.position.set(680,580,-380);scene.add(rim);
 const gold=new T.PointLight(0xffc061,150000,1500,2);gold.position.set(-650,500,250);scene.add(gold);
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
     const lamp=new T.PointLight(i%2?0xff467b:0xffbb4d,3200,240);
     lamp.position.set(x,115,z);scene.add(lamp);
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
     const peg=mesh(new T.SphereGeometry(10,12,10),
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
 const arrow=new T.ArrowHelper(new T.Vector3(1,0,0),
   new T.Vector3(0,63,0),48,0xfff3ae,16,9);
 arrow.visible=false;scene.add(arrow);
 const el=document.createElement('div');el.className='p3label';el.textContent=String(label||'').slice(0,17);
 el.style.setProperty('--tagcolor',color||'#ffdf78');root.appendChild(el);
 item={sphere,shadow,glow,arrow,el};ballMap.set(id,item);
 return item;
}
function placeBall(id,x,y,z,color,label,seen){
 const it=getBall(id,color,label);seen.add(id);
 if(it.seen){
   const dx=x-it.sphere.position.x,dz=z-it.sphere.position.z;
   if(Math.abs(dx)+Math.abs(dz)<140){
     it.sphere.rotation.z-=dx/24*.35;
     it.sphere.rotation.x+=dz/24*.35;
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
   scene.remove(it.sphere,it.shadow,it.glow,it.arrow);
   it.el.remove();it.sphere.material.dispose();it.shadow.material.dispose();it.glow.material.dispose();
   ballMap.delete(id);
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
   camera.position.set(lowMotion?0:20*Math.sin(sec*.16),0,1350);
   camera.lookAt(0,0,0);
 }else{
   const spread=mode==='brawl'?.12:mode==='derby'?.08:.06;
   const px=lowMotion?0:Math.sin(sec*.21)*spread*600;
   camera.position.x+=(px+cx.x*.07-camera.position.x)*.022;
   const targetY=mode==='brawl'?765:mode==='derby'?620:625;
   camera.position.y+=((targetY+(mode==='derby'&&s.phase==='racing'?18:0))-camera.position.y)*.018;
   camera.position.z+=((mode==='brawl'?1045:mode==='derby'?900:930)-camera.position.z)*.018;
   camera.lookAt(cx.x*(mode==='derby'?.13:.11),0,cx.z*.11);
 }
}
function clean(){
 if(!scene)return;
 for(const sprite of vfx.values()){scene.remove(sprite);sprite.material.dispose();}
 vfx.clear();
 root.querySelectorAll('.p3bin').forEach(el=>el.remove());
 for(const x of ballMap.values()){x.el.remove();x.sphere.material.dispose();x.shadow.material.dispose();x.glow.material.dispose();}
 ballMap.clear();
 scene.traverse(o=>{
   if(o.isMesh){
     if(o.geometry&&!([ballGeo,ringGeo,shadowGeo].includes(o.geometry)))o.geometry.dispose();
     if(o.material){
       const mats=Array.isArray(o.material)?o.material:[o.material];
       mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});
     }
   }
 });
 scene.clear();scene=null;camera=null;world=null;
}
function boot(){
 if(renderer||unsupported)return;
 try{
   renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
   renderer.setPixelRatio(Math.min(1.25,window.devicePixelRatio||1));
   renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.22;
   renderer.shadowMap.enabled=true;
   renderer.shadowMap.type=T.PCFShadowMap;
   renderer.domElement.setAttribute('aria-hidden','true');
   root.insertBefore(renderer.domElement,root.firstChild);
 }catch(e){
   unsupported=true;enabled=false;root.hidden=true;
   toggle.hidden=true;
   console.warn('[MARBLE RUSH] WebGL unavailable; 2D fallback retained:',e.message);
 }
}
function frame(time){
 requestAnimationFrame(frame);
 if(time-last<30)return;last=time;
 const mr=window.__MR,mode=mr?.state;
 const active=enabled&&!unsupported&&supported.includes(mode);
 root.hidden=!active;toggle.hidden=!supported.includes(mode)||unsupported;
 if(!active){delete root.dataset.rendered;delete root.dataset.mode;}
 toggle.setAttribute('aria-pressed',String(enabled));
 toggle.textContent=enabled?'3D VIEW: ON':'3D VIEW: OFF';
 if(!active){if(worldMode){clean();worldMode='';}return;}
 boot();if(!renderer)return;
 // The original game-mode canvas belongs to a #ui screen above the global
 // canvas. Mount the new renderer immediately after THAT canvas so it really
 // replaces the flat playfield instead of being hidden underneath it.
 const activeScreen=document.querySelector('[data-screen="'+mode+'"]');
 const oldCanvas=activeScreen?.querySelector('canvas');
 if(activeScreen&&oldCanvas&&root.parentElement!==activeScreen)
   activeScreen.insertBefore(root,oldCanvas.nextSibling);
 const game=mr.MODES?.[mode]?.session?.(),s=game?.state;
 if(!s)return;
 if(worldMode!==mode || (mode==='golf'&&world?.hole!==s.hole)){
   clean();world={hole:s.hole};worldMode=mode;stage(mode,s);
 }
 const [left,top,width,height]=frames[mode];
 root.style.left='calc('+left+'*var(--u))';
 root.style.top='calc('+top+'*var(--u))';
 root.style.width='calc('+width+'*var(--u))';
 root.style.height='calc('+height+'*var(--u))';
 const ww=Math.max(64,Math.round(root.clientWidth)),hh=Math.max(64,Math.round(root.clientHeight));
 if(renderer.domElement.width!==Math.round(ww*renderer.getPixelRatio())||
    renderer.domElement.height!==Math.round(hh*renderer.getPixelRatio())){
   renderer.setSize(ww,hh,false);
   camera.aspect=ww/hh;camera.updateProjectionMatrix();
 }
 try{
   update(mode,s);
   renderer.render(scene,camera);
   root.dataset.rendered='true';
   root.dataset.mode=mode;
   const cw=root.clientWidth,ch=root.clientHeight;
   for(const it of ballMap.values()){
     const v=it.sphere.position.clone();v.y+=55;v.project(camera);
     it.el.style.left=(v.x*.5+.5)*cw+'px';
     it.el.style.top=(-v.y*.5+.5)*ch+'px';
     it.el.hidden=(!it.el.textContent||v.z>1||v.z< -1);
   }
 }catch(e){
   console.warn('[MARBLE RUSH] 3D frame failed; restoring 2D:',e.message);
   unsupported=true;root.hidden=true;toggle.hidden=true;clean();
 }
}
toggle.addEventListener('click',()=>{enabled=!enabled;if(enabled)boot();});
requestAnimationFrame(frame);
})();
