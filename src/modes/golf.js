/* MARBLE RUSH — Phase 7: Marble Golf.
 * Five miniature tabletop holes; stroke-play, 1–8 racers, TV-authoritative
 * fixed-step physics, phone shot controls, deterministic CPU opponents.
 * No DOM or network dependencies in the rules engine.
 */
const MarbleGolf = (() => {
  'use strict';
  const HOLES = 5, MAX_STROKES = 7, W = 1240, H = 580, R = 19;
  const COLORS = ['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const randFrom = seed => { let s = seed >>> 0; return () => ((s = (Math.imul(s,1664525) + 1013904223) >>> 0) / 4294967296); };
  const LAYOUTS = Object.freeze([
    {name:'The Warm-Up',par:2,cup:[1090,290],start:[115,290],walls:[],water:[],bumpers:[[600,180,40],[600,400,40]]},
    {name:'The Zig-Zag',par:3,cup:[1090,205],start:[115,380],walls:[[465,0,36,340],[805,240,36,340]],water:[],bumpers:[]},
    {name:'Splashdown',par:3,cup:[1080,290],start:[120,290],walls:[],water:[[490,160,250,260]],bumpers:[[390,295,33],[880,290,35]]},
    {name:'Pinball Palace',par:3,cup:[1100,305],start:[110,305],walls:[[610,130,30,310]],water:[],bumpers:[[375,200,49],[425,425,45],[850,180,47],[900,435,43]]},
    {name:'The Final Putt',par:4,cup:[1090,120],start:[110,480],walls:[[450,0,30,360],[760,220,30,360]],water:[[480,410,230,80]],bumpers:[[940,310,51]]}
  ]);
  function create(players,seed=1,onFinish=()=>{}) {
    if (!Array.isArray(players)||players.length<1||players.length>8||
        players.some(p=>!p||typeof p.id!=='string'||!p.id)||
        new Set(players.map(p=>p.id)).size!==players.length) throw Error('Golf needs 1–8 unique players');
    if(!Number.isInteger(seed)) throw Error('Invalid seed');
    const random = randFrom(seed);
    const roster = players.map((p,i)=>({
      id:p.id,name:String(p.name||'Player '+(i+1)).slice(0,16),
      cpu:!!p.cpu,color:typeof p.color==='string'?p.color:COLORS[i],
      strokes:0,holeScores:[],wins:0
    }));
    const state={seed,roster,hole:0,turn:0,phase:'aim',angle:0,power:60,
      ball:null,strokes:0,shotFrom:null,clock:0,elapsed:0,acc:0,done:false,
      finishedCalled:false,events:[],history:[],cpuDelay:0,layout:null};
    const player = id=>roster.find(p=>p.id===id);
    const current = ()=>roster[state.turn]||null;
    function standings() {
      return roster.slice().sort((a,b)=>a.strokes-b.strokes||b.wins-a.wins||roster.indexOf(a)-roster.indexOf(b));
    }
    function resetBall() {
      state.ball={x:state.layout.start[0],y:state.layout.start[1],vx:0,vy:0};
      state.strokes=0;state.angle=0;state.power=60;state.phase='aim';
      state.clock=0;state.cpuDelay=.5;
    }
    function newHole() {
      state.hole++;state.turn=0;state.layout=LAYOUTS[state.hole-1];resetBall();
      state.events.push({kind:'hole_start',hole:state.hole});
    }
    function finish() {
      if(state.done)return;
      state.done=true;state.phase='finished';
      if(!state.finishedCalled){state.finishedCalled=true;onFinish(standings());}
    }
    function endTurn(sunk) {
      const p=current();
      const score=state.strokes;
      p.strokes+=score;p.holeScores.push(score);
      state.events.push({kind:sunk?'cup':'stroke_limit',id:p.id,hole:state.hole,strokes:score});
      state.turn++;
      if(state.turn>=roster.length) {
        const ranking=roster.slice().sort((a,b)=>a.holeScores.at(-1)-b.holeScores.at(-1)||roster.indexOf(a)-roster.indexOf(b));
        const best=ranking[0].holeScores.at(-1);
        for(const r of ranking)if(r.holeScores.at(-1)===best)r.wins++;
        state.history.push({hole:state.hole,scores:roster.map(r=>({id:r.id,strokes:r.holeScores.at(-1)}))});
        state.phase='results';state.clock=0;
      } else resetBall();
    }
    function action(id,kind,value) {
      if(state.done||state.phase!=='aim'||current()?.id!==id)return false;
      if(kind==='left'||kind==='right') {
        if(value!==undefined&&(!Number.isInteger(value)||value<1||value>5))return false;
        state.angle=clamp(state.angle+(kind==='left'?-1:1)*3*(value||1),-78,78);return true;
      }
      if(kind==='aim') {
        if(!Number.isFinite(value)||value< -78||value>78)return false;
        state.angle=value;return true;
      }
      if(kind==='powerup'||kind==='powerdown') {
        state.power=clamp(state.power+(kind==='powerup'?5:-5),15,100);return true;
      }
      if(kind==='power') {
        if(!Number.isFinite(value)||value<15||value>100)return false;
        state.power=value;return true;
      }
      if(kind==='shoot') {
        state.shotFrom={x:state.ball.x,y:state.ball.y};
        const theta=state.angle*Math.PI/180, speed=240+state.power*8.5;
        state.ball.vx=Math.cos(theta)*speed;
        state.ball.vy=Math.sin(theta)*speed;
        state.strokes++;state.phase='rolling';state.clock=0;
        state.events.push({kind:'shot',id,angle:state.angle,power:state.power,hole:state.hole});
        return true;
      }
      return false;
    }
    function intersects(x,y,rect) {
      return x>=rect[0]-R&&x<=rect[0]+rect[2]+R&&y>=rect[1]-R&&y<=rect[1]+rect[3]+R;
    }
    function ricochetCircle(b,obs) {
      let dx=b.x-obs[0],dy=b.y-obs[1],d=Math.hypot(dx,dy),rr=R+obs[2];
      if(d>=rr)return;
      if(d<.001){dx=1;dy=0;d=1;}
      const nx=dx/d,ny=dy/d;
      b.x=obs[0]+nx*rr;b.y=obs[1]+ny*rr;
      const dot=b.vx*nx+b.vy*ny;
      if(dot<0){b.vx-=1.65*dot*nx;b.vy-=1.65*dot*ny;}
    }
    function ricochetRect(b,rect) {
      if(!intersects(b.x,b.y,rect))return;
      const [x,y,w,h]=rect;
      const nearestX=clamp(b.x,x,x+w),nearestY=clamp(b.y,y,y+h);
      let dx=b.x-nearestX,dy=b.y-nearestY,d=Math.hypot(dx,dy);
      if(d<.001) {
        const edges=[{v:Math.abs(b.x-x),nx:-1,ny:0,px:x-R,py:b.y},
          {v:Math.abs(b.x-(x+w)),nx:1,ny:0,px:x+w+R,py:b.y},
          {v:Math.abs(b.y-y),nx:0,ny:-1,px:b.x,py:y-R},
          {v:Math.abs(b.y-(y+h)),nx:0,ny:1,px:b.x,py:y+h+R}].sort((a,c)=>a.v-c.v)[0];
        b.x=edges.px;b.y=edges.py;
        const dot=b.vx*edges.nx+b.vy*edges.ny;
        if(dot<0){b.vx-=1.5*dot*edges.nx;b.vy-=1.5*dot*edges.ny;}
      } else if(d<R){
        const nx=dx/d,ny=dy/d;
        b.x=nearestX+nx*R;b.y=nearestY+ny*R;
        const dot=b.vx*nx+b.vy*ny;
        if(dot<0){b.vx-=1.5*dot*nx;b.vy-=1.5*dot*ny;}
      }
    }
    function physics(dt) {
      const b=state.ball;
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      const drag=Math.exp(-2.15*dt);
      b.vx*=drag;b.vy*=drag;
      if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)*.55;}
      if(b.x>W-R){b.x=W-R;b.vx=-Math.abs(b.vx)*.55;}
      if(b.y<R){b.y=R;b.vy=Math.abs(b.vy)*.55;}
      if(b.y>H-R){b.y=H-R;b.vy=-Math.abs(b.vy)*.55;}
      for(const o of state.layout.bumpers)ricochetCircle(b,o);
      for(const w of state.layout.walls)ricochetRect(b,w);
      if(state.layout.water.some(w=>b.x>w[0]&&b.x<w[0]+w[2]&&b.y>w[1]&&b.y<w[1]+w[3])){
        state.strokes=Math.min(MAX_STROKES,state.strokes+1);
        state.events.push({kind:'water',id:current().id,hole:state.hole});
        b.x=state.shotFrom.x;b.y=state.shotFrom.y;b.vx=0;b.vy=0;
        if(state.strokes>=MAX_STROKES)endTurn(false);
        else {state.phase='aim';state.clock=0;}
        return;
      }
      const cup=state.layout.cup,dist=Math.hypot(b.x-cup[0],b.y-cup[1]),speed=Math.hypot(b.vx,b.vy);
      if(dist<=30&&speed<=260){b.x=cup[0];b.y=cup[1];b.vx=0;b.vy=0;endTurn(true);return;}
      if(speed<9||state.clock>18){
        b.vx=0;b.vy=0;
        if(state.strokes>=MAX_STROKES)endTurn(false);
        else {state.phase='aim';state.clock=0;}
      }
    }
    function cpuStep(dt) {
      if(!current()?.cpu)return;
      state.cpuDelay-=dt;
      if(state.cpuDelay>0)return;
      const b=state.ball,goal=state.layout.cup;
      const dx=goal[0]-b.x,dy=goal[1]-b.y;
      const ideal=Math.atan2(dy,Math.max(20,dx))*180/Math.PI;
      state.angle=clamp(ideal+(random()-.5)*12,-78,78);
      const distance=Math.hypot(dx,dy);
      state.power=clamp(15+distance*.073+(random()-.5)*13,15,100);
      action(current().id,'shoot');
    }
    function step(delta) {
      if(state.done)return;
      state.acc+=Number.isFinite(delta)?clamp(delta,0,.1):0;
      let loops=0;
      while(state.acc>=1/120-1e-10&&loops++<13&&!state.done) {
        const dt=1/120;state.acc-=dt;state.elapsed+=dt;state.clock+=dt;
        if(state.phase==='aim') {
          cpuStep(dt);
          if(state.phase==='aim'&&state.clock>=24)action(current().id,'shoot');
        } else if(state.phase==='rolling')physics(dt);
        else if(state.phase==='results'&&state.clock>=2.5) {
          if(state.hole>=HOLES)finish();else newHole();
        }
      }
    }
    function hud(id) {
      const p=player(id);if(!p)return {};
      const yourTurn=state.phase==='aim'&&current()?.id===id;
      return {turnLabel:state.done?'GOLF FINISHED':`HOLE ${state.hole}/${HOLES} · PAR ${state.layout.par}`,
        roundScore:p.strokes,modePhase:state.phase,isTurn:yourTurn,
        power:state.power,aim:state.angle,strokes:state.strokes,
        modeHint:yourTurn?'Aim, set power, and SHOOT!':state.phase==='rolling'?'Marble rolling…':'Wait for your turn',
        modeControls:yourTurn?[
          {a:'left',label:'◀ AIM',v:1},{a:'right',label:'AIM ▶',v:1},
          {a:'powerdown',label:'− POWER',v:0},{a:'powerup',label:'+ POWER',v:0},
          {a:'shoot',label:'SHOOT!',v:0}]:[],
        hole:state.hole,par:state.layout.par,activePlayer:current()?.name||''};
    }
    function draw(ctx,w=1920,h=1080) {
      ctx.save();ctx.scale(w/1920,h/1080);
      const bg=ctx.createLinearGradient(0,0,1920,1080);
      bg.addColorStop(0,'#18273b');bg.addColorStop(1,'#384d60');
      ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);
       MarblePartyStage.backdrop(ctx,'golf',state.elapsed);
       MarblePartyStage.frame(ctx,548,231,1305,625,'golf');
      ctx.fillStyle='#fff5df';ctx.font='bold 67px Fredoka,sans-serif';ctx.fillText('MARBLE GOLF',64,88);
      ctx.fillStyle='#ffd984';ctx.font='bold 28px Nunito,sans-serif';
      ctx.fillText(`HOLE ${state.hole} OF ${HOLES} · ${state.layout.name} · PAR ${state.layout.par}`,65,137);
      const ox=555,oy=240,s=1.04;
      ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);
      ctx.fillStyle='#8bc77a';ctx.fillRect(0,0,W,H);
      for(let x=35;x<W;x+=65){ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=35;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      ctx.strokeStyle='#f3e1b4';ctx.lineWidth=17;ctx.strokeRect(0,0,W,H);
      for(const water of state.layout.water){ctx.fillStyle='#49b8d5';ctx.fillRect(...water);ctx.strokeStyle='#d5f8fb';ctx.lineWidth=5;ctx.strokeRect(...water);}
      for(const wall of state.layout.walls){ctx.fillStyle='#a57957';ctx.fillRect(...wall);ctx.strokeStyle='#f3c892';ctx.lineWidth=4;ctx.strokeRect(...wall);}
      for(const o of state.layout.bumpers){ctx.fillStyle='#ea9764';ctx.beginPath();ctx.arc(o[0],o[1],o[2],0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff0c7';ctx.lineWidth=5;ctx.stroke();}
      const cup=state.layout.cup;
      ctx.fillStyle='#253b44';ctx.beginPath();ctx.arc(cup[0],cup[1],31,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff8e0';ctx.lineWidth=5;ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cup[0],cup[1]);ctx.lineTo(cup[0],cup[1]-78);ctx.stroke();
      ctx.fillStyle='#e84b55';ctx.beginPath();ctx.moveTo(cup[0],cup[1]-78);ctx.lineTo(cup[0]+58,cup[1]-58);ctx.lineTo(cup[0],cup[1]-41);ctx.fill();
      const b=state.ball,p=current();
      if(state.phase==='aim'&&p){
        const a=state.angle*Math.PI/180;
        ctx.setLineDash([9,9]);ctx.strokeStyle='#fff8c0';ctx.lineWidth=5;ctx.beginPath();
        ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+Math.cos(a)*(120+state.power*2),b.y+Math.sin(a)*(120+state.power*2));
        ctx.stroke();ctx.setLineDash([]);
      }
      const g=ctx.createRadialGradient(b.x-9,b.y-11,2,b.x,b.y,R);
      g.addColorStop(0,'#fff');g.addColorStop(.25,p?.color||'#f7d35c');g.addColorStop(1,'#25364d');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
      ctx.restore();
      ctx.font='bold 34px Fredoka,sans-serif';ctx.fillStyle='#fff5df';ctx.fillText('SCORECARD',65,238);
      standings().forEach((p,i)=>{
        const y=305+i*76;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(90,y-11,14,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff5df';ctx.font='bold 24px Nunito,sans-serif';ctx.fillText(p.name,116,y);
        ctx.fillStyle='#ffda87';ctx.fillText(`${p.strokes} strokes · ${p.holeScores.join(' / ')||'—'}`,116,y+29);
      });
      ctx.fillStyle='#fff5df';ctx.font='bold 28px Nunito,sans-serif';
      ctx.fillText(state.done?'THE GOLF CHAMPION IS CROWNED':
        state.phase==='results'?`HOLE ${state.hole} COMPLETE`:
        `${current()?.name||''} · SHOT ${Math.min(MAX_STROKES,state.strokes+1)}/${MAX_STROKES}`,568,970);
      ctx.restore();
    }
    newHole();
    return {state,action,step,hud,draw,standings,current,player};
  }
  return Object.freeze({create,HOLES,MAX_STROKES,LAYOUTS});
})();
if(typeof module!=='undefined')module.exports=MarbleGolf;
let marbleGolfGame=null;
registerMode({
  id:'golf',name:'Marble Golf',tagline:'Five crazy golf holes',icon:'⛳',
  minPlayers:1,maxPlayers:8,roundsDefault:5,available:true,awards:[],
  setup({players,seed,onFinish}){marbleGolfGame=MarbleGolf.create([...players.values()],seed,onFinish);return marbleGolfGame;},
  startRound(){return marbleGolfGame;},
  tick(dt){marbleGolfGame?.step(dt);},
  draw(ctx,w,h){marbleGolfGame?.draw(ctx,w,h);},
  onInput(id,k){if(k==='p')marbleGolfGame?.action(id,'shoot');},
  onAction(id,a,v){return marbleGolfGame?.action(id,a,v)||false;},
  botTick(){},hud(player){return marbleGolfGame?.hud(player.id)||{};},
  standings(){return marbleGolfGame?.standings()||[];},
  roundResults(){return marbleGolfGame?.standings()||[];},
  finalResults(){return marbleGolfGame?.standings()||[];},
  session(){return marbleGolfGame;}
});
