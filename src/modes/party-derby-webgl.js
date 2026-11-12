/*
 * MARBLE RUSH — opt-in native WebGL Derby pilot.
 * Actual 3D meshes, a perspective view/projection, depth testing, per-marble
 * roll, physics-driven motion and GPU lighting. No CSS "3D" overlay and no
 * second canvas. Activated only by /tv?derby3d=1, on a review branch.
 * The authoritative Derby engine, betting, audio and phone HUD are untouched.
 */
const MarbleDerbyWebGL=(()=>{
  'use strict';
  const LENGTH=1500, LANES=6, TAU=Math.PI*2;
  let canvas=null,gl=null,program=null,meshBox=null,meshSphere=null,meshPlane=null,meshStatic=null;
  let locations=null,lost=false,drawCalls=0,frameCount=0;
  let cameraX=0,cameraDistance=42,cameraLast=0,cameraSpread=0;
  let qualityScale=1,gpuLabel='unknown',slowFrames=0,fastFrames=0;
  let runnerTags=null;
  let round=0,textureCache=new Map(),resourceList=[],contextLostListener=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ident=()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  const translate=(x,y,z)=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
  const scale=(x,y,z)=>new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
  function multiply(a,b){
    const r=new Float32Array(16);
    for(let col=0;col<4;col++)for(let row=0;row<4;row++){
      let s=0;for(let k=0;k<4;k++)s+=a[k*4+row]*b[col*4+k];
      r[col*4+row]=s;
    }
    return r;
  }
  function turnZ(a){
    const c=Math.cos(a),s=Math.sin(a);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
  }
  function perspective(fov,aspect,near,far){
    const f=1/Math.tan(fov/2),r=new Float32Array(16);
    r[0]=f/aspect;r[5]=f;r[10]=(far+near)/(near-far);
    r[11]=-1;r[14]=(2*far*near)/(near-far);return r;
  }
  function lookAt(eye,target){
    let [zx,zy,zz]=eye.map((v,i)=>v-target[i]);
    let len=Math.hypot(zx,zy,zz)||1;zx/=len;zy/=len;zz/=len;
    let xx=zz,xz=-zx,xy=0;len=Math.hypot(xx,xz)||1;xx/=len;xz/=len;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    return new Float32Array([
      xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
      -(xx*eye[0]+xy*eye[1]+xz*eye[2]),
      -(yx*eye[0]+yy*eye[1]+yz*eye[2]),
      -(zx*eye[0]+zy*eye[1]+zz*eye[2]),1
    ]);
  }
  function geometry(vertices,indices){
    const v=gl.createBuffer(),i=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,v);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    resourceList.push({kind:'buffer',object:v},{kind:'buffer',object:i});
    return {vertex:v,index:i,count:indices.length};
  }
  function boxGeometry(){
    const vertices=[],indices=[];
    const faces=[
      {n:[0,1,0],p:[[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]]},
      {n:[0,-1,0],p:[[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]]},
      {n:[0,0,1],p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]},
      {n:[0,0,-1],p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]},
      {n:[1,0,0],p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]},
      {n:[-1,0,0],p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]}
    ];
    for(const face of faces){
      const start=vertices.length/8;
      for(let k=0;k<4;k++)vertices.push(...face.p[k],...face.n,...[[0,0],[1,0],[1,1],[0,1]][k]);
      indices.push(start,start+1,start+2,start,start+2,start+3);
    }
    const mesh=geometry(vertices,indices);
    mesh.rawVertices=vertices;mesh.rawIndices=indices;
    return mesh;
  }
  function sphereGeometry(){
    const v=[],ind=[],rows=14,cols=22;
    for(let i=0;i<=rows;i++){
      const phi=Math.PI*i/rows;
      for(let j=0;j<=cols;j++){
        const theta=TAU*j/cols;
        const x=Math.sin(phi)*Math.cos(theta),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(theta);
        v.push(x,y,z,x,y,z,j/cols,1-i/rows);
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const a=i*(cols+1)+j,b=a+cols+1;
      ind.push(a,b,a+1,b,b+1,a+1);
    }
    return geometry(v,ind);
  }
  function planeGeometry(){
    return geometry([-1,-1,0, 0,0,1, 0,1, 1,-1,0, 0,0,1, 1,1,
      1,1,0, 0,0,1, 1,0, -1,1,0, 0,0,1, 0,0],[0,1,2,0,2,3]);
  }
  const VS=[
    'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV;',
    'attribute vec3 aVertexColor;',
    'uniform mat4 uMVP; uniform mat4 uModel;',
    'varying vec3 vNormal; varying vec2 vUV; varying vec3 vWorld;',
    'varying vec3 vVertexColor;',
    'void main(){vVertexColor=aVertexColor;vNormal=normalize(mat3(uModel)*aNormal);vUV=aUV;',
    'vWorld=(uModel*vec4(aPosition,1.0)).xyz;',
    'gl_Position=uMVP*vec4(aPosition,1.0);}'
  ].join('\n');
  const FS=[
    'precision mediump float;',
    'varying vec3 vNormal; varying vec2 vUV; varying vec3 vWorld;',
    'varying vec3 vVertexColor;',
    'uniform float uUseVertexColor; uniform float uUnlit;',
    'uniform vec3 uColor; uniform sampler2D uTexture;',
    'uniform float uTextured; uniform float uPattern; uniform float uOpacity;',
    'void main(){',
    'vec4 ink=vec4(uColor,1.0);',
    'if(uTextured>0.5){ink=texture2D(uTexture,vUV);',
    'if(uPattern<1.5){ink.rgb*=uColor;}',
    'if(ink.a<0.12)discard;}',
    'ink.rgb*=mix(vec3(1.0),vVertexColor,clamp(uUseVertexColor,0.0,1.0));',
    'if(uUnlit>0.5){gl_FragColor=ink;return;}',
    'vec3 n=normalize(vNormal);',
    'float sun=max(dot(n,normalize(vec3(-0.37,0.87,0.52))),0.0);',
    'float fill=max(dot(n,normalize(vec3(0.62,0.19,-0.77))),0.0);',
    'float light=0.42+sun*0.51+fill*0.18;',
    'float shine=0.0;',
    'if(uPattern>0.5){',
    'shine=pow(max(dot(reflect(normalize(vec3(0.37,-0.87,-0.52)),n),',
    'normalize(vec3(0.15,0.66,0.74))),0.0),14.0);',
    'float stripe=sin(atan(n.z,n.x)*5.0+n.y*14.0+vWorld.x*0.7);',
    'ink.rgb=mix(ink.rgb,vec3(1.0,0.94,0.81),0.17*(0.5+0.5*stripe));',
    'shine*=2.6;light+=0.15;}',
    'gl_FragColor=vec4(ink.rgb*light+vec3(shine)*0.28,ink.a*uOpacity);}'
  ].join('\n');
  function shader(type,source){
    const sh=gl.createShader(type);
    gl.shaderSource(sh,source);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))
      throw Error('Derby WebGL shader: '+gl.getShaderInfoLog(sh));
    resourceList.push({kind:'shader',object:sh});return sh;
  }
  function setup(){
    resourceList=[];textureCache=new Map();
    const vs=shader(gl.VERTEX_SHADER,VS),fs=shader(gl.FRAGMENT_SHADER,FS);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
      throw Error('Derby WebGL program: '+gl.getProgramInfoLog(program));
    resourceList.push({kind:'program',object:program});
    gl.useProgram(program);
    locations={position:gl.getAttribLocation(program,'aPosition'),
      normal:gl.getAttribLocation(program,'aNormal'),
      uv:gl.getAttribLocation(program,'aUV'),
      vertexColor:gl.getAttribLocation(program,'aVertexColor'),
      useVertexColor:gl.getUniformLocation(program,'uUseVertexColor'),
      unlit:gl.getUniformLocation(program,'uUnlit'),
      mvp:gl.getUniformLocation(program,'uMVP'),
      model:gl.getUniformLocation(program,'uModel'),
      color:gl.getUniformLocation(program,'uColor'),
      tex:gl.getUniformLocation(program,'uTexture'),
      textured:gl.getUniformLocation(program,'uTextured'),
      pattern:gl.getUniformLocation(program,'uPattern'),
      opacity:gl.getUniformLocation(program,'uOpacity')};
    meshBox=boxGeometry();meshSphere=sphereGeometry();meshPlane=planeGeometry();
    meshStatic=createStaticTrack();
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.025,0.065,0.12,1);
    gl.activeTexture(gl.TEXTURE0);gl.uniform1i(locations.tex,0);
  }
  function mount(oldCanvas){
    if(!oldCanvas||oldCanvas.id!=='partyStageCanvas')throw Error('Derby WebGL needs the exclusive Party Pack canvas');
    if(gl)unmount();
    // DOM replacement is required: browsers cannot switch a Canvas2D context
    // to WebGL. The previous canvas is removed, NOT hidden under this renderer.
    canvas=oldCanvas.cloneNode(false);
    oldCanvas.replaceWith(canvas);
    gl=canvas.getContext('webgl2',{alpha:false,antialias:true})||
       canvas.getContext('webgl',{alpha:false,antialias:true});
    if(!gl){
      canvas.dataset.rendererError='WebGL unavailable';
      throw Error('Derby WebGL unavailable on this browser/GPU. Remove ?derby3d=1 to use normal Derby.');
    }
    lost=false;frameCount=0;drawCalls=0;round=0;cameraLast=0;cameraX=0;cameraDistance=42;
    const rendererExt=gl.getExtension('WEBGL_debug_renderer_info');
    gpuLabel=String(rendererExt?
      gl.getParameter(rendererExt.UNMASKED_RENDERER_WEBGL):
      gl.getParameter(gl.RENDERER));
    qualityScale=/swiftshader|llvmpipe|software/i.test(gpuLabel)?0.55:1;
    slowFrames=0;fastFrames=0;
    resizeQuality();
    createRunnerTags();
    contextLostListener=e=>{e.preventDefault();lost=true;};
    canvas.addEventListener('webglcontextlost',contextLostListener);
    canvas.addEventListener('webglcontextrestored',()=>{lost=false;setup();});
    setup();canvas.dataset.graphics='webgl-real-meshes';return true;
  }
  function unmount(){
    if(!canvas)return;
    if(gl){
      for(const t of textureCache.values())gl.deleteTexture(t);
      for(const r of resourceList){
        // WebGL2 is* methods reject objects of the wrong resource type.
        // Track types explicitly so a finished Derby can ALWAYS return
        // to Grand Prix, Party Night, or another Party Pack renderer.
        if(r.kind==='buffer')gl.deleteBuffer(r.object);
        else if(r.kind==='shader')gl.deleteShader(r.object);
        else if(r.kind==='program')gl.deleteProgram(r.object);
      }
    }
    if(runnerTags){runnerTags.remove();runnerTags=null;}
    // Restore a fresh, uninitialised canvas for the other four Canvas2D modes.
    const fresh=canvas.cloneNode(false);
    fresh.removeAttribute('data-graphics');fresh.removeAttribute('data-renderer-error');
    canvas.replaceWith(fresh);
    canvas=null;gl=null;program=null;meshBox=null;meshSphere=null;meshPlane=null;meshStatic=null;
    resourceList=[];textureCache.clear();lost=false;
  }
  function color(hex){
    if(typeof hex!=='string'||!/^#[0-9a-fA-F]{6}$/.test(hex))return [1,0.73,0.45];
    return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  }
  function texture(key,img){
    if(!img?.complete||!img.naturalWidth)return null;
    if(textureCache.has(key))return textureCache.get(key);
    const t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    textureCache.set(key,t);return t;
  }
  function paint(mesh,viewProjection,loc,size,tint,options={}){
    const t=translate(...loc),sc=scale(...size);
    const model=multiply(t,options.rotation?multiply(turnZ(options.rotation),sc):sc);
    const mvp=multiply(viewProjection,model);
    gl.uniformMatrix4fv(locations.mvp,false,mvp);
    gl.uniformMatrix4fv(locations.model,false,model);
    gl.uniform3fv(locations.color,color(tint));
    gl.uniform1f(locations.useVertexColor,0);
    gl.uniform1f(locations.unlit,options.unlit?1:0);
    gl.disableVertexAttribArray(locations.vertexColor);
    gl.uniform1f(locations.pattern,options.pattern?1:0);
    gl.uniform1f(locations.opacity,options.opacity==null?1:options.opacity);
    const tex=options.image?texture(options.key,options.image):null;
    gl.uniform1f(locations.textured,tex?1:0);
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
    gl.enableVertexAttribArray(locations.position);
    gl.enableVertexAttribArray(locations.normal);
    gl.enableVertexAttribArray(locations.uv);
    gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,32,0);
    gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,32,12);
    gl.vertexAttribPointer(locations.uv,2,gl.FLOAT,false,32,24);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);drawCalls++;
  }

  // The 3D arena has 100+ immutable cuboids. Bake all those *actual* 3D
  // triangles into ONE GPU buffer with per-vertex tint. This eliminates
  // >90 separate shader state switches/draws on software and low-end GPUs.
  // The six moving marbles still use their own mesh/model matrix every frame.
  function createStaticTrack(){
    const vertices=[],indices=[],baseV=meshBox.rawVertices,baseI=meshBox.rawIndices;
    function add(loc,size,hex){
      const rgb=color(hex),offset=vertices.length/11;
      for(let k=0;k<baseV.length;k+=8){
        vertices.push(loc[0]+baseV[k]*size[0],
          loc[1]+baseV[k+1]*size[1],loc[2]+baseV[k+2]*size[2],
          baseV[k+3],baseV[k+4],baseV[k+5],baseV[k+6],baseV[k+7],
          rgb[0],rgb[1],rgb[2]);
      }
      for(const index of baseI)indices.push(offset+index);
    }
    // Three physically raised layers give the stadium mass and silhouette,
    // with the approved soil surface inset on top of the lane geometry.
    add([0,-.77,0],[33.6,.78,15.1],'#493449');
    add([0,-.29,0],[33,.40,14.6],'#dfab64');
    add([0,-.03,0],[31.8,.16,13.2],'#3a3646');
    const runnerColours=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d'];
    for(let lane=0;lane<LANES;lane++){
      const z=-5.23+lane*2.09;
      add([0,.21,z-1.00],[31,.055,.06],'#fff0bd');
      add([-15.27,.33,z],[.20,.15,1.35],runnerColours[lane]);
      for(let square=0;square<4;square++){
        add([14.57,.35,z-.73+square*.46],[.26,.045,.43],
          (lane+square)%2?'#17243a':'#fff7dc');
      }
      for(let k=0;k<=5;k++)add([-14.65+k*5.86,.20,z],[.08,.04,.95],'#b5e6e7');
      add([-15,.27,z],[.09,.04,1.73],'#ffffff');
      add([15,.27,z],[.12,.04,1.73],lane%2?'#141c36':'#ffffff');
    }
    // Low profile front safety lip: no giant fence covering the contestants.
    for(const z of [-6.8,6.8])add([0,.40,z],[32,.24,.22],'#ffe5a3');
    for(let k=0;k<13;k++){
      const x=-15+k*2.5;
      add([x,.64,-7.0],[.13,.51,.14],'#9fd9d5');
      add([x,.57,7.0],[.12,.32,.12],'#f6c57d');
    }
    // Grandstand stays behind the six lanes, rather than swallowing the arena.
    for(let seat=0;seat<4;seat++)
      add([0,1.4+seat*.52,-9.8-seat*.62],[27,.32,.87],
        seat%2?'#6c4b5b':'#80676c');
    for(let k=0;k<5;k++){
      const x=-12+k*6;
      add([x,2.3,-12.0],[.20,4.2,.22],'#d2a76b');
      add([x,4.5,-12.0],[.55,.30,.55],'#ffe3a2');
    }
    // Finish gantry only; starting arch obstructed the TV's first heat.
    for(const z of [-7.3,7.3])
      add([15.7,1.95,z],[.22,3.9,.30],'#f3d48f');
    add([15.7,4.02,0],[.30,.29,15.2],'#f6dd99');
    if(vertices.length/11>65535)throw Error('Static track exceeds WebGL1 vertex-index limit');
    return geometry(vertices,indices);
  }
  function drawStaticTrack(viewProjection){
    gl.uniformMatrix4fv(locations.mvp,false,viewProjection);
    gl.uniformMatrix4fv(locations.model,false,ident());
    gl.uniform3fv(locations.color,new Float32Array([1,1,1]));
    gl.uniform1f(locations.pattern,0);
    gl.uniform1f(locations.opacity,1);
    gl.uniform1f(locations.textured,0);
    gl.uniform1f(locations.useVertexColor,1);
    gl.uniform1f(locations.unlit,0);
    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindBuffer(gl.ARRAY_BUFFER,meshStatic.vertex);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,meshStatic.index);
    for(const k of ['position','normal','uv','vertexColor'])
      gl.enableVertexAttribArray(locations[k]);
    gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,44,0);
    gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,44,12);
    gl.vertexAttribPointer(locations.uv,2,gl.FLOAT,false,44,24);
    gl.vertexAttribPointer(locations.vertexColor,3,gl.FLOAT,false,44,32);
    gl.drawElements(gl.TRIANGLES,meshStatic.count,gl.UNSIGNED_SHORT,0);
    drawCalls++;
  }


  function resizeQuality(){
    if(!canvas)return;
    canvas.width=Math.max(960,Math.round(1920*qualityScale/16)*16);
    canvas.height=Math.max(540,Math.round(1080*qualityScale/16)*16);
    // Always preserve 16:9 even when backing resolution changes.
    canvas.height=Math.round(canvas.width*9/16);
  }
  function adaptQuality(drawMs){
    if(!Number.isFinite(drawMs)||frameCount<5)return;
    if(drawMs>29){slowFrames++;fastFrames=0;}
    else if(drawMs<13){fastFrames++;slowFrames=0;}
    else{slowFrames=Math.max(0,slowFrames-1);fastFrames=0;}
    if(slowFrames>=7&&qualityScale>.51){
      qualityScale=Math.max(.5,Math.round((qualityScale-.12)*100)/100);
      resizeQuality();slowFrames=0;
    }else if(fastFrames>=180&&qualityScale<.99){
      qualityScale=Math.min(1,Math.round((qualityScale+.08)*100)/100);
      resizeQuality();fastFrames=0;
    }
  }
  function createRunnerTags(){
    const stage=canvas?.parentElement;
    if(!stage)return;
    runnerTags=document.createElement('div');
    runnerTags.id='ppDerby3dRunnerTags';
    runnerTags.setAttribute('aria-label','Live Derby runner positions');
    Object.assign(runnerTags.style,{
      position:'absolute',inset:'0',zIndex:'2',
      pointerEvents:'none',overflow:'hidden'
    });
    const names=['Rocket','Whirlwind','Comet','Gold Rush','Lightning','Lucky'];
    for(let i=0;i<LANES;i++){
      const tag=document.createElement('span');
      tag.dataset.runner=String(i);
      tag.textContent=names[i];
      Object.assign(tag.style,{
        position:'absolute',left:'50%',top:'50%',
        transform:'translate(-50%,-140%)',
        font:'900 clamp(11px, .9vw, 17px) Nunito, sans-serif',
        color:'#fffaf0',textShadow:'0 2px 4px #000',
        whiteSpace:'nowrap',padding:'3px 9px',
        borderRadius:'9px',background:'rgba(11,21,43,.84)',
        border:'1px solid rgba(255,255,255,.75)',
        boxShadow:'0 3px 7px #0008'
      });
      runnerTags.appendChild(tag);
    }
    stage.appendChild(runnerTags);
  }
  function updateRunnerTags(s,viewProjection){
    if(!runnerTags)return;
    const sorted=s.horses.slice().sort((a,b)=>
      (Number(b.x)||0)-(Number(a.x)||0)||a.id-b.id);
    const places=new Map(sorted.map((h,i)=>[h.id,i+1]));
    for(const h of s.horses){
      const el=runnerTags.children[h.id];
      if(!el)continue;
      const x=-15+clamp(Number(h.x)||0,0,LENGTH)/LENGTH*30,
        z=-5.23+h.id*2.09;
      const px=viewProjection[0]*x+viewProjection[4]*1.8+
        viewProjection[8]*z+viewProjection[12];
      const py=viewProjection[1]*x+viewProjection[5]*1.8+
        viewProjection[9]*z+viewProjection[13];
      const pw=viewProjection[3]*x+viewProjection[7]*1.8+
        viewProjection[11]*z+viewProjection[15];
      const screenX=(.5+.5*px/pw)*100,screenY=(.5-.5*py/pw)*100;
      const visible=pw>0&&screenX>18&&screenX<96&&
        screenY>24&&screenY<76;
      el.hidden=!visible;
      if(!visible)continue;
      el.style.left=screenX.toFixed(2)+'%';
      el.style.top=screenY.toFixed(2)+'%';
      el.style.borderColor=h.color||'#fff7cc';
      const label=h.name+' · '+places.get(h.id);
      if(el.textContent!==label)el.textContent=label;
    }
  }

  function draw(s,assets,options={}){
    if(!gl||lost||!s||!Array.isArray(s.horses)||s.horses.length!==LANES)return false;
    const positions=s.horses.map(h=>clamp(Number(h.x)||0,0,LENGTH));
    const lo=Math.min(...positions),hi=Math.max(...positions);
    const spread=hi-lo;cameraSpread=spread;
    // Fair broadcast framing: never chase the leader off the TV-safe track.
    // We only nudge centre toward the pack; all six marbles remain in shot.
    const desiredX=clamp(((hi+lo)/(2*LENGTH)*30-15)*.18,-2.8,2.8);
    const wide=clamp((spread-130)/620,0,1);
    const desiredDistance=38+wide*13;
    const now=performance.now(),dt=clamp((now-cameraLast)/1000,0,.05);
    cameraLast=now;
    const ease=1-Math.exp(-2.1*dt);
    if(options.reduce){cameraX=0;cameraDistance=54;}
    else{
      cameraX+=(desiredX-cameraX)*ease;
      cameraDistance+=(desiredDistance-cameraDistance)*ease;
    }
    if(s.round!==round){round=s.round;cameraDistance=options.reduce?54:43;}
    const view=lookAt([cameraX+1.2,cameraDistance*.61,cameraDistance*.90],[cameraX,0,0]);
    const proj=perspective(50*Math.PI/180,canvas.width/canvas.height,.5,175);
    const vp=multiply(proj,view);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);drawCalls=0;
    // Approved 3D racing artwork is the atmosphere, not a competing game
    // screen. It is textured INSIDE this same GPU backbuffer before the live
    // camera-projected track, so no old interface exists underneath.
    if(assets?.pp_derby_bg?.complete&&assets.pp_derby_bg.naturalWidth){
      gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
      paint(meshPlane,ident(),[0,0,0],[1,1,1],'#c8c5d8',{
        key:'pp_derby_bg',image:assets.pp_derby_bg,unlit:true});
      gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
    }
    // One pre-baked world-space 3D arena draw, six live textured lane tops.
    drawStaticTrack(vp);
    for(let lane=0;lane<LANES;lane++){
      const z=-5.23+lane*2.09;
      paint(meshBox,vp,[0,.12,z],[30.5,.12,1.9],lane%2?'#e0c39d':'#f4dcaa',{
        key:'pp_derby_surface_main',image:assets?.pp_derby_surface_main});
    }
    // Approved approved-stage props are physically positioned in 3D space.
    if(assets?.pp_derby_prop_grandstand)
      paint(meshPlane,vp,[6.5,2.1,-12.2],[3.7,1.5,1],'#ffffff',{
        key:'pp_derby_prop_grandstand',image:assets.pp_derby_prop_grandstand,opacity:.92});
    if(assets?.pp_derby_prop_hay_bales)
      paint(meshPlane,vp,[10.4,1.1,8.9],[1.3,0.9,1],'#ffffff',{
        key:'pp_derby_prop_hay_bales',image:assets.pp_derby_prop_hay_bales,opacity:.92});
    // Every marble is an actual triangulated sphere at the authoritative x.
    for(const h of s.horses){
      const x=-15+positions[h.id]/LENGTH*30,z=-5.23+h.id*2.09;
      const rolling=s.phase==='racing'?(Number(h.x)||0)/42:0;
      paint(meshSphere,vp,[x,.75,z],[.62,.62,.62],h.color,{
        rotation:rolling,pattern:true,key:'marble_swirl_'+String(h.id+1).padStart(2,'0'),
        image:assets?.['marble_swirl_'+String(h.id+1).padStart(2,'0')]});
      paint(meshBox,vp,[x,-.01,z],[.74,.028,.74],'#152b38',{opacity:.44});
    }
    frameCount++;
    updateRunnerTags(s,vp);
    MarblePartyUI.updateDerby(s,options.selectedHorse||0);
    const label=document.getElementById('ppBoardLabel');
    if(label){
      const leader=s.horses.reduce((a,b)=>Number(b.x)>Number(a.x)?b:a);
      label.textContent=s.phase==='betting'?'SIX REAL 3D LANES · BET BEFORE THE GATE OPENS':
        s.phase==='racing'?'LIVE LEADER · '+leader.name.toUpperCase()+' · '+Math.round(leader.x/LENGTH*100)+'%':
        s.phase==='results'?'OFFICIAL WINNER · '+(s.horses[s.lastWinner]?.name||'PENDING').toUpperCase():
        'FIVE-HEAT DERBY COMPLETE';
    }
    // GPU errors are sampled occasionally; synchronously querying after
    // every draw stalls slower WebGL implementations.
    if(frameCount%120===0&&gl.getError()!==gl.NO_ERROR)return false;
    // Adaptive backing resolution only changes the single WebGL canvas.
    // TV DOM text remains full-resolution; never claim this equals monitor FPS.
    adaptQuality(performance.now()-now);
    return true;
  }
  function debug(){return {api:gl?'WebGL':'unmounted',realMeshes:!!meshSphere&&!!meshBox,
    singleCanvas:!!canvas&&canvas.parentElement?.querySelectorAll('canvas').length===1,
    frameCount,drawCalls,cameraX,cameraDistance,cameraSpread,contextLost:lost,
    qualityScale,backingPixels:[canvas?.width||0,canvas?.height||0],gpuLabel,
    runnerTagCount:runnerTags?.children?.length||0,
    textureCount:textureCache.size,positionsSource:'MarbleDerby.state.horses[*].x'};}
  return Object.freeze({mount,unmount,draw,debug,
    get active(){return !!gl&&!lost;},get canvas(){return canvas;}});
})();