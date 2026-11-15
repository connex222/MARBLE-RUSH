/* BOWL BRAWL: THE CRUCIBLE — genuine GPU 3D development renderer.
 * Visual-only. The existing deterministic BowlBrawl engine owns all hazards,
 * motion, knockouts, scoring and phone actions. No second gameplay model.
 * One WebGL stage canvas; original Grand Prix is never touched.
 */
const MarbleBrawlWebGL = (() => {
 'use strict';
 const TAU=Math.PI*2, SCALE=1/35, R=380*SCALE, SEG=72;
 let canvas=null,gl=null,program=null,staticBuffer=null,dynamicBuffer=null,loc=null;
 let lost=false,graphicsError=null,resources=[],staticCount=0,dynamicCount=0,drawCalls=0;
 let frameCount=0,gpuLabel='',quality=1,lastRound=0,lastFrame=0,contextLostListener=null,contextRestoreListener=null;
 let broadcastFocus=0,broadcastTime=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const normal=(a,b,c)=>{const x=b[0]-a[0],y=b[1]-a[1],z=b[2]-a[2],
   u=c[0]-a[0],v=c[1]-a[1],w=c[2]-a[2],nx=y*w-z*v,ny=z*u-x*w,nz=x*v-y*u,d=Math.hypot(nx,ny,nz)||1;return [nx/d,ny/d,nz/d];};
 const rgb=s=>{if(!/^#[\da-f]{6}$/i.test(String(s)))return [.94,.70,.40];
   return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);};
 const material={
  floor:[.115,.175,.23], floor2:[.13,.205,.27], rim:[.42,.47,.50],
  brass:[.69,.45,.23], brassLit:[.92,.68,.34], black:[.055,.078,.108],
  cyan:[.15,.70,.76], amber:[1,.44,.16], danger:[.95,.18,.19],
  darkMetal:[.20,.26,.31], steel:[.39,.48,.53], ice:[.34,.61,.67]
 };
 const vtx=(out,p,n,c)=>out.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2]);
 const tri=(out,a,b,c,col)=>{const n=normal(a,b,c);vtx(out,a,n,col);vtx(out,b,n,col);vtx(out,c,n,col);};
 const quad=(out,a,b,c,d,col)=>{tri(out,a,b,c,col);tri(out,a,c,d,col);};
 const height=r=>-.65+1.78*Math.pow(r/R,3.45);
 function ring(out,inner,outer,y,color,seg=SEG){
   for(let i=0;i<seg;i++){const a=i*TAU/seg,b=(i+1)*TAU/seg;
     quad(out,[inner*Math.cos(b),y,inner*Math.sin(b)],[outer*Math.cos(b),y,outer*Math.sin(b)],
       [outer*Math.cos(a),y,outer*Math.sin(a)],[inner*Math.cos(a),y,inner*Math.sin(a)],color);}
 }
 function wall(out,r0,r1,y0,y1,color,seg=SEG){
   for(let i=0;i<seg;i++){const a=i*TAU/seg,b=(i+1)*TAU/seg;
     quad(out,[r0*Math.cos(a),y0,r0*Math.sin(a)],[r0*Math.cos(a),y1,r0*Math.sin(a)],
       [r0*Math.cos(b),y1,r0*Math.sin(b)],[r0*Math.cos(b),y0,r0*Math.sin(b)],color);
     quad(out,[r1*Math.cos(a),y1,r1*Math.sin(a)],[r1*Math.cos(a),y0,r1*Math.sin(a)],
       [r1*Math.cos(b),y0,r1*Math.sin(b)],[r1*Math.cos(b),y1,r1*Math.sin(b)],color);}
 }
 function box(out,x,y,z,wx,wy,wz,col){
   const a=[x-wx/2,y-wy/2,z-wz/2],b=[x+wx/2,y-wy/2,z-wz/2],
    c=[x+wx/2,y+wy/2,z-wz/2],d=[x-wx/2,y+wy/2,z-wz/2],
    e=[x-wx/2,y-wy/2,z+wz/2],f=[x+wx/2,y-wy/2,z+wz/2],
    g=[x+wx/2,y+wy/2,z+wz/2],h=[x-wx/2,y+wy/2,z+wz/2];
   // All six outward-facing normals. The initial mesh had its box face
   // winding inverted, making brushed-metal props render unnaturally dark.
   quad(out,a,d,c,b,col);quad(out,e,f,g,h,col);quad(out,d,h,g,c,col);
   quad(out,a,b,f,e,col);quad(out,b,c,g,f,col);quad(out,a,e,h,d,col);
 }
 // Rotated physical beam with its long dimension EXACTLY aligned to the
 // authoritative collision segment (centre to moving rotor end-cap).
 function beam(out,x1,z1,x2,z2,y1,y2,width,thickness,col){
   const dx=x2-x1,dz=z2-z1,dist=Math.hypot(dx,dz)||1;
   const nx=-dz/dist*width/2,nz=dx/dist*width/2;
   const A=[x1+nx,y1-thickness/2,z1+nz],B=[x2+nx,y2-thickness/2,z2+nz];
   const C=[x2-nx,y2-thickness/2,z2-nz],D=[x1-nx,y1-thickness/2,z1-nz];
   const E=[A[0],y1+thickness/2,A[2]],F=[B[0],y2+thickness/2,B[2]];
   const G=[C[0],y2+thickness/2,C[2]],H=[D[0],y1+thickness/2,D[2]];
   quad(out,E,F,G,H,col);quad(out,A,D,C,B,col);
   quad(out,A,B,F,E,col);quad(out,D,H,G,C,col);
   quad(out,A,E,H,D,col);quad(out,B,C,G,F,col);
 }
 function cylinder(out,x,y,z,r,h,col,seg=20){
   for(let i=0;i<seg;i++){const a=i*TAU/seg,b=(i+1)*TAU/seg,
      p=[x+r*Math.cos(a),y,z+r*Math.sin(a)],
      q=[x+r*Math.cos(b),y,z+r*Math.sin(b)],
      u=[p[0],y+h,p[2]],v=[q[0],y+h,q[2]];
      quad(out,p,u,v,q,col);tri(out,[x,y+h,z],v,u,col);}
 }
 function sphere(out,x,y,z,r,col,steps=12,sectors=18){
   for(let j=0;j<steps;j++){const a=-Math.PI/2+Math.PI*j/steps,b=-Math.PI/2+Math.PI*(j+1)/steps;
    for(let k=0;k<sectors;k++){const t=TAU*k/sectors,u=TAU*(k+1)/sectors;
     const p=(lat,lon)=>[x+r*Math.cos(lat)*Math.cos(lon),y+r*Math.sin(lat),z+r*Math.cos(lat)*Math.sin(lon)];
     const p0=p(a,t),p1=p(a,u),p2=p(b,u),p3=p(b,t);
     for(const part of [[p0,p1,p2],[p0,p2,p3]])for(const point of part){
       const n=[(point[0]-x)/r,(point[1]-y)/r,(point[2]-z)/r];vtx(out,point,n,col);
     }
    }
   }
 }
 function buildStatic(){
   const a=[];
   // Deep, faceted physically concave basin; every ring is real triangle geometry.
   for(let j=0;j<18;j++){const ra=R*j/18,rb=R*(j+1)/18;
    for(let i=0;i<SEG;i++){const th=TAU*i/SEG,ph=TAU*(i+1)/SEG;
      const p=(rad,ang)=>[rad*Math.cos(ang),height(rad),rad*Math.sin(ang)];
      const col=(j+i%2)%3===0?material.floor2:material.floor;
      quad(a,p(ra,ph),p(rb,ph),p(rb,th),p(ra,th),col);
    }
   }
   // Restrained precision-machined guide grooves follow the actual concave
   // surface. These are small physical triangles, not a printed background.
   for(const radius of [2.55,4.95,7.40,9.55,10.65])
     ring(a,radius,radius+.045,height(radius)+.044,material.darkMetal);
   // Understructure, chamfered brass rim, stadium protective steel collar.
   ring(a,R,R+1.30,.34,material.darkMetal);
   ring(a,R+.24,R+.39,1.08,material.brassLit);
   ring(a,R+.38,R+1.34,1.10,material.rim);
   ring(a,R+1.19,R+1.31,1.12,material.brass);
   wall(a,R+.3,R+1.34,-1.62,1.09,material.black);
   ring(a,R+.4,R+1.30,-1.60,material.steel);
   for(let i=0;i<18;i++){
     const theta=TAU*i/18,rr=R+.86,x=rr*Math.cos(theta),z=rr*Math.sin(theta);
     box(a,x,.79,z,.68,.21,.78,i%3===0?material.brass:material.darkMetal);
     // Controlled inset LED segments, not blinking carnival decoration.
     if(i%2===0)cylinder(a,x,.965,z,.105,.055,material.cyan,10);
   }
   // Backside structural superstructure adds scale without placing false
   // collision props inside the game. Keep the front open for spectator sightlines.
   for(let i=0;i<=12;i++){
     const ang=Math.PI+i*Math.PI/12,rad=R+2.35;
     const x=rad*Math.cos(ang),z=rad*Math.sin(ang);
     cylinder(a,x,-.55,z,.32,3.65,material.darkMetal,12);
     cylinder(a,x,3.02,z,.44,.22,material.brass,12);
     box(a,x,3.24,z,.88,.22,.68,material.steel);
     if(i%2===0)box(a,x,3.38,z,.56,.10,.30,material.amber);
   }
   // Engineered raised core is below all marble contact surfaces; decorative only.
   cylinder(a,0,-.45,0,1.13,.24,material.darkMetal,36);
   cylinder(a,0,-.18,0,.72,.08,material.brass,36);
   ring(a,1.1,1.28,-.19,material.cyan);
   staticCount=a.length/9;
   return new Float32Array(a);
 }
 function buildDynamic(s,reduce){
   const a=[],active=clamp(Number(s.radius)||380,110,380)*SCALE;
   const dangerous=(380-s.radius)>165;
   // 3D illuminated active survival boundary: shows authoritative physics radius.
   ring(a,Math.max(.18,active-.095),active+.095,height(Math.min(active,R))+.035,
     dangerous?material.danger:material.cyan);
   if(dangerous)ring(a,active+.16,active+.21,height(Math.min(R,active+.17))+.047,material.amber);
   // Shockwave telegraphing is state-driven; never invents a physical travelling hit.
   const inSec=s.pulseAt===null?Infinity:s.pulseAt-s.elapsed;
   if(inSec>=0&&inSec<=3){
     ring(a,1.25,1.38,-.20,inSec<1?material.amber:material.brassLit);
     for(let k=0;k<8;k++){const ang=k*TAU/8,rr=2.2;
       box(a,rr*Math.cos(ang),height(rr)+.10,rr*Math.sin(ang),.24,.15,.24,material.amber);}
   }
   if(s.time-s.lastPulseAt>=0&&s.time-s.lastPulseAt<.65){
      const rr=1.1+7.3*(s.time-s.lastPulseAt)/.65;
      ring(a,rr,rr+.15,height(rr)+.065,material.cyan);
   }
   if(s.hazard==='bumpers')for(const [x,z] of [[125,60],[-110,-50]]){
     const X=x*SCALE,Z=z*SCALE,y=height(Math.hypot(X,Z));
     // Visible diameter matches the engine's 45-unit obstacle + 22-unit
     // marble collision radius. Styling must not falsify danger distance.
     cylinder(a,X,y,Z,45*SCALE,.43,material.darkMetal,24);
     cylinder(a,X,y+.39,Z,42*SCALE,.18,material.brassLit,24);
     sphere(a,X,y+.62,Z,.41,material.steel,9,14);
   }
   if(s.hazard==='ice'){
     const x=75*SCALE,z=-35*SCALE;
     for(let j=0;j<9;j++){const p=j*TAU/9,q=(j+1)*TAU/9,r=140*SCALE;
       const pc=[x,height(Math.hypot(x,z))+.065,z];
       // Counter-clockwise top face: normal points towards arena lights.
       tri(a,pc,[x+Math.cos(q)*r,height(Math.hypot(x+Math.cos(q)*r,z+Math.sin(q)*r))+.05,z+Math.sin(q)*r],
         [x+Math.cos(p)*r,height(Math.hypot(x+Math.cos(p)*r,z+Math.sin(p)*r))+.05,z+Math.sin(p)*r],material.ice);}
   }
   if(s.hazard==='rotor'){
     const length=(Number(s.rotorLength)||95)*SCALE;
     const width=(Number(s.rotorHalfWidth)||18)*2*SCALE;
     const X=Math.cos(s.hazardAngle)*length,Z=Math.sin(s.hazardAngle)*length;
     const y=height(length);
     // STRIKER ARM: real continuous swept capsule collider, not decorative.
     // The black-metal spine and narrow amber centre-line make its danger
     // obvious on a distant television, without over-saturated neon.
     beam(a,0,0,X,Z,height(0)+.63,y+.63,width,.43,material.darkMetal);
     beam(a,0,0,X,Z,height(0)+.91,y+.91,width*.20,.14,material.brassLit);
     cylinder(a,0,height(0)+.35,0,.78,.58,material.steel,24);
     // Engine end-cap uses physical 45/35 radius; the existing 67-unit
     // collision threshold includes the 22-unit marble radius.
     cylinder(a,X,y,Z,45*SCALE,.46,material.brass,24);
     cylinder(a,X,y+.44,Z,36*SCALE,.22,material.amber,24);
     cylinder(a,X,y+.62,Z,28*SCALE,.10,material.steel,24);
   }
   if(s.hazard==='crumbling'){
     for(let i=0;i<24;i++){const ang=i*TAU/24,rr=active+.05,
       col=i%3===0?material.amber:material.danger;
       box(a,rr*Math.cos(ang),height(rr)+.13,rr*Math.sin(ang),.35,.19,.35,col);}
   }
   const roster=new Map((s.roster||[]).map(p=>[p.id,p]));
   for(const m of s.marbles||[]){
     if(!m.alive)continue;
     const x=m.x*SCALE,z=m.y*SCALE,r=Math.hypot(x,z);
     const y=height(r)+.66,color=rgb(roster.get(m.id)?.color||'#FFD23F');
     // Contact occlusion gives the heavy glass marble real ground presence.
     ringAt(a,x,z,.08,.91,height(r)+.037,material.black);
     sphere(a,x,y,z,.62,color,14,22);
     // Player-colour identification stays clear without neon screen clutter.
     ringAt(a,x,z,.66,.82,height(r)+.087,color);
     if(m.anchored>0)ringAt(a,x,z,.9,1.00,height(r)+.09,material.cyan);
     if(m.edgeHanging)ringAt(a,x,z,1.05,1.2,height(r)+.09,material.danger);
     if(m.ramWindow>0)ringAt(a,x,z,.94,1.08,height(r)+.10,material.amber);
   }
   if(!reduce)for(const e of (s.events||[]).slice(-25)){
     const age=s.time-e.time;if(!(age>=0&&age<.4))continue;
     if(!['hit','hazardImpact','out','recover','knockout'].includes(e.kind))continue;
     const x=Number(e.x)*SCALE,z=Number(e.y)*SCALE;
     if(!Number.isFinite(x)||!Number.isFinite(z))continue;
     const rr=.3+age*1.6;
     ringAt(a,x,z,rr,rr+.11,height(Math.hypot(x,z))+.13,
       e.kind==='out'||e.kind==='knockout'?material.danger:material.brassLit);
   }
   dynamicCount=a.length/9;
   return new Float32Array(a);
 }
 function ringAt(out,x,z,inner,outer,y,col){
   for(let i=0;i<20;i++){const p=i*TAU/20,q=(i+1)*TAU/20;
     quad(out,[x+inner*Math.cos(q),y,z+inner*Math.sin(q)],
       [x+outer*Math.cos(q),y,z+outer*Math.sin(q)],
       [x+outer*Math.cos(p),y,z+outer*Math.sin(p)],
       [x+inner*Math.cos(p),y,z+inner*Math.sin(p)],col);}
 }
 function compile(type,source){
   const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);resources.push(['shader',sh]);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Brawl WebGL shader: '+gl.getShaderInfoLog(sh));
   return sh;
 }
 function setup(){
   resources=[];const vs=compile(gl.VERTEX_SHADER,
     'precision mediump float;attribute vec3 a_pos;attribute vec3 a_normal;attribute vec3 a_color;'+
     'uniform vec3 u_eye,u_forward,u_right,u_up;uniform float u_aspect,u_focal,u_shift;'+
     'varying vec3 v_n,v_c,v_world;void main(){'+
     'vec3 d=a_pos-u_eye;float z=max(.05,dot(d,u_forward));'+
     'vec2 xy=vec2(dot(d,u_right),dot(d,u_up));'+
     'float clipz=1.0126*z-1.0063;'+
     'gl_Position=vec4(xy.x*u_focal/u_aspect,xy.y*u_focal-u_shift*z,clipz,z);'+
     'v_n=a_normal;v_c=a_color;v_world=a_pos;}');
   const fs=compile(gl.FRAGMENT_SHADER,
     'precision mediump float;varying vec3 v_n,v_c,v_world;uniform vec3 u_eye;'+
     'void main(){vec3 n=normalize(v_n);vec3 l=normalize(vec3(-.45,.9,.57));'+
     'float nd=max(0.,dot(n,l));vec3 view=normalize(u_eye-v_world);'+
     'vec3 h=normalize(l+view);float spec=pow(max(0.,dot(n,h)),42.)*.34;'+
     'float rim=pow(1.-abs(dot(n,view)),3.);'+
     'vec3 skylight=vec3(.18,.29,.37)*max(0.,dot(n,normalize(vec3(.54,.28,-.60))));'+
     'vec3 lit=v_c*(.36+nd*.75)+skylight*.30+vec3(spec)+v_c*rim*.22;'+
     'gl_FragColor=vec4(min(vec3(1.),lit),1.);}');
   program=gl.createProgram();resources.push(['program',program]);
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Brawl link: '+gl.getProgramInfoLog(program));
   loc={};
   for(const x of ['a_pos','a_normal','a_color'])loc[x]=gl.getAttribLocation(program,x);
   for(const x of ['u_eye','u_forward','u_right','u_up','u_aspect','u_focal','u_shift'])
     loc[x]=gl.getUniformLocation(program,x);
   staticBuffer=gl.createBuffer();dynamicBuffer=gl.createBuffer();
   resources.push(['buffer',staticBuffer],['buffer',dynamicBuffer]);
   gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);
   gl.bufferData(gl.ARRAY_BUFFER,buildStatic(),gl.STATIC_DRAW);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.clearColor(.034,.054,.080,1);
 }
 function bind(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const stride=9*4;
    for(const [key,offset] of [['a_pos',0],['a_normal',3],['a_color',6]]){
      gl.enableVertexAttribArray(loc[key]);gl.vertexAttribPointer(loc[key],3,gl.FLOAT,false,stride,offset*4);}
 }
 function resetCanvas(){
   if(!canvas)return;
   const next=canvas.cloneNode(false);
   next.removeAttribute('data-graphics');next.removeAttribute('data-renderer-error');
   canvas.replaceWith(next);
 }
 function release(){
   if(!gl)return;
   if(!lost)for(const [kind,obj] of resources){
     try{if(kind==='buffer')gl.deleteBuffer(obj);else if(kind==='program')gl.deleteProgram(obj);
       else if(kind==='shader')gl.deleteShader(obj);}catch(_){}}
   resources=[];staticBuffer=null;dynamicBuffer=null;program=null;gl=null;
 }
 function unmount(){
   if(!canvas)return;
   if(contextLostListener)canvas.removeEventListener('webglcontextlost',contextLostListener);
   if(contextRestoreListener)canvas.removeEventListener('webglcontextrestored',contextRestoreListener);
   release();resetCanvas();canvas=null;lost=false;
   contextLostListener=null;contextRestoreListener=null;
 }
 function mount(old){
   if(!old||old.id!=='partyStageCanvas')throw Error('Brawl requires the single Party Pack stage');
   if(canvas)unmount();
   canvas=old.cloneNode(false);old.replaceWith(canvas);
   try{
     gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false});
     if(!gl)throw Error('WebGL unavailable');
     const info=gl.getExtension('WEBGL_debug_renderer_info');
     gpuLabel=String(info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER));
     // Native 1080p on a real GPU: blurry sub-native output is unacceptable
     // for the AAA target. Software rendering retains its safety tier.
     quality=/swiftshader|llvmpipe|software/i.test(gpuLabel)?.55:1;
     canvas.width=Math.floor(1920*quality);canvas.height=Math.floor(1080*quality);
     contextLostListener=e=>{e.preventDefault();lost=true;};
     contextRestoreListener=()=>{lost=false;try{setup();}catch(e){graphicsError=e.message;lost=true;}};
     canvas.addEventListener('webglcontextlost',contextLostListener);
     canvas.addEventListener('webglcontextrestored',contextRestoreListener);
     setup();lastFrame=0;lastRound=0;frameCount=0;graphicsError=null;
     broadcastFocus=0;broadcastTime=0;
     canvas.dataset.graphics='brawl-webgl-real-3d';return true;
   }catch(error){graphicsError=String(error.message||error);unmount();throw error;}
 }
 function draw(s,assets,options={}){
   if(!gl||lost||!s||!Array.isArray(s.marbles)||!s.roster)return false;
   const start=performance.now();
   if(s.round!==lastRound){lastRound=s.round;lastFrame=0;broadcastFocus=0;}
   // Controlled broadcast push-in for the final duel; the complete engineered
   // bowl stays on screen. Motion reduction keeps the camera wholly static.
   const alive=s.marbles.filter(m=>m.alive).length;
   const danger=clamp((380-s.radius)/270,0,1);
   const target=options.reduce?0:clamp(danger*.33+(alive===2?.42:0),0,.77);
   const now=performance.now(),dt=broadcastTime?clamp((now-broadcastTime)/1000,0,.06):0;
   broadcastTime=now;
   broadcastFocus=options.reduce?0:broadcastFocus+(target-broadcastFocus)*(1-Math.exp(-1.8*dt));
   const eye=[0,17.3-.65*broadcastFocus,25.5-1.40*broadcastFocus],len=Math.hypot(...eye);
   const f=[-eye[0]/len,-eye[1]/len,-eye[2]/len],right=[1,0,0],
     up=[0,eye[2]/len,-eye[1]/len];
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(program);
   gl.uniform3fv(loc.u_eye,eye);gl.uniform3fv(loc.u_forward,f);
   gl.uniform3fv(loc.u_right,right);gl.uniform3fv(loc.u_up,up);
   gl.uniform1f(loc.u_aspect,canvas.width/canvas.height);
   gl.uniform1f(loc.u_focal,1.88+.12*broadcastFocus);gl.uniform1f(loc.u_shift,.15);
   bind(staticBuffer);gl.drawArrays(gl.TRIANGLES,0,staticCount);
   const dynamic=buildDynamic(s,!!options.reduce);
   gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);
   gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);
   bind(dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,dynamicCount);
   drawCalls=2;frameCount++;lastFrame=performance.now()-start;
   MarbleBrawlUI.updateHud(s);
   // A synchronous GPU error readback every frame can stall a living-room TV.
   return (frameCount%64)!==0 || gl.getError()===gl.NO_ERROR;
 }
 function debug(){return Object.freeze({realMeshes:!!program&&!lost,active:!!gl&&!lost,
   renderer:'brawl-the-crucible-native-webgl-v1',gpu:gpuLabel,
   width:canvas?.width||0,height:canvas?.height||0,quality,
   drawCalls,staticTriangles:staticCount/3,dynamicTriangles:dynamicCount/3,
   frames:frameCount,lastDrawMs:lastFrame,cameraPush:broadcastFocus,
   contextLost:lost,error:graphicsError});}
 return Object.freeze({mount,unmount,draw,debug,
   get active(){return !!gl&&!lost;},get canvas(){return canvas;}});
})();
