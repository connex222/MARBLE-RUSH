/*
 * MARBLE RUSH — Drop Zone native WebGL three-dimensional Plinko cabinet.
 *
 * Review-only route: /tv?dropzone3d=1, one exclusive game canvas, one TV loop.
 * Pegs, ball, aim, bumper, moving gate and eight scoring slots all use the
 * ORIGINAL authoritative DropZone state; no duplicate game simulation.
 * Original Canvas2D cabinet remains default, Grand Prix untouched.
 */
const MarbleDropZoneWebGL=(()=>{
 'use strict';
 const TAU=Math.PI*2,DEG=Math.PI/180;
 const COLORS=['#ffbc8a','#ffd56f','#55cce8','#8cf0b0','#e1a8ff','#fda55f'];
 let canvas=null,gl=null,program=null,meshCube=null,meshSphere=null,meshStatic=null,loc=null;
 let resources=[],frame=0,drawCalls=0,quality=1,debugGPU='',backdropUrl='';
 let labels=null,notice=null,contextLost=false,contextLossHandler=null,contextRestoreHandler=null;
 let lastEventKey='',fpsLost=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const xw=x=>4+(x-500)*.022;
 const yw=y=>(400-y)*.019;
 const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const translate=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
 const scale=(x,y,z)=>new Float32Array([x,0,0,0,0,y,0,0,0,z,0,0,0,0,1]);
 function mul(a,b){
  const out=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
   let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];
   out[c*4+r]=v;
  }
  return out;
 }
 function perspective(fov,ratio,near,far){
  const f=1/Math.tan(fov/2),o=new Float32Array(16);
  o[0]=f/ratio;o[5]=f;o[10]=(far+near)/(near-far);
  o[11]=-1;o[14]=2*far*near/(near-far);return o;
 }
 function lookAt(eye,target){
  let z=eye.map((v,i)=>v-target[i]);
  let l=Math.hypot(...z)||1;z=z.map(v=>v/l);
  let x=[z[2],0,-z[0]];l=Math.hypot(...x)||1;x=x.map(v=>v/l);
  const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,
   x[2],y[2],z[2],0,
   -x.reduce((s,v,i)=>s+v*eye[i],0),
   -y.reduce((s,v,i)=>s+v*eye[i],0),
   -z.reduce((s,v,i)=>s+v*eye[i],0),1]);
 }
 const vs=[
  'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;',
  'uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uTint;',
  'varying vec3 vColor;varying vec3 vNormal;',
  'void main(){gl_Position=uMVP*vec4(aPosition,1.0);',
  'vColor=aColor*uTint;vNormal=normalize(mat3(uModel)*aNormal);}'
 ].join('\n');
 const fs=[
  'precision mediump float;',
  'varying vec3 vColor;varying vec3 vNormal;',
  'uniform float uOpacity;',
  'void main(){vec3 n=normalize(vNormal);',
  'float light=.34+.54*max(dot(n,normalize(vec3(-.42,.78,.49))),0.0)',
  '+.15*max(dot(n,normalize(vec3(.68,.1,-.65))),0.0);',
  'gl_FragColor=vec4(vColor*light+vec3(.075),uOpacity);}'
 ].join('\n');
 function rgb(hex){
  if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))return [1,.68,.36];
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 }
 function shader(type,source){
  const o=gl.createShader(type);
  gl.shaderSource(o,source);gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error('Drop Zone shader: '+gl.getShaderInfoLog(o));
  resources.push({type:'shader',object:o});return o;
 }
 function geometry(v,i){
  if(v.length/9>=65536)throw Error('Drop Zone WebGL1 index overflow');
  const vertices=gl.createBuffer(),indices=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(i),gl.STATIC_DRAW);
  resources.push({type:'buffer',object:vertices},{type:'buffer',object:indices});
  return {vertices,indices,count:i.length};
 }
 function cube(){
  const v=[],i=[],faces=[
   {n:[0,0,1],p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]},
   {n:[0,0,-1],p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]},
   {n:[0,1,0],p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]},
   {n:[0,-1,0],p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]},
   {n:[1,0,0],p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]},
   {n:[-1,0,0],p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]}
  ];
  for(const f of faces){
   const start=v.length/9;
   for(const p of f.p)v.push(...p,...f.n,1,1,1);
   i.push(start,start+1,start+2,start,start+2,start+3);
  }
  return {v,i};
 }
 function sphere(rows=9,cols=12){
  const v=[],i=[];
  for(let y=0;y<=rows;y++){
   const phi=Math.PI*y/rows;
   for(let x=0;x<=cols;x++){
    const theta=TAU*x/cols;
    const n=[Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)];
    v.push(...n,...n,1,1,1);
   }
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const k=y*(cols+1)+x,b=k+cols+1;
   i.push(k,b,k+1,b,b+1,k+1);
  }
  return {v,i};
 }
 function bakedPanel(){
  const v=[],i=[],cb=cube(),sp=sphere(8,12);
  function append(mesh,pos,scaleVec,tint){
   const offset=v.length/9,rgbValue=rgb(tint);
   for(let k=0;k<mesh.v.length;k+=9){
    v.push(pos[0]+mesh.v[k]*scaleVec[0],pos[1]+mesh.v[k+1]*scaleVec[1],
     pos[2]+mesh.v[k+2]*scaleVec[2],
     mesh.v[k+3],mesh.v[k+4],mesh.v[k+5],...rgbValue);
   }
   for(const id of mesh.i)i.push(offset+id);
  }
  append(cb,[4,0,-1.05],[10,8.7,.38],'#374461');
  append(cb,[4,0,-.7],[9.8,8.52,.14],'#112c44');
  // Real divider rails and bucket structure; each prize bin corresponds
  // directly to one of the eight DropZone.BINS entries.
  const bins=DropZone.BINS;
  for(let k=0;k<8;k++){
   const centerX=80+52.5+k*105;
   const bank=Number(bins[k]);
   const c=bank===1000?'#ffd86c':bank>=500?'#6bd7c2':'#9ba9e2';
   append(cb,[xw(centerX),yw(752),-.14],[1.14,.64,.45],c);
   append(cb,[xw(centerX),yw(712),.15],[1.14,.06,.40],'#f8e4b0');
  }
  for(let k=0;k<=8;k++)
   append(cb,[xw(80+k*105),yw(748),.35],[.065,.90,.25],'#ffeaac');
  // Physical side walls follow the EXACT rules engine x=80..920 boundaries.
  for(const px of [80,920])
   append(cb,[xw(px),yw(370),.1],[.16,7.5,.72],'#e9cf89');
  for(const peg of DropZone.PEGS)
   append(sp,[xw(peg.x),yw(peg.y),.37],[peg.r*.022,peg.r*.022,.25],'#e3d1b2');
  for(let k=0;k<12;k++)
   append(cb,[xw(80+k*(840/11)),yw(105),-.5],[.06,.06,.15],'#c4d9f5');
  return geometry(v,i);
 }
 function setup(){
  resources=[];
  const vert=shader(gl.VERTEX_SHADER,vs),frag=shader(gl.FRAGMENT_SHADER,fs);
  program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))
   throw Error('Drop Zone native3d linking: '+gl.getProgramInfoLog(program));
  resources.push({type:'program',object:program});
  gl.useProgram(program);
  loc={pos:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),
   color:gl.getAttribLocation(program,'aColor'),mvp:gl.getUniformLocation(program,'uMVP'),
   model:gl.getUniformLocation(program,'uModel'),tint:gl.getUniformLocation(program,'uTint'),
   opacity:gl.getUniformLocation(program,'uOpacity')};
  const c=cube(),s=sphere();
  meshCube=geometry(c.v,c.i);meshSphere=geometry(s.v,s.i);
  meshStatic=bakedPanel();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);
 }
 function drawMesh(mesh,vp,position,dimensions,tint,opacity=1){
  const model=mul(translate(...position),scale(...dimensions));
  gl.uniformMatrix4fv(loc.model,false,model);
  gl.uniformMatrix4fv(loc.mvp,false,mul(vp,model));
  gl.uniform3fv(loc.tint,rgb(tint));
  gl.uniform1f(loc.opacity,opacity);
  bindMesh(mesh);
 }
 function bindMesh(mesh){
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertices);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);
  gl.enableVertexAttribArray(loc.pos);
  gl.enableVertexAttribArray(loc.normal);
  gl.enableVertexAttribArray(loc.color);
  gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,36,0);
  gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,36,12);
  gl.vertexAttribPointer(loc.color,3,gl.FLOAT,false,36,24);
  gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);drawCalls++;
 }
 function resize(){
  if(!canvas)return;
  canvas.width=Math.round(1920*quality/16)*16;
  canvas.height=Math.round(canvas.width*9/16);
 }
 function labelsCreate(){
  const stage=canvas.parentElement;
  labels=document.createElement('div');labels.id='ppDrop3dBinLabels';
  Object.assign(labels.style,{position:'absolute',pointerEvents:'none',inset:'0',zIndex:'2'});
  for(const [k,value] of DropZone.BINS.entries()){
   const el=document.createElement('span');el.dataset.bin=String(k);
   el.textContent=String(value);
   Object.assign(el.style,{position:'absolute',top:'81%',left:(35.0+6.4*k)+'%',
    width:'5.9%',textAlign:'center',borderRadius:'5px',padding:'4px 0',
    font:'900 clamp(12px,1.1vw,19px) Nunito,sans-serif',color:'#fff4db',
    background:'rgba(9,19,41,.91)',border:'1px solid #d2a66a',
    textShadow:'0 1px 3px #000'});
   labels.appendChild(el);
  }
  notice=document.createElement('span');notice.id='ppDrop3dImpactNotice';
  Object.assign(notice.style,{position:'absolute',top:'13%',left:'44%',
   font:'900 clamp(18px,2.4vw,42px) Nunito,sans-serif',
   color:'#ffe09e',textShadow:'0 4px 14px #000',whiteSpace:'nowrap'});
  labels.appendChild(notice);stage.appendChild(labels);
 }
 function mount(old){
  if(!old||old.id!=='partyStageCanvas'||!old.parentElement)
   throw Error('Drop Zone WebGL requires the exclusive Party Pack canvas');
  if(canvas)unmount();
  canvas=old.cloneNode(false);old.replaceWith(canvas);
  gl=canvas.getContext('webgl2',{alpha:true,antialias:true})||
    canvas.getContext('webgl',{alpha:true,antialias:true});
  if(!gl){
   canvas.dataset.rendererError='No WebGL support';
   throw Error('Native 3D Drop Zone unavailable on this GPU; remove ?dropzone3d=1');
  }
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  debugGPU=String(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER));
  quality=/swiftshader|llvmpipe|software/i.test(debugGPU)?.55:1;
  frame=0;drawCalls=0;backdropUrl='';contextLost=false;fpsLost=0;lastEventKey='';
  resize();setup();labelsCreate();
  contextLossHandler=e=>{e.preventDefault();contextLost=true;};
  contextRestoreHandler=()=>{contextLost=false;setup();};
  canvas.addEventListener('webglcontextlost',contextLossHandler);
  canvas.addEventListener('webglcontextrestored',contextRestoreHandler);
  canvas.dataset.graphics='dropzone-webgl-native-3d';return true;
 }
 function unmount(){
  if(!canvas)return;
  const stage=canvas.parentElement;
  if(gl&&!contextLost){
   for(const r of resources){
    if(r.type==='buffer')gl.deleteBuffer(r.object);
    else if(r.type==='program')gl.deleteProgram(r.object);
    else if(r.type==='shader')gl.deleteShader(r.object);
   }
  }
  canvas.removeEventListener('webglcontextlost',contextLossHandler);
  canvas.removeEventListener('webglcontextrestored',contextRestoreHandler);
  if(labels){labels.remove();labels=null;notice=null;}
  if(stage){
   for(const name of ['background-image','background-size','background-position','background-repeat'])
    stage.style.removeProperty(name);
   delete stage.dataset.dropzoneScenery;
  }
  const blank=canvas.cloneNode(false);
  blank.removeAttribute('data-graphics');blank.removeAttribute('data-renderer-error');
  canvas.replaceWith(blank);
  canvas=null;gl=null;program=null;meshCube=null;meshSphere=null;meshStatic=null;
  loc=null;resources=[];backdropUrl='';contextLost=false;
 }
 function setBackdrop(assets){
  const image=assets?.pp_dropzone_bg;
  if(!image?.complete||!image.naturalWidth||!canvas?.parentElement)return;
  const src=String(image.currentSrc||image.src||'').replace(/["\\\r\n]/g,'');
  if(!src||src===backdropUrl)return;
  const stage=canvas.parentElement;
  stage.style.backgroundImage='linear-gradient(0deg,rgba(3,9,26,.74),rgba(3,9,26,.35) 40%,rgba(3,9,26,.20)),url("'+src+'")';
  stage.style.backgroundSize='100% 100%,cover';
  stage.style.backgroundPosition='center,center';
  stage.style.backgroundRepeat='no-repeat';
  stage.dataset.dropzoneScenery='approved-static-art';
  backdropUrl=src;
 }
 function updateBins(s){
  if(!labels)return;
  for(let k=0;k<8;k++){
   const el=labels.children[k];if(!el)continue;
   const jackpot=s.round===5&&s.jackpotBin===k;
   el.style.borderColor=jackpot?'#fff6a3':'#d2a66a';
   el.style.background=jackpot?'rgba(138,55,18,.95)':'rgba(9,19,41,.91)';
   el.textContent=jackpot?'★ 1000':String(DropZone.BINS[k]);
  }
  const events=s.events||[],event=events.at(-1);
  if(!event||!notice){if(notice)notice.textContent='';return;}
  const age=s.elapsed-Number(event.time);
  if(age<0||age>1.1){notice.textContent='';return;}
  const message=event.kind==='goldPeg'?'GOLD PEG · DOUBLE':
    event.kind==='jackpot'?'JACKPOT · 1000':
    event.kind==='bucket'?'BANKED · '+Number(event.score)+' PTS':'';
  notice.textContent=message;
  lastEventKey=event.kind+':'+event.time;
 }
 function render(s,assets,opts={}){
  if(!gl||contextLost||!s||!Array.isArray(s.pegs)||s.pegs.length!==85)return false;
  const vp=mul(perspective(39*DEG,canvas.width/canvas.height,.4,120),
    lookAt([1.9,1.0,31],[0,0,0]));
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);drawCalls=0;
  // Baked *actual 3D* cabinet, pegged field, dividers and eight bucket slots.
  gl.uniformMatrix4fv(loc.model,false,identity());
  gl.uniformMatrix4fv(loc.mvp,false,vp);
  gl.uniform3fv(loc.tint,new Float32Array([1,1,1]));
  gl.uniform1f(loc.opacity,1);
  bindMesh(meshStatic);
  for(const pegId of s.gold){
   const peg=s.pegs[pegId];if(!peg)continue;
   drawMesh(meshSphere,vp,[xw(peg.x),yw(peg.y),.77],[.27,.27,.29],'#ffe37a');
  }
  // The bumper and gate use the exact same functions as collision() in the
  // deterministic 2D engine, merely mapped into camera-projected 3D space.
  const bumperX=500+110*Math.sin(s.elapsed*1.2);
  drawMesh(meshSphere,vp,[xw(bumperX),yw(480),.82],[.48,.48,.42],'#f892cc');
  const gateX=500+115*Math.sin(s.elapsed*.9);
  drawMesh(meshCube,vp,[xw(gateX),yw(598),.75],[1.16,.16,.42],'#77dbe5');
  const p=s.ball;
  if(p){
   drawMesh(meshSphere,vp,[xw(p.x),yw(p.y),1.18],[.37,.37,.37],
    p.color||'#ffd66e');
  }else if(!s.done){
   // Ghost only: position is sourced directly from player-controlled aim s.x.
   gl.depthMask(false);
   drawMesh(meshSphere,vp,[xw(s.x),yw(35),1.16],[.40,.40,.40],
    s.roster[s.turn%s.roster.length]?.color||'#ffcd68',.55);
   gl.depthMask(true);
  }
  setBackdrop(assets);updateBins(s);
  MarblePartyUI.updateDropZone(s);
  frame++;
  if(frame%120===0&&gl.getError()!==gl.NO_ERROR)return false;
  return true;
 }
 function debug(){return {api:gl?'WebGL':'none',realMeshes:!!meshSphere&&!!meshStatic,
  source:'DropZone.state.ball/pegs/gold/elapsed/x/jackpotBin',frame,drawCalls,
  singleCanvas:!!canvas&&canvas.parentElement?.querySelectorAll('canvas').length===1,
  labels:labels?.children.length||0,backdrop:!!backdropUrl,
  gpu:debugGPU,resolution:[canvas?.width||0,canvas?.height||0],
  originalRulesModified:false};}
 return Object.freeze({mount,unmount,draw:render,debug,
   get canvas(){return canvas;},get active(){return !!gl&&!contextLost;}});
})();
