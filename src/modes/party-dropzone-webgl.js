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
 const TAU=Math.PI*2,DEG=Math.PI/180,VERTEX_STRIDE=10;
 const COLORS=['#ffbc8a','#ffd56f','#55cce8','#8cf0b0','#e1a8ff','#fda55f'];
 let canvas=null,gl=null,program=null,meshCube=null,meshSphere=null,meshStatic=null,meshMoving=null,loc=null;
 let resources=[],frame=0,drawCalls=0,quality=1,debugGPU='',backdropUrl='';
 let labels=null,notice=null,contextLost=false,contextLossHandler=null,contextRestoreHandler=null;
 let lastEventKey='',fpsLost=0,geometryProbe=null,meshTemplates=null;
 let surfaceQuality='basic',reviewOverlay=null,reviewFrames=0,reviewFps=0,reviewFrameAt=0;
 const LIGHT_CAMERA=new Float32Array([4.9,1.0,32.5]);
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
 const vs=["attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;","attribute float aMaterial;","uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uTint;","varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;","varying float vMaterial;","void main(){vec4 world=uModel*vec4(aPosition,1.0);","gl_Position=uMVP*vec4(aPosition,1.0);","vWorld=world.xyz;vMaterial=aMaterial;vColor=aColor*uTint;","vNormal=normalize(mat3(uModel)*aNormal);}"] .join('\n');
 const fs=["precision mediump float;","varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;","varying float vMaterial;","uniform float uOpacity;uniform float uPremium;uniform vec3 uCamera;","void main(){vec3 n=normalize(vNormal);","vec3 key=normalize(vec3(-.42,.78,.49));","vec3 fill=normalize(vec3(.68,.1,-.65));","float light=.28+.56*max(dot(n,key),0.0)","+.18*max(dot(n,fill),0.0);","vec3 colour=vColor*light+vec3(.035,.050,.068);","if(uPremium>0.5){","float metal=1.0-step(0.5,abs(vMaterial-1.0));","float glass=1.0-step(0.5,abs(vMaterial-2.0));","float marble=1.0-step(0.5,abs(vMaterial-3.0));","float shine=max(metal,max(glass,marble));","if(shine>0.5){","vec3 viewDir=normalize(uCamera-vWorld);","vec3 halfDir=normalize(key+viewDir);","float smoothness=metal*38.0+glass*52.0+marble*64.0;","float spec=pow(max(dot(n,halfDir),0.0),smoothness);","float rim=pow(1.0-max(dot(n,viewDir),0.0),3.0);","vec3 gleam=mix(vec3(.75,.86,.96),vColor,metal*.40);","colour+=gleam*spec*(metal*.50+glass*.66+marble*.82);","colour+=vColor*rim*(metal*.12+glass*.28+marble*.24);","}}","gl_FragColor=vec4(clamp(colour,0.0,1.0),uOpacity);}"].join('\n');
 function materialId(tint,override){
  if(Number.isInteger(override))return override;
  if(['#8cebf6','#e7f8f2','#69f5ee','#f38cc3','#83ecfa','#83e8f1'].includes(tint))return 2;
  if(['#bf8b4d','#f4d897','#ffd891','#ffe6a9','#f6d286','#ffe7a7',
      '#ffeaac','#ffe8ae','#ffe37a','#ffef94','#ffdf94','#fff0af'].includes(tint))return 1;
  return 0;
 }
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
  if(v.length/VERTEX_STRIDE>=65536)throw Error('Drop Zone WebGL1 index overflow');
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
  function append(mesh,pos,scaleVec,tint,manualMaterial){
   const offset=v.length/VERTEX_STRIDE,col=rgb(tint),material=materialId(tint,manualMaterial);
   for(let k=0;k<mesh.v.length;k+=9){
    const nx=mesh.v[k+3]/scaleVec[0],ny=mesh.v[k+4]/scaleVec[1],
      nz=mesh.v[k+5]/scaleVec[2],len=Math.hypot(nx,ny,nz)||1;
    v.push(pos[0]+mesh.v[k]*scaleVec[0],
      pos[1]+mesh.v[k+1]*scaleVec[1],pos[2]+mesh.v[k+2]*scaleVec[2],
      nx/len,ny/len,nz/len,...col,material);
   }
   for(const id of mesh.i)i.push(offset+id);
  }
  // An inset steel playfield, warm extruded edge and shallow metallic bevel.
  // All three are real world-space 3D boxes, baked with the 85 peg spheres.
  append(cb,[4,0,-1.12],[10.35,8.93,.40],'#bf8b4d');
  append(cb,[4,0,-.85],[10.16,8.70,.16],'#f4d897');
  append(cb,[4,0,-.69],[9.82,8.45,.18],'#1d3e59');
  append(cb,[4,0,-.48],[9.60,8.25,.10],'#193b59');
  // Actual 3D marquee and raised light studs, not a duplicate 2D screen.
  append(cb,[4,yw(96),-.08],[8.93,.50,.18],'#8f683f');
  append(cb,[4,yw(96),.14],[8.66,.36,.10],'#ffd891');
  append(cb,[4,yw(96),.26],[7.84,.25,.08],'#173b52');
  for(let k=0;k<19;k++){
    const px=80+k*840/18;
    append(sp,[xw(px),yw(96),.42],[.12,.12,.12],
      k%3===0?'#ffe6a9':'#69f5ee');
  }
  for(const px of [210,500,790]){
    append(sp,[xw(px),yw(45),.42],[.38,.38,.19],'#664733');
    append(sp,[xw(px),yw(45),.58],[.29,.29,.18],'#f6d286');
  }
  for(const y of [70,690]){
   append(cb,[4,yw(y),-.16],[9.38,.045,.07],'#67c5d3');
  }
  for(const px of [81,919]){
   append(cb,[xw(px),0,.40],[.10,8.3,.15],'#ffe3a2');
   append(cb,[xw(px),0,.56],[.045,8.2,.05],'#83ecfa');
  }
  // Real divider rails and bucket structure; each prize bin corresponds
  // directly to one of the eight DropZone.BINS entries.
  const bins=DropZone.BINS;
  for(let k=0;k<8;k++){
   const centerX=80+52.5+k*105;
   const bank=Number(bins[k]);
   const c=bank===1000?'#ffd86c':bank>=500?'#6bd7c2':'#9ba9e2';
   append(cb,[xw(centerX),yw(752),-.11],[1.16,.70,.49],c);
   append(cb,[xw(centerX),yw(715),.36],[1.14,.09,.35],'#ffe7a7');
   append(cb,[xw(centerX),yw(774),.41],[1.10,.09,.25],'#3a566c');
  }
  for(let k=0;k<=8;k++)
   append(cb,[xw(80+k*105),yw(748),.35],[.065,.90,.25],'#ffeaac');
  // Physical side walls follow the EXACT rules engine x=80..920 boundaries.
  for(const px of [80,920])
   append(cb,[xw(px),yw(370),.32],[.13,7.55,.49],'#ecd298');
  for(const peg of DropZone.PEGS){
   // Every stud has a physical dark recessed socket and front glass-blue
   // dome. Both are real triangulated spheres in the same GPU batch.
   const x=xw(peg.x),y=yw(peg.y);
   append(sp,[x+.05,y-.06,.23],[.25,.25,.15],'#08172b');
   append(sp,[x,y,.67],[peg.r*.027,peg.r*.027,.31],'#8cebf6');
  }
  // Three-dimensional chute lip and illuminated metal fasteners.
  append(cb,[4,yw(88),.31],[9.30,.12,.32],'#ffd993');
  for(let k=0;k<12;k++){
   const px=xw(80+k*(840/11));
   append(sp,[px,yw(88),.69],[.075,.075,.10],'#e7f8f2');
   append(sp,[px,yw(778),.77],[.085,.085,.13],'#ffe8ae');
  }
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
   color:gl.getAttribLocation(program,'aColor'),material:gl.getAttribLocation(program,'aMaterial'),
   mvp:gl.getUniformLocation(program,'uMVP'),
   model:gl.getUniformLocation(program,'uModel'),tint:gl.getUniformLocation(program,'uTint'),
   opacity:gl.getUniformLocation(program,'uOpacity'),
   premium:gl.getUniformLocation(program,'uPremium'),
   camera:gl.getUniformLocation(program,'uCamera')};
  meshTemplates={cube:cube(),sphere:sphere()};
  // No extra obsolete 9-float GPU buffers; both live draws use material-aware VBOs.
  meshStatic=bakedPanel();
  meshMoving=geometry([],[]);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);
 }
 function bindMesh(mesh){
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertices);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);
  gl.enableVertexAttribArray(loc.pos);
  gl.enableVertexAttribArray(loc.normal);
  gl.enableVertexAttribArray(loc.color);
  gl.enableVertexAttribArray(loc.material);
  gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,40,0);
  gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,40,12);
  gl.vertexAttribPointer(loc.color,3,gl.FLOAT,false,40,24);
  gl.vertexAttribPointer(loc.material,1,gl.FLOAT,false,40,36);
  gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);drawCalls++;
 }
 function drawMovingMesh(state,vp){
  // Static and dynamic draw objects now share the verified world-space MVP.
  // One batched GPU upload holds real 3D gold pegs, bumper, gate and ball.
  // Cache primitive topology at mount; only positions change each frame.
  const v=[],i=[],sphereRaw=meshTemplates.sphere,cubeRaw=meshTemplates.cube;
  function add(mesh,p,dims,tint,manualMaterial){
   const offset=v.length/VERTEX_STRIDE,col=rgb(tint),material=materialId(tint,manualMaterial);
   for(let k=0;k<mesh.v.length;k+=9){
    const nx=mesh.v[k+3]/dims[0],ny=mesh.v[k+4]/dims[1],
      nz=mesh.v[k+5]/dims[2],len=Math.hypot(nx,ny,nz)||1;
    v.push(p[0]+mesh.v[k]*dims[0],p[1]+mesh.v[k+1]*dims[1],
      p[2]+mesh.v[k+2]*dims[2],
      nx/len,ny/len,nz/len,...col,material);
   }
   for(const index of mesh.i)i.push(offset+index);
  }
  for(const index of state.gold){
   const peg=state.pegs[index];
   if(peg)add(sphereRaw,[xw(peg.x),yw(peg.y),.93],
     [.34,.34,.36],'#ffe37a');
  }
  add(sphereRaw,[xw(500+110*Math.sin(state.elapsed*1.2)),yw(480),1.01],
    [.58,.58,.48],'#f38cc3');
  add(cubeRaw,[xw(500+115*Math.sin(state.elapsed*.9)),yw(598),.95],
    [1.16,.21,.48],'#83e8f1');
  const p=state.ball;
  if(p){
    add(sphereRaw,[xw(p.x)+.12,yw(p.y)-.14,.03],
      [.49,.19,.07],'#071b2c');
    add(sphereRaw,[xw(p.x),yw(p.y),1.43],
      [.43,.43,.43],p.color||'#ffd96e',3);
  }
  else if(!state.done){
   const owner=state.roster[state.turn%state.roster.length];
   const x=xw(state.x),y=yw(35);
   // Extruded chute rim travels with the real phone/TV aim. It is not
   // an independent simulation, overlay or rerendered legacy screen.
   add(cubeRaw,[x-.53,y+.13,.70],[.08,.69,.22],'#ffdf94');
   add(cubeRaw,[x+.53,y+.13,.70],[.08,.69,.22],'#ffdf94');
   add(cubeRaw,[x,y+.79,.70],[.62,.11,.29],'#fff0af');
   add(sphereRaw,[x,y,1.43],[.43,.43,.43],owner?.color||'#ffce73',3);
  }
  if(state.round===DropZone.ROUNDS&&Number.isInteger(state.jackpotBin)){
    const k=state.jackpotBin,cx=xw(80+52.5+k*105),cy=yw(752);
    add(cubeRaw,[cx-.93,cy,.74],[.055,.62,.14],'#ffef94');
    add(cubeRaw,[cx+.93,cy,.74],[.055,.62,.14],'#ffef94');
    add(cubeRaw,[cx,cy+.69,.74],[.99,.07,.14],'#ffef94');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,meshMoving.vertices);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,meshMoving.indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(i),gl.DYNAMIC_DRAW);
  meshMoving.count=i.length;
  gl.uniformMatrix4fv(loc.model,false,identity());
  gl.uniformMatrix4fv(loc.mvp,false,vp);
  gl.uniform3fv(loc.tint,new Float32Array([1,1,1]));
  gl.uniform1f(loc.opacity,1);
  bindMesh(meshMoving);
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
    transform:'translate(-50%,-50%)',width:'4.45%',
    textAlign:'center',borderRadius:'5px',padding:'4px 0',
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
  const software=/swiftshader|llvmpipe|software/i.test(debugGPU);
  quality=software?.55:1;
  const forced=new URLSearchParams(location.search).get('dropzoneMaterial');
  surfaceQuality=forced==='basic'||forced==='premium'?forced:(software?'basic':'premium');
  frame=0;drawCalls=0;backdropUrl='';contextLost=false;fpsLost=0;
  lastEventKey='';geometryProbe=null;reviewFrames=0;reviewFps=0;reviewFrameAt=performance.now();
  resize();setup();labelsCreate();createHardwareOverlay();
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
  if(reviewOverlay){reviewOverlay.remove();reviewOverlay=null;}
  if(stage){
   for(const name of ['background-image','background-size','background-position','background-repeat'])
    stage.style.removeProperty(name);
   delete stage.dataset.dropzoneScenery;
  }
  const blank=canvas.cloneNode(false);
  blank.removeAttribute('data-graphics');blank.removeAttribute('data-renderer-error');
  canvas.replaceWith(blank);
  canvas=null;gl=null;program=null;meshCube=null;meshSphere=null;meshStatic=null;meshMoving=null;
  loc=null;resources=[];meshTemplates=null;backdropUrl='';contextLost=false;
  reviewFrames=0;reviewFps=0;
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
 function projectToStage(world,vp){
  const c=[0,1,2,3].map(row=>vp[row]*world[0]+
    vp[4+row]*world[1]+vp[8+row]*world[2]+vp[12+row]);
  if(c[3]<=0)return null;
  return {x:50*(1+c[0]/c[3]),y:50*(1-c[1]/c[3])};
 }
 function updateBins(s,vp){
  if(!labels)return;
  for(let k=0;k<8;k++){
   const el=labels.children[k];if(!el)continue;
   const point=projectToStage([xw(80+52.5+k*105),yw(768),.97],vp);
   if(point){el.style.left=point.x.toFixed(2)+'%';
     el.style.top=point.y.toFixed(2)+'%';}
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
 function createHardwareOverlay(){
  if(new URLSearchParams(location.search).get('debug3d')!=='1')return;
  reviewOverlay=document.createElement('output');
  reviewOverlay.id='ppDrop3dHardwareQA';
  reviewOverlay.setAttribute('aria-label','Native 3D local frame monitor');
  Object.assign(reviewOverlay.style,{position:'absolute',left:'34%',bottom:'2%',zIndex:'4',
    padding:'7px 12px',background:'rgba(5,15,31,.92)',color:'#ffe5ad',
    border:'1px solid #cfac70',borderRadius:'6px',font:'700 13px monospace',
    pointerEvents:'none',whiteSpace:'pre'});
  reviewOverlay.textContent='REAL 3D GPU · sampling frames…';
  canvas.parentElement.appendChild(reviewOverlay);
 }
 function updateHardwareOverlay(){
  if(!reviewOverlay)return;
  reviewFrames++;
  const now=performance.now(),elapsed=(now-reviewFrameAt)/1000;
  if(elapsed<1)return;
  reviewFps=reviewFrames/elapsed;reviewFrames=0;reviewFrameAt=now;
  reviewOverlay.textContent='REAL 3D · '+surfaceQuality.toUpperCase()+
    ' · '+reviewFps.toFixed(1)+' FPS · '+canvas.width+'x'+canvas.height+
    ' · '+drawCalls+' draws\n'+debugGPU.slice(0,80);
 }
 function render(s,assets,opts={}){
  if(!gl||contextLost||!s||!Array.isArray(s.pegs)||s.pegs.length!==85)return false;
  const vp=mul(perspective(39*DEG,canvas.width/canvas.height,.4,120),
    // Camera pulls back just enough to clear the DROP ZONE masthead
    // without sliding under the right prize-table HUD.
    lookAt([4.9,1.0,32.5],[3.0,0,0]));
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);drawCalls=0;
  gl.uniform1f(loc.premium,surfaceQuality==='premium'?1:0);
  gl.uniform3fv(loc.camera,LIGHT_CAMERA);
  // Baked *actual 3D* cabinet, pegged field, dividers and eight bucket slots.
  gl.uniformMatrix4fv(loc.model,false,identity());
  gl.uniformMatrix4fv(loc.mvp,false,vp);
  gl.uniform3fv(loc.tint,new Float32Array([1,1,1]));
  gl.uniform1f(loc.opacity,1);
  bindMesh(meshStatic);
  const p=s.ball;
  const probePoint=p?[xw(p.x),yw(p.y),1.43]:[xw(s.x),yw(35),1.43];
  const point=[...probePoint,1];
  const clip=[0,1,2,3].map(row=>
    vp[row]*point[0]+vp[4+row]*point[1]+vp[8+row]*point[2]+vp[12+row]);
  const probeX=clamp(Math.round((1+clip[0]/clip[3])*canvas.width/2),0,canvas.width-1);
  const probeY=clamp(Math.round((1+clip[1]/clip[3])*canvas.height/2),0,canvas.height-1);
  const beforePixel=new Uint8Array(4),afterPixel=new Uint8Array(4);
  if(frame===0)gl.readPixels(probeX,probeY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,beforePixel);
  drawMovingMesh(s,vp);
  if(frame===0){
    gl.readPixels(probeX,probeY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,afterPixel);
    geometryProbe={at:[probeX,probeY],before:[...beforePixel],
      after:[...afterPixel],error:gl.getError()};
  }
  setBackdrop(assets);updateBins(s,vp);
  MarblePartyUI.updateDropZone(s);
  updateHardwareOverlay();
  frame++;
  if(frame%120===0&&gl.getError()!==gl.NO_ERROR)return false;
  return true;
 }
 function debug(){return {api:gl?'WebGL':'none',realMeshes:!!meshMoving&&!!meshStatic,
  source:'DropZone.state.ball/pegs/gold/elapsed/x/jackpotBin',frame,drawCalls,
  singleCanvas:!!canvas&&canvas.parentElement?.querySelectorAll('canvas').length===1,
  labels:labels?.children.length||0,backdrop:!!backdropUrl,
  gpu:debugGPU,resolution:[canvas?.width||0,canvas?.height||0],
  originalRulesModified:false,geometryProbe,surfaceQuality,
  hardwareFpsSample:reviewFps,hardwareQaOverlayActive:!!reviewOverlay,
  materialAttributeFloats:VERTEX_STRIDE,
  meshTemplatesCached:!!meshTemplates,cameraTarget:[3.0,0,0],
  jackpotIndexSource:'DropZone.state.jackpotBin'};}
 function setSurfaceQuality(next){
  if(!gl||!['basic','premium'].includes(next))return false;
  surfaceQuality=next;return true;
 }
 return Object.freeze({mount,unmount,draw:render,debug,setSurfaceQuality,
   get canvas(){return canvas;},get active(){return !!gl&&!contextLost;}});
})();
