/* Marble Rush — Phase 6 Marble Curling.
 * Five ends; 2 stones per player per end, deterministic turn-based ice physics.
 * TV is authoritative; no DOM/network used by the rules module.
 */
const MarbleCurling=(()=>{
 'use strict';
 const ENDS=5,STONES_PER_PLAYER=2,MAX_PLAYERS=8,STONE_R=18;
 const WIDTH=1300,HEIGHT=530,BUTTON_X=1140,BUTTON_Y=265;
 const COLORS=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const seeded=(seed)=>{let x=seed>>>0;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);};
 function create(players,seed=1,onFinish=()=>{}){
  if(!Array.isArray(players)||players.length<2||players.length>MAX_PLAYERS||
    players.some(p=>!p||typeof p.id!=='string'||!p.id)||
    new Set(players.map(p=>p.id)).size!==players.length)throw Error('Curling requires 2–8 distinct players');
  const random=seeded(seed),roster=players.map((p,i)=>({
    id:p.id,name:String(p.name||'Player '+(i+1)).slice(0,16),
    cpu:!!p.cpu,skill:p.difficulty==='hard'?.85:p.difficulty==='easy'?.25:.55,color:typeof p.color==='string'?p.color:COLORS[i],
    points:0,wins:0,endPoints:[],stonesPlayed:0
  }));
  const state={seed,roster,end:0,turn:0,phase:'aim',clock:0,elapsed:0,acc:0,
    stones:[],moving:null,aim:0,power:68,curl:0,sweep:0,last:null,sweepReadyAt:0,
    done:false,finishedCalled:false,history:[],events:[],cpuDelay:0,ends:ENDS,
    spectators:new Set()};
  const getPlayer=id=>roster.find(p=>p.id===id);
  function current(){return roster[Math.floor(state.turn/STONES_PER_PLAYER)%roster.length];}
  function distances(){
    return state.stones.map(s=>({...s,d:Math.hypot(s.x-BUTTON_X,s.y-BUTTON_Y)}))
      .sort((a,b)=>a.d-b.d||a.order-b.order);
  }
  function standings(){return roster.slice().sort((a,b)=>b.points-a.points||b.wins-a.wins||
    roster.indexOf(a)-roster.indexOf(b));}
  function startEnd(){
    state.end++;state.turn=0;state.phase='aim';state.clock=0;
    state.stones=[];state.moving=null;state.aim=0;state.power=68;state.curl=0;
    state.sweep=0;state.cpuDelay=.5;state.acc=0;state.spectators=new Set();
  }
  function finish(){
    if(state.done)return;
    state.done=true;state.phase='finished';
    if(!state.finishedCalled){state.finishedCalled=true;onFinish(standings());}
  }
  function scoreEnd(){
    const placed=distances(),order=roster.map(p=>({
      p,d:placed.find(s=>s.id===p.id)?.d??Infinity,
      near:placed.filter(s=>s.id===p.id).slice(0,2)
    }));
    order.sort((a,b)=>a.d-b.d||roster.indexOf(a.p)-roster.indexOf(b.p));
    // Nearest marble earns the most; extra scoring for stones inside the
    // button rings. Each player receives a repeatable end score.
    const schedule=[10,8,6,5,4,3,2,1];
    order.forEach(({p,d,near},i)=>{
      const rings=near.filter(s=>s.d<=80).length;
      const score=schedule[i]+rings*2;
      p.points+=score;p.endPoints.push(score);
      if(i===0)p.wins++;
    });
    state.history.push({end:state.end,places:order.map(x=>x.p.id),
      scores:order.map(x=>({id:x.p.id,score:x.p.endPoints.at(-1)})),
      stones:state.stones.map(x=>({id:x.id,x:x.x,y:x.y,order:x.order}))});
    state.last=order[0].p.id;
    if(placed[1]&&placed[1].d-placed[0].d<35)state.events.push({kind:'measurement',
      end:state.end,gap:placed[1].d-placed[0].d,time:state.elapsed});
    state.phase='results';state.clock=0;state.moving=null;
  }
  function action(id,kind,value){
    const p=getPlayer(id);
    if(!p||state.done)return false;
    if(kind==='predict'&&!state.done&&state.phase!=='finished'&&!state.spectators.has(id)&&
       Number.isInteger(value)&&value>=0&&value<roster.length){
      state.spectators.add(id);state.events.push({kind:'prediction',id,pick:roster[value].id,end:state.end,time:state.elapsed});return true;
    }
    if(kind==='sweep'){
      if(state.phase!=='slide'||!state.moving||state.moving.id!==id||state.sweep>=100)return false;
      if(state.elapsed<state.sweepReadyAt)return false;
      state.sweepReadyAt=state.elapsed+.17;
      state.sweep=Math.min(100,state.sweep+12);
      state.events.push({kind:'sweep',id,time:state.elapsed});return true;
    }
    if(state.phase!=='aim'||current().id!==id)return false;
    if(kind==='left'||kind==='right'){
      if(value!==undefined&&(!Number.isInteger(value)||value<1||value>5))return false;
      state.aim=clamp(state.aim+(kind==='left'?-1:1)*2*(value||1),-40,40);return true;
    }
    if(kind==='aim'){
      if(!Number.isFinite(value)||value< -40||value>40)return false;
      state.aim=value;return true;
    }
    if(kind==='power'){
      if(!Number.isFinite(value)||value<30||value>100)return false;
      state.power=Number(value.toFixed(1));return true;
    }
    if(kind==='powerup'||kind==='powerdown'){
      state.power=clamp(state.power+(kind==='powerup'?5:-5),30,100);return true;
    }
    if(kind==='curlleft'||kind==='curlright'){
      state.curl=clamp(state.curl+(kind==='curlleft'?-1:1),-3,3);return true;
    }
    if(kind==='throw'){
      const theta=state.aim*Math.PI/180;
      const speed=210+state.power*5.1;
      const stone={id:p.id,x:75,y:BUTTON_Y,vx:Math.cos(theta)*speed,
        vy:Math.sin(theta)*speed,spin:state.curl,order:state.turn,still:0,round:state.end};
      state.stones.push(stone);state.moving=stone;state.phase='slide';
      state.sweep=0;state.clock=0;state.spectators=new Set();p.stonesPlayed++;
      state.events.push({kind:'throw',id,angle:state.aim,power:state.power,spin:state.curl,
        x:stone.x,y:stone.y,time:state.elapsed});
      if(state.turn===roster.length*STONES_PER_PLAYER-1)
        state.events.push({kind:'lastStone',end:state.end,id,time:state.elapsed});
      return true;
    }
    return false;
  }
  function cpuTick(dt){
    if(state.phase!=='aim')return;
    state.cpuDelay-=dt;
    const p=current();
    if(!p.cpu||state.cpuDelay>0)return;
    // Seeded targeting and strength. The target is in the scoring house,
    // with enough variance to remain a fair family game.
    state.aim=clamp((random()-.5)*(17-13*p.skill),-40,40);
    state.power=clamp(71+(random()-.5)*(32-21*p.skill),30,100);
    state.curl=clamp(Math.round((random()-.5)*5),-3,3);
    action(p.id,'throw');
  }
  function physics(dt){
    const drag=state.sweep>0?.995:.991;
    for(const a of state.stones){
      a.x+=a.vx*dt;a.y+=a.vy*dt;
      if(a.spin&&Math.abs(a.vx)>8){const bend=a.spin*7*dt; a.vy+=bend;
        a.spin*=Math.pow(.996,dt*60);}
      const f=Math.pow(drag,dt*60);
      a.vx*=f;a.vy*=f;
      if(Math.hypot(a.vx,a.vy)<2){a.vx=0;a.vy=0;}
      if(a.y<STONE_R){a.y=STONE_R;a.vy=Math.abs(a.vy)*.55;}
      if(a.y>HEIGHT-STONE_R){a.y=HEIGHT-STONE_R;a.vy=-Math.abs(a.vy)*.55;}
      if(a.x<STONE_R){a.x=STONE_R;a.vx=Math.abs(a.vx)*.5;}
      if(a.x>WIDTH-STONE_R){a.x=WIDTH-STONE_R;a.vx=-Math.abs(a.vx)*.5;}
    }
    for(let i=0;i<state.stones.length;i++)for(let j=i+1;j<state.stones.length;j++){
      const a=state.stones[i],b=state.stones[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d>=STONE_R*2)continue;
      if(d<1e-6){dx=1;dy=0;d=1;}
      const nx=dx/d,ny=dy/d,over=STONE_R*2-d;
      a.x-=nx*over*.5;a.y-=ny*over*.5;b.x+=nx*over*.5;b.y+=ny*over*.5;
      const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(vn<0){
        const impulse= -(1+.65)*vn/2;
        a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
        if(-vn>40)state.events.push({kind:'hit',ids:[a.id,b.id],impact:-vn,
           x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,time:state.elapsed});
      }
    }
    if(state.sweep>0)state.sweep=Math.max(0,state.sweep-dt*65);
  }
  function step(delta){
    if(state.done)return;
    const dt=Number.isFinite(delta)?clamp(delta,0,.1):0;
    state.acc+=dt;
    let loops=0;
    while(state.acc>=1/60-1e-10&&loops++<7&&!state.done){
      const h=1/60;state.acc-=h;state.clock+=h;state.elapsed+=h;
      if(state.phase==='aim'){
        cpuTick(h);
        if(state.phase==='aim'&&state.clock>=12)action(current().id,'throw');
      } else if(state.phase==='slide'){
        physics(h);
        // Never stall if the marble gets stuck bouncing.
        if(state.clock>=22||state.stones.every(s=>!s.vx&&!s.vy)){
          for(const s of state.stones){s.vx=0;s.vy=0;}
          state.moving=null;state.turn++;state.sweep=0;state.clock=0;
          if(state.turn>=roster.length*STONES_PER_PLAYER)scoreEnd();
          else{state.phase='aim';state.aim=0;state.power=68;state.curl=0;state.cpuDelay=.45;}
        }
      } else if(state.phase==='results'&&state.clock>=2.5){
        if(state.end>=ENDS)finish();else startEnd();
      }
    }
  }
  function hud(id){
    const p=getPlayer(id);if(!p)return {};
    const turn=state.phase==='aim'&&current()?.id===id;
    const sweeping=state.phase==='slide'&&state.moving?.id===id;
    return {turnLabel:`END ${state.end}/${ENDS} · ${state.phase.toUpperCase()}`,
      roundScore:p.points,power:state.power,aim:state.aim,curl:state.curl,sweep:state.sweep,
      modePhase:state.phase,isTurn:turn||sweeping,
      modeHint:turn?'Aim your stone, set power, then THROW':sweeping?'SWEEP to keep your stone sliding':'Watch the house',
      modeControls:!turn&&!sweeping&&!state.spectators.has(id)?
        roster.map((r,i)=>({a:'predict',label:'PICK '+r.name,v:i})):turn?[
        {a:'left',label:'◀ AIM',v:2},{a:'right',label:'AIM ▶',v:2},
        {a:'powerdown',label:'− POWER',v:0},{a:'powerup',label:'+ POWER',v:0},
        {a:'curlleft',label:'↶ CURL',v:0},{a:'curlright',label:'CURL ↷',v:0},
        {a:'throw',label:'THROW!',v:0}
      ]:sweeping?[{a:'sweep',label:'SWEEP!',v:0}]:[],
      end:state.end,stonesLeft:Math.max(0,STONES_PER_PLAYER-Math.floor(state.turn/roster.length)),
      activePlayer:current()?.name||''};
  }
  function draw(ctx,w=1920,h=1080){
    ctx.save();ctx.scale(w/1920,h/1080);
    const bg=ctx.createLinearGradient(0,0,1920,1080);
    bg.addColorStop(0,'#161b44');bg.addColorStop(1,'#394b73');
    ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);
     MarblePartyStage.backdrop(ctx,'curling',state.elapsed);
     MarblePartyStage.frame(ctx,485,225,1370,575,'curling');
    ctx.fillStyle='#fff7df';ctx.font='bold 68px Fredoka,sans-serif';ctx.fillText('MARBLE CURLING',62,92);
    ctx.fillStyle='#ffd576';ctx.font='bold 27px Nunito,sans-serif';ctx.fillText(`END ${state.end} OF ${ENDS}  ·  ${state.phase.toUpperCase()}`,66,142);
    const ox=495,oy=235,sc=1.04;
    ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);
    MarblePartyStage.surface(ctx,'curling',0,0,WIDTH,HEIGHT,state.elapsed);
    ctx.strokeStyle='#f6f9fa';ctx.lineWidth=14;ctx.strokeRect(0,0,WIDTH,HEIGHT);
    for(let x=100;x<WIDTH;x+=140){
      ctx.strokeStyle='rgba(72,115,167,.13)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();
    }
    for(const [r,c] of [[140,'#297ab9'],[100,'#f4f6f7'],[65,'#dc4e5c'],[27,'#f4f6f7']]){
      ctx.save();ctx.shadowColor='#193b64a8';ctx.shadowBlur=9;
      const ring=ctx.createRadialGradient(BUTTON_X-r*.38,BUTTON_Y-r*.4,1,BUTTON_X,BUTTON_Y,r*1.17);
      ring.addColorStop(0,'#fff');ring.addColorStop(.22,c);ring.addColorStop(.72,c);ring.addColorStop(1,'#173d61');
      ctx.fillStyle=ring;ctx.beginPath();ctx.arc(BUTTON_X,BUTTON_Y,r,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.fillStyle='#235585';ctx.beginPath();ctx.arc(BUTTON_X,BUTTON_Y,7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#4964a0';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(BUTTON_X,0);ctx.lineTo(BUTTON_X,HEIGHT);ctx.stroke();
    if(state.phase==='aim'){
      const theta=state.aim*Math.PI/180,px=75,py=BUTTON_Y;
      ctx.setLineDash([12,9]);ctx.strokeStyle='#e5a44b';ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(theta)*390,py+Math.sin(theta)*390);ctx.stroke();ctx.setLineDash([]);
    }
    for(const stone of state.stones){
      const p=getPlayer(stone.id);
      ctx.fillStyle='rgba(17,35,63,.2)';ctx.beginPath();ctx.ellipse(stone.x+4,stone.y+8,21,12,0,0,Math.PI*2);ctx.fill();
      MarblePartyStage.marble(ctx,stone.x,stone.y,STONE_R,p.color);
    }
    ctx.restore();
    ctx.fillStyle='#fff7e6';ctx.font='bold 33px Fredoka,sans-serif';ctx.fillText('END STANDINGS',67,242);
    standings().forEach((p,i)=>{
      const y=304+i*80;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(90,y-12,14,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff7e6';ctx.font='bold 24px Nunito,sans-serif';ctx.fillText(p.name,117,y);
      ctx.fillStyle='#ffdc83';ctx.fillText(`${p.points} pts · ${p.wins} ends`,117,y+29);
    });
    ctx.font='bold 29px Nunito,sans-serif';ctx.fillStyle='#fff7df';
    ctx.fillText(state.done?'CURLING CHAMPION CROWNED':
      state.phase==='aim'?`UP NEXT: ${current().name}`:
      state.phase==='slide'?'SWEEP!  Guide your stone towards the button':
      `END ${state.end} RESULTS`,520,960);
    ctx.restore();
  }
  startEnd();
  return {state,action,step,hud,draw,standings,current,distances,scoreEnd};
 }
 return Object.freeze({create,ENDS,STONES_PER_PLAYER,WIDTH,HEIGHT,BUTTON_X,BUTTON_Y});
})();
if(typeof module!=='undefined')module.exports=MarbleCurling;
let marbleCurlingGame=null;
registerMode({
 id:'curling',name:'Marble Curling',tagline:'Sweep to the button',icon:'🥌',
 minPlayers:2,maxPlayers:8,roundsDefault:5,available:true,awards:[],
 setup({players,seed,onFinish}){marbleCurlingGame=MarbleCurling.create([...players.values()],seed,onFinish);return marbleCurlingGame;},
 startRound(){return marbleCurlingGame;},
 tick(dt){marbleCurlingGame?.step(dt);},
 draw(ctx,w,h){marbleCurlingGame?.draw(ctx,w,h);},
 onInput(id,k){if(k==='p'){const g=marbleCurlingGame;if(g){const action=g.state.phase==='slide'?'sweep':'throw';g.action(id,action);}}},
 onAction(id,a,v){return marbleCurlingGame?.action(id,a,v)||false;},
 botTick(){},
 hud(player){return marbleCurlingGame?.hud(player.id)||{};},
 standings(){return marbleCurlingGame?.standings()||[];},
 roundResults(){return marbleCurlingGame?.standings()||[];},
 finalResults(){return marbleCurlingGame?.standings()||[];},
 session(){return marbleCurlingGame;}
});
