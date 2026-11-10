/* MARBLE RUSH — Phase 4 Bowl Brawl. Deterministic, DOM-free 2–8-player
 * simultaneous marble arena. Each of five rounds ends with a winner or timeout.
 * A RAM launches a charged collision; ANCHOR brakes; steering changes heading.
 */
const BowlBrawl = (() => {
  'use strict';
  const ROUNDS=5, ROUND_TIME=42, START_RADIUS=380, END_RADIUS=110;
  const MARBLE_RADIUS=22, TAU=2*Math.PI;
  const COLORS=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const randomFrom=seed=>{let s=seed>>>0;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);};
  function create(players,seed=1,onFinish=()=>{}){
    if(!Array.isArray(players)||players.length<2||players.length>8||
       players.some(p=>!p||typeof p.id!=='string'||!p.id)||
       new Set(players.map(p=>p.id)).size!==players.length)
      throw Error('Bowl Brawl needs 2–8 unique players');
    const rng=randomFrom(seed), roster=players.map((p,i)=>({
      id:p.id,name:String(p.name||('Player '+(i+1))).slice(0,16),
      color:typeof p.color==='string'?p.color:COLORS[i],cpu:!!p.cpu,
      points:0,wins:0,knockouts:0,roundRanks:[],roundPoints:[]
    }));
    const state={roster,seed,round:0,elapsed:0,time:0,radius:START_RADIUS,marbles:[],
      active:[],done:false,finishedCalled:false,lastWinner:null,events:[],roundHistory:[]};
    function current(id){return state.marbles.find(m=>m.id===id);}
    function alive(){return state.marbles.filter(m=>m.alive);}
    function standings(){return roster.slice().sort((a,b)=>b.points-a.points||
      b.wins-a.wins||b.knockouts-a.knockouts||roster.indexOf(a)-roster.indexOf(b));}
    function beginRound(){
      state.round++;state.elapsed=0;state.radius=START_RADIUS;state.lastWinner=null;
      const n=roster.length,phase=rng()*TAU;
      state.marbles=roster.map((p,i)=>{
        const ang=TAU*i/n+phase, x=190*Math.cos(ang),y=190*Math.sin(ang);
        return {id:p.id,x,y,vx:0,vy:0,heading:ang+Math.PI,energy:75,
          anchored:0,cooldown:0,alive:true,eliminatedAt:null,ramHits:0,outs:0,
          cpuWait:.3+rng()*.5};
      });
      state.active=state.marbles;
    }
    beginRound();
    function closest(m){
      let target=null,best=Infinity;
      for(const o of state.marbles)if(o.alive&&o!==m){
        const d=Math.hypot(m.x-o.x,m.y-o.y);
        if(d<best){best=d;target=o;}
      }
      return target;
    }
    function action(id,type,val){
      const m=current(id);
      if(state.done||!m||!m.alive)return false;
      if(type==='left'||type==='right'){
        if(val!=null && (!Number.isInteger(val)||val<1||val>5))return false;
        m.heading+=(type==='left'?-1:1)*.21*(val||1);return true;
      }
      if(type==='aim'){
        if(!Number.isFinite(val)||val<0||val>360)return false;
        m.heading=val*Math.PI/180;return true;
      }
      if(type==='anchor'){
        if(m.energy<15||m.cooldown>0)return false;
        m.energy-=15;m.anchored=.75;m.cooldown=.65;
        state.events.push({kind:'anchor',id:m.id,time:state.time});return true;
      }
      if(type==='ram'){
        if(m.energy<28||m.cooldown>0)return false;
        m.energy-=28;m.cooldown=.72;m.anchored=0;
        // A committed forward burst; automatic steering does not erase momentum.
        m.vx+=Math.cos(m.heading)*480;
        m.vy+=Math.sin(m.heading)*480;
        state.events.push({kind:'ram',id:m.id,time:state.time});return true;
      }
      return false;
    }
    function cpuTick(dt){
      for(const m of state.marbles){
        const p=roster.find(q=>q.id===m.id);
        if(!p?.cpu||!m.alive)continue;
        m.cpuWait-=dt;
        if(m.cpuWait>0)continue;
        m.cpuWait=.22+rng()*.28;
        const enemy=closest(m);
        if(!enemy)continue;
        const ang=Math.atan2(enemy.y-m.y,enemy.x-m.x);
        const spread=(rng()-.5)*.27;
        m.heading=ang+spread;
        const distance=Math.hypot(enemy.x-m.x,enemy.y-m.y);
        if(distance<340&&m.energy>=28&&m.cooldown<=0)action(m.id,'ram');
        else if(Math.hypot(m.x,m.y)>state.radius*.8&&m.energy>=15&&m.cooldown<=0)
          action(m.id,'anchor');
      }
    }
    function resolveHits(){
      const ms=state.marbles;
      for(let i=0;i<ms.length;i++){
        const a=ms[i];if(!a.alive)continue;
        for(let j=i+1;j<ms.length;j++){
          const b=ms[j];if(!b.alive)continue;
          let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
          if(d>=MARBLE_RADIUS*2)continue;
          if(d<1e-8){dx=1;dy=0;d=1;}
          const nx=dx/d,ny=dy/d,over=MARBLE_RADIUS*2-d;
          a.x-=nx*over*.5;a.y-=ny*over*.5;b.x+=nx*over*.5;b.y+=ny*over*.5;
          const vr=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(vr>=0)continue;
          const impact=-(1+.74)*vr/2;
          const aResistance=a.anchored>0?.36:1,bResistance=b.anchored>0?.36:1;
          a.vx-=impact*nx*aResistance;a.vy-=impact*ny*aResistance;
          b.vx+=impact*nx*bResistance;b.vy+=impact*ny*bResistance;
          if(-vr>140){
            a.ramHits++;b.ramHits++;
            state.events.push({kind:'hit',id:a.id,other:b.id,impact:-vr,time:state.time});
          }
        }
      }
    }
    function rimRadius(t){
      return START_RADIUS-(START_RADIUS-END_RADIUS)*clamp((t-10)/(ROUND_TIME-10),0,1);
    }
    function finishRound(){
      if(state.done)return;
      const order=state.marbles.slice().sort((a,b)=>{
        if(a.alive!==b.alive)return a.alive?-1:1;
        if(a.alive)return Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y)||roster.findIndex(p=>p.id===a.id)-roster.findIndex(p=>p.id===b.id);
        return b.eliminatedAt-a.eliminatedAt||a.outs-b.outs||roster.findIndex(p=>p.id===a.id)-roster.findIndex(p=>p.id===b.id);
      });
      const placement=[10,8,6,5,4,3,2,1],rank=order.map(m=>m.id);
      order.forEach((m,i)=>{
        const p=roster.find(x=>x.id===m.id);
        const points=placement[i]||0;
        p.points+=points;p.roundPoints.push(points);p.roundRanks.push(i+1);
        p.knockouts+=m.ramHits;
        if(i===0)p.wins++;
      });
      state.lastWinner=order[0]?.id;
      state.roundHistory.push(rank);
      state.events.push({kind:'round_end',winner:state.lastWinner,round:state.round});
      if(state.round>=ROUNDS){
        state.done=true;
        if(!state.finishedCalled){state.finishedCalled=true;onFinish(standings());}
      } else beginRound();
    }
    function tick(delta){
      if(state.done)return;
      const n=Number.isFinite(delta)?clamp(delta,0,.1):0;
      // Fixed-step integration with a bounded accumulator for repeatable outcomes.
      state.acc=(state.acc||0)+n;
      let loops=0;
      while(state.acc>=1/120-1e-10&&loops++<13&&!state.done){
        const dt=1/120;
        state.acc-=dt;state.elapsed+=dt;state.time+=dt;
        state.radius=rimRadius(state.elapsed);
        cpuTick(dt);
        for(const m of state.marbles){
          if(!m.alive)continue;
          m.cooldown=Math.max(0,m.cooldown-dt);
          m.anchored=Math.max(0,m.anchored-dt);
          m.energy=clamp(m.energy+19*dt,0,100);
          const drag=Math.exp(-(m.anchored>0?7.2:.8)*dt);
          m.vx*=drag;m.vy*=drag;
          // Inherent low thrust keeps the bowl lively and provides
          // manual steering between RAMs.
          if(m.anchored<=0){m.vx+=Math.cos(m.heading)*85*dt;m.vy+=Math.sin(m.heading)*85*dt;}
          m.x+=m.vx*dt;m.y+=m.vy*dt;
        }
        resolveHits();
        for(const m of state.marbles)if(m.alive&&Math.hypot(m.x,m.y)>state.radius-MARBLE_RADIUS){
          m.alive=false;m.eliminatedAt=state.elapsed;m.outs++;
          state.events.push({kind:'out',id:m.id,round:state.round,time:state.time});
        }
        if(alive().length<=1||state.elapsed>=ROUND_TIME){finishRound();state.acc=0;break;}
      }
    }
    function hud(id){
      const p=roster.find(x=>x.id===id),m=current(id);
      if(!p)return {};
      return {
        turnLabel:state.done?'BOWL BRAWL COMPLETE':`ROUND ${state.round}/${ROUNDS} · ${alive().length} IN THE BOWL`,
        roundScore:p.points,energy:Math.round(m?.energy||0),
        modePhase:state.done?'finished':m?.alive?'brawling':'eliminated',
        isTurn:!!m?.alive,
        modeControls:m?.alive&&!state.done?[
          {a:'left',label:'◀ TURN',v:2},
          {a:'ram',label:'RAM!',v:0},
          {a:'right',label:'TURN ▶',v:2},
          {a:'anchor',label:'ANCHOR',v:0}
        ]:[],
        modeHint:m?.alive?'RAM costs 28 energy · ANCHOR costs 15':'Wait for the next round',
        timeRemaining:Math.max(0,Math.ceil(ROUND_TIME-state.elapsed))
      };
    }
    function draw(ctx,w=1920,h=1080){
      ctx.save();ctx.scale(w/1920,h/1080);
      const grad=ctx.createLinearGradient(0,0,1920,1080);
      grad.addColorStop(0,'#161c43');grad.addColorStop(1,'#46345c');
      ctx.fillStyle=grad;ctx.fillRect(0,0,1920,1080);
      ctx.fillStyle='#fff4e0';ctx.font='bold 62px Fredoka,sans-serif';ctx.fillText('BOWL BRAWL',76,85);
      ctx.fillStyle='#ffd23f';ctx.font='bold 29px Nunito,sans-serif';
      ctx.fillText(`ROUND ${state.round}/${ROUNDS}  ·  ${Math.ceil(Math.max(0,ROUND_TIME-state.elapsed))}s`,77,132);
      const x=1080,y=540,scale=1.03;
      ctx.save();ctx.translate(x,y);
      const bg=ctx.createRadialGradient(-140,-140,30,0,0,415);
      bg.addColorStop(0,'#d2a2b5');bg.addColorStop(.72,'#956881');bg.addColorStop(1,'#433758');
      ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(0,0,430,430,0,0,TAU);ctx.fill();
      ctx.lineWidth=30;ctx.strokeStyle='#e4bd77';ctx.stroke();
      ctx.lineWidth=8;ctx.strokeStyle='#fff2cf';ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,state.radius*scale,0,TAU);
      ctx.strokeStyle='#ffdb73';ctx.lineWidth=13;ctx.stroke();
      for(const m of state.marbles){
        if(!m.alive)continue;
        const p=roster.find(a=>a.id===m.id),px=m.x*scale,py=m.y*scale;
        ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(px+5,py+10,23,12,0,0,TAU);ctx.fill();
        const g=ctx.createRadialGradient(px-11,py-14,2,px,py,24);
        g.addColorStop(0,'#fff8e0');g.addColorStop(.24,p.color);g.addColorStop(1,'#272a53');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,24,0,TAU);ctx.fill();
        ctx.strokeStyle=m.anchored>0?'#ffe58e':'#fff';ctx.lineWidth=m.anchored>0?6:2;ctx.stroke();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(m.heading)*33,py+Math.sin(m.heading)*33);ctx.stroke();
        ctx.fillStyle='#fff5e7';ctx.font='bold 17px Nunito,sans-serif';ctx.textAlign='center';
        ctx.fillText(p.name,px,py-38);
      }
      ctx.restore();
      ctx.fillStyle='#fff4e0';ctx.font='bold 35px Fredoka,sans-serif';
      ctx.fillText('ARENA STANDINGS',60,240);
      const ranked=standings();
      ranked.forEach((p,i)=>{
        const y=305+i*75;
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(85,y-12,15,0,TAU);ctx.fill();
        ctx.fillStyle='#fff4e0';ctx.font='bold 26px Nunito,sans-serif';ctx.fillText(p.name,116,y);
        ctx.fillStyle='#ffd23f';ctx.fillText(`${p.points} pts · ${p.wins} wins`,116,y+29);
      });
      ctx.fillStyle='#fff4e0';ctx.font='bold 27px Nunito,sans-serif';
      ctx.fillText(state.done?'CHAMPIONSHIP COMPLETE':'RAM your rivals out · ANCHOR to hold ground',70,1020);
      ctx.restore();
    }
    return {state,current,action,tick,hud,draw,standings,alive,finishRound,rimRadius};
  }
  return Object.freeze({create,ROUNDS,ROUND_TIME,START_RADIUS,END_RADIUS});
})();
if(typeof module!=='undefined')module.exports=BowlBrawl;
let bowlBrawlGame=null;
registerMode({
  id:'brawl',name:'Bowl Brawl',tagline:"Bump 'em out",icon:'💥',
  minPlayers:2,maxPlayers:8,roundsDefault:5,available:true,awards:[],
  setup({players,seed,onFinish}) {
    bowlBrawlGame=BowlBrawl.create([...players.values()],seed,onFinish);
    return bowlBrawlGame;
  },
  startRound(){return bowlBrawlGame;},
  tick(dt){bowlBrawlGame?.tick(dt);},
  draw(ctx,w,h){bowlBrawlGame?.draw(ctx,w,h);},
  onInput(id,k){if(k==='p')bowlBrawlGame?.action(id,'ram');else if(k==='r'){}},
  onAction(id,a,v){return bowlBrawlGame?.action(id,a,v)||false;},
  botTick(){},
  hud(player){return bowlBrawlGame?.hud(player.id)||{};},
  standings(){return bowlBrawlGame?.standings()||[];},
  roundResults(){return bowlBrawlGame?.standings()||[];},
  finalResults(){return bowlBrawlGame?.standings()||[];},
  session(){return bowlBrawlGame;}
});
