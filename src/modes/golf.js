/* MARBLE RUSH — Phase 7: Marble Golf.
 * Five miniature tabletop holes; stroke-play, 1–8 racers, TV-authoritative
 * fixed-step physics, phone shot controls, deterministic CPU opponents.
 * No DOM or network dependencies in the rules engine.
 */
const MarbleGolf = (() => {
  'use strict';
  const HOLES = 5, FULL_HOLES=9, MAX_STROKES = 7, W = 1240, H = 580, R = 19;
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
  const CHAMPIONSHIP_HOLES=Object.freeze([
    {name:'Windmill Whirl',par:3,cup:[1090,285],start:[110,285],walls:[],water:[],bumpers:[[600,280,39]],moving:'windmill',slope:[0,22]},
    {name:'Flipper Frenzy',par:3,cup:[1110,190],start:[110,385],walls:[[650,0,28,190]],water:[],bumpers:[[440,240,34]],moving:'flipper'},
    {name:'Tunnel Trouble',par:3,cup:[1090,380],start:[115,200],walls:[[600,0,35,200],[600,400,35,180]],water:[],bumpers:[],moving:'tunnel'},
    {name:'Grand Finale',par:4,cup:[1120,300],start:[110,300],walls:[[720,100,24,180]],water:[[470,420,230,80]],bumpers:[[920,280,36]],moving:'gate',slope:[0,-19]}
  ]);
  function create(players,seed=1,onFinish=()=>{},options={}) {
    if (!Array.isArray(players)||players.length<1||players.length>8||
        players.some(p=>!p||typeof p.id!=='string'||!p.id)||
        new Set(players.map(p=>p.id)).size!==players.length) throw Error('Golf needs 1–8 unique players');
    if(!Number.isInteger(seed)) throw Error('Invalid seed');
    const random = randFrom(seed);
    const roster = players.map((p,i)=>({
      id:p.id,name:String(p.name||'Player '+(i+1)).slice(0,16),
      cpu:!!p.cpu,skill:p.difficulty==='hard'?.85:p.difficulty==='easy'?.25:.55,color:typeof p.color==='string'?p.color:COLORS[i],
      strokes:0,holeScores:[],wins:0
    }));
    const state={seed,roster,hole:0,turn:0,phase:'aim',angle:0,power:60,
      ball:null,strokes:0,shotFrom:null,clock:0,elapsed:0,acc:0,done:false,
      finishedCalled:false,events:[],history:[],cpuDelay:0,layout:null,
      holes:options&&options.championship?FULL_HOLES:HOLES,
      layouts:options&&options.championship?LAYOUTS.concat(CHAMPIONSHIP_HOLES):LAYOUTS,
      ghost:null,comments:new Set()};
    const player = id=>roster.find(p=>p.id===id);
    const current = ()=>roster[state.turn]||null;
    function standings() {
      return roster.slice().sort((a,b)=>a.strokes-b.strokes||b.wins-a.wins||roster.indexOf(a)-roster.indexOf(b));
    }
    function resetBall() {
      state.ball={x:state.layout.start[0],y:state.layout.start[1],vx:0,vy:0};
      state.strokes=0;state.angle=0;state.power=60;state.phase='aim';
      state.clock=0;state.cpuDelay=.5;state.comments=new Set();
    }
    function newHole() {
      state.hole++;state.turn=0;state.layout=state.layouts[state.hole-1];resetBall();
      state.events.push({kind:'hole_start',hole:state.hole,time:state.elapsed});
      state.events.push({kind:'flyThrough',hole:state.hole,
        cameraFrom:state.layout.start.slice(),cameraTo:state.layout.cup.slice(),time:state.elapsed});
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
      state.events.push({kind:sunk&&score===1?'holeInOne':sunk?'cup':'stroke_limit',
        id:p.id,hole:state.hole,strokes:score,x:state.ball.x,y:state.ball.y,time:state.elapsed});
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
      if(kind==='cheer'&&state.phase!=='finished'&&!state.done&&current()?.id!==id&&
          player(id)&&!state.comments.has(id)){
        state.comments.add(id);state.events.push({kind:'spectatorCheer',id,hole:state.hole,time:state.elapsed});return true;
      }
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
      if(kind==='preview'){
        // First-bounce hint only: no guaranteed final outcome/path revealed.
        const a=state.angle*Math.PI/180;state.ghost={x:state.ball.x+Math.cos(a)*115,
          y:state.ball.y+Math.sin(a)*115};return true;
      }
      if(kind==='shoot') {
        state.shotFrom={x:state.ball.x,y:state.ball.y};
        const theta=state.angle*Math.PI/180, speed=240+state.power*8.5;
        state.ball.vx=Math.cos(theta)*speed;
        state.ball.vy=Math.sin(theta)*speed;
        state.strokes++;state.phase='rolling';state.clock=0;
        state.events.push({kind:'shot',id,angle:state.angle,power:state.power,
          x:state.ball.x,y:state.ball.y,hole:state.hole,time:state.elapsed});
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
      if(state.layout.slope){
        b.vx+=state.layout.slope[0]*dt;
        b.vy+=state.layout.slope[1]*dt;
      }
      const drag=Math.exp(-2.15*dt);
      b.vx*=drag;b.vy*=drag;
      if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)*.55;}
      if(b.x>W-R){b.x=W-R;b.vx=-Math.abs(b.vx)*.55;}
      if(b.y<R){b.y=R;b.vy=Math.abs(b.vy)*.55;}
      if(b.y>H-R){b.y=H-R;b.vy=-Math.abs(b.vy)*.55;}
      for(const o of state.layout.bumpers)ricochetCircle(b,o);
      if(state.layout.moving){
        const t=state.elapsed;
        if(state.layout.moving==='windmill')ricochetCircle(b,[620+60*Math.sin(t*.85),290,43]);
        if(state.layout.moving==='flipper')ricochetRect(b,[585,220+80*Math.sin(t*1.3),35,125]);
        if(state.layout.moving==='tunnel'&&b.x>582&&b.x<635&&b.y>205&&b.y<400){
          b.x=855;b.y=370;b.vx=Math.max(95,b.vx);
          state.events.push({kind:'tunnel',id:current().id,time:state.elapsed});
        }
        if(state.layout.moving==='gate')ricochetRect(b,[825,210+75*Math.sin(t*1.1),24,140]);
      }
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
      state.angle=clamp(ideal+(random()-.5)*(22-17*current().skill),-78,78);
      const distance=Math.hypot(dx,dy);
      state.power=clamp((distance>455?100:(distance*2.15-240)/8.5)+(random()-.5)*(22-17*current().skill),15,100);
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
          if(state.phase==='aim'&&state.clock>=14)action(current().id,'shoot');
        } else if(state.phase==='rolling')physics(dt);
        else if(state.phase==='results'&&state.clock>=2.5) {
          if(state.hole>=state.holes)finish();else newHole();
        }
      }
    }
    function hud(id) {
      const p=player(id);if(!p)return {};
      const yourTurn=state.phase==='aim'&&current()?.id===id;
      return {turnLabel:state.done?'GOLF FINISHED':`HOLE ${state.hole}/${state.holes} · PAR ${state.layout.par}`,
        roundScore:p.strokes,modePhase:state.phase,isTurn:yourTurn,
        power:state.power,aim:state.angle,strokes:state.strokes,ghost:state.ghost,
        obstacle:state.layout.moving||null,
        modeHint:yourTurn?'Aim, set power, and SHOOT!':state.phase==='rolling'?'Marble rolling…':'Wait for your turn',
        modeControls:!yourTurn&&!state.comments.has(id)?[{a:'cheer',label:'CHEER!',v:0}]:yourTurn?[
          {a:'left',label:'◀ AIM',v:1},{a:'right',label:'AIM ▶',v:1},
          {a:'powerdown',label:'− POWER',v:0},{a:'powerup',label:'+ POWER',v:0},
          {a:'preview',label:'TRAJECTORY',v:0},{a:'shoot',label:'SHOOT!',v:0}]:[],
        hole:state.hole,par:state.layout.par,activePlayer:current()?.name||''};
    }
    function draw(){ /* Party Pack v2: legacy graphics deleted; renderer lives in party-ui-v2.js. */ }
    newHole();
    return {state,action,step,hud,draw,standings,current,player};
  }
  return Object.freeze({create,HOLES,FULL_HOLES,MAX_STROKES,LAYOUTS,CHAMPIONSHIP_HOLES});
})();
if(typeof module!=='undefined')module.exports=MarbleGolf;
let marbleGolfGame=null;
registerMode({
  id:'golf',name:'Marble Golf',tagline:'Nine crazy golf holes',icon:'⛳',
  minPlayers:1,maxPlayers:8,roundsDefault:9,available:false,awards:[],
  setup({players,seed,onFinish,championship=true}){marbleGolfGame=MarbleGolf.create([...players.values()],seed,onFinish,{championship});return marbleGolfGame;},
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
