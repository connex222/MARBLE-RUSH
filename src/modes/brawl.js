/* MARBLE RUSH — Phase 4 Bowl Brawl. Deterministic, DOM-free 2–8-player
 * simultaneous marble arena. Each of five rounds ends with a winner or timeout.
 * A RAM launches a charged collision; ANCHOR brakes; steering changes heading.
 */
const BowlBrawl = (() => {
  'use strict';
  const ROUNDS=5, ROUND_TIME=42, START_RADIUS=380, END_RADIUS=110;
  // Telegraph before each force pulse: players can anchor or retreat.
  const SHOCK_TIMES=[8,20,32], SHOCK_WARNING=3;
  const RECOVER_COST=35, RECOVER_MARGIN=85, KO_BONUS=3;
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
      color:typeof p.color==='string'?p.color:COLORS[i],cpu:!!p.cpu,skill:p.difficulty==='hard'?.85:p.difficulty==='easy'?.25:.55,
      points:0,wins:0,knockouts:0,roundRanks:[],roundPoints:[]
    }));
    const state={roster,seed,round:0,elapsed:0,time:0,radius:START_RADIUS,marbles:[],
      active:[],done:false,finishedCalled:false,lastWinner:null,events:[],roundHistory:[],
      hazard:'clean',hazardAngle:0,spectators:new Set(),
      pulseIndex:0,lastPulseAt:-99};
    const HAZARDS=['bumpers','ice','rotor','crumbling','clean'];
    function current(id){return state.marbles.find(m=>m.id===id);}
    function alive(){return state.marbles.filter(m=>m.alive);}
    function standings(){return roster.slice().sort((a,b)=>b.points-a.points||
      b.wins-a.wins||b.knockouts-a.knockouts||roster.indexOf(a)-roster.indexOf(b));}
    function beginRound(){
      state.round++;state.elapsed=0;state.radius=START_RADIUS;state.lastWinner=null;
      state.hazard=HAZARDS[state.round-1];state.hazardAngle=rng()*TAU;state.spectators=new Set();
      state.pulseIndex=0;state.lastPulseAt=-99;
      state.events.push({kind:'hazardReveal',hazard:state.hazard,round:state.round,time:state.time});
      const n=roster.length,phase=rng()*TAU;
      state.marbles=roster.map((p,i)=>{
        const ang=TAU*i/n+phase, x=190*Math.cos(ang),y=190*Math.sin(ang);
        return {id:p.id,x,y,vx:0,vy:0,heading:ang+Math.PI,energy:75,
          anchored:0,cooldown:0,alive:true,eliminatedAt:null,ramHits:0,outs:0,
          cpuWait:.3+rng()*.5,ramWindow:0,
          recoverUsed:false,glory:0,kos:0,lastHitBy:null,lastHitTime:-999};
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
      if(type==='spectate'&&!state.done&&m&&!m.alive&&!state.spectators.has(id)){
        state.spectators.add(id);state.events.push({kind:'spectatorCheer',id,round:state.round,time:state.time});return true;
      }
      if(state.done||!m||!m.alive)return false;
      if(type==='left'||type==='right'){
        if(val!=null && (!Number.isInteger(val)||val<1||val>5))return false;
        m.heading+=(type==='left'?-1:1)*.21*(val||1);return true;
      }
      if(type==='aim'){
        if(!Number.isFinite(val)||val<0||val>360)return false;
        m.heading=val*Math.PI/180;return true;
      }
      if(type==='recover'){
        const distance=Math.hypot(m.x,m.y);
        const margin=state.radius-MARBLE_RADIUS-distance;
        if(m.recoverUsed||m.energy<RECOVER_COST||m.cooldown>0||
           margin<0||margin>RECOVER_MARGIN||distance<1)return false;
        const nx=-m.x/distance,ny=-m.y/distance;
        m.energy-=RECOVER_COST;m.recoverUsed=true;m.cooldown=.70;m.anchored=0;
        // A genuine inward escape, not an invulnerability or a teleport.
        m.vx=nx*470;m.vy=ny*470;m.x+=nx*6;m.y+=ny*6;
        state.events.push({kind:'recover',id:m.id,x:m.x,y:m.y,time:state.time,
          margin,round:state.round});
        return true;
      }
      if(type==='anchor'){
        if(m.energy<15||m.cooldown>0)return false;
        m.energy-=15;m.anchored=.75;m.cooldown=.65;
        state.events.push({kind:'anchor',id:m.id,time:state.time});return true;
      }
      if(type==='ram'){
        if(m.energy<28||m.cooldown>0)return false;
        m.energy-=28;m.cooldown=.72;m.anchored=0;m.ramWindow=.58;
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
        m.cpuWait=(.33-.15*p.skill)+rng()*.23;
        const margin=state.radius-MARBLE_RADIUS-Math.hypot(m.x,m.y);
        if(margin<=RECOVER_MARGIN&&margin>=0&&!m.recoverUsed&&m.energy>=RECOVER_COST&&m.cooldown<=0){
          action(m.id,'recover');continue;
        }
        const pulseAt=SHOCK_TIMES[state.pulseIndex];
        if(pulseAt!=null&&pulseAt-state.elapsed<1.1&&pulseAt-state.elapsed>0&&
           margin<180&&m.energy>=15&&m.cooldown<=0){
          action(m.id,'anchor');continue;
        }
        const enemy=closest(m);
        if(!enemy)continue;
        const ang=Math.atan2(enemy.y-m.y,enemy.x-m.x);
        const spread=(rng()-.5)*(.75-p.skill*.62);
        const radial=Math.hypot(m.x,m.y);
        // Strong CPU racers prioritise survival over chasing someone off the rim.
        const retreat=radial>state.radius*(.72+.15*(1-p.skill));
        m.heading=(retreat?Math.atan2(-m.y,-m.x):ang)+spread;
        const distance=Math.hypot(enemy.x-m.x,enemy.y-m.y);
        if(!retreat&&distance<340&&m.energy>=28&&m.cooldown<=0)action(m.id,'ram');
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
            const chargeA=a.ramWindow>0,chargeB=b.ramWindow>0;
            const speedA=Math.hypot(a.vx,a.vy),speedB=Math.hypot(b.vx,b.vy);
            const attacker=chargeA&&!chargeB?a:
              chargeB&&!chargeA?b:
              chargeA&&chargeB?(speedA>=speedB?a:b):null;
            const victim=attacker?(attacker===a?b:a):null;
            if(attacker&&victim){
              victim.lastHitBy=attacker.id;victim.lastHitTime=state.time;
            }
            state.events.push({kind:'hit',id:a.id,other:b.id,impact:-vr,
              attacker:attacker?.id||null,time:state.time,x:(a.x+b.x)/2,y:(a.y+b.y)/2});
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
        const earned=points+m.glory;
        p.points+=earned;p.roundPoints.push(earned);p.roundRanks.push(i+1);
        p.knockouts+=m.kos;
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
        state.radius=rimRadius(state.elapsed) - (state.hazard==='crumbling' ? 14*Math.max(0,Math.sin(state.elapsed*1.35)) : 0);
        if(state.events.length>850)state.events.splice(0,state.events.length-850);
        cpuTick(dt);
        // 3, 2, 1 ... SHOCKWAVE! The warning is derived directly from
        // SHOCK_TIMES, so the TV and every phone always show the same clock.
        if(state.pulseIndex<SHOCK_TIMES.length&&
           state.elapsed>=SHOCK_TIMES[state.pulseIndex]){
          state.pulseIndex++;state.lastPulseAt=state.time;
          for(const m of state.marbles)if(m.alive){
            const distance=Math.hypot(m.x,m.y)||1;
            const push=m.anchored>0?72:310;
            m.vx+=m.x/distance*push;m.vy+=m.y/distance*push;
          }
          state.events.push({kind:'shockwave',round:state.round,
            pulse:state.pulseIndex,time:state.time});
        }
        // Pre-announced hazard affects only this deterministic physics step.
        state.hazardAngle+=dt*.9;
        for(const m of state.marbles){
          if(!m.alive)continue;
          m.cooldown=Math.max(0,m.cooldown-dt);
          m.anchored=Math.max(0,m.anchored-dt);
          m.ramWindow=Math.max(0,m.ramWindow-dt);
          m.energy=clamp(m.energy+19*dt,0,100);
          const onIce=state.hazard==='ice'&&Math.hypot(m.x-75,m.y+35)<140;
          const drag=Math.exp(-(m.anchored>0?7.2:onIce?.22:.8)*dt);
          m.vx*=drag;m.vy*=drag;
          // Inherent low thrust keeps the bowl lively and provides
          // manual steering between RAMs.
          if(m.anchored<=0){m.vx+=Math.cos(m.heading)*85*dt;m.vy+=Math.sin(m.heading)*85*dt;}
          m.x+=m.vx*dt;m.y+=m.vy*dt;
          const hazard=state.hazard==='bumpers'?[[125,60],[-110,-50]]:
            state.hazard==='rotor'?[[Math.cos(state.hazardAngle)*95,Math.sin(state.hazardAngle)*95]]:[];
          for(const [hx,hy] of hazard){
            const dx=m.x-hx,dy=m.y-hy,d=Math.hypot(dx,dy)||1;
            if(d<67){const nx=dx/d,ny=dy/d; m.x=hx+nx*67;m.y=hy+ny*67;
              m.vx+=nx*115;m.vy+=ny*115;
              if(m.cooldown<.1)state.events.push({kind:'hazardImpact',id:m.id,x:m.x,y:m.y,
                hazard:state.hazard,strength:1,time:state.time});}
          }
        }
        resolveHits();
        for(const m of state.marbles)if(m.alive&&Math.hypot(m.x,m.y)>state.radius-MARBLE_RADIUS){
          m.alive=false;m.eliminatedAt=state.elapsed;m.outs++;
          const attacker=m.lastHitBy&&state.time-m.lastHitTime<=2.6?
            current(m.lastHitBy):null;
          if(attacker&&attacker!==m){
            const bonus=state.round===ROUNDS?5:KO_BONUS;
            attacker.kos++;attacker.glory+=bonus;
            state.events.push({kind:'knockout',id:attacker.id,victim:m.id,
              bonus,x:m.x,y:m.y,round:state.round,time:state.time});
          }
          state.events.push({kind:'out',id:m.id,x:m.x,y:m.y,round:state.round,time:state.time});
          if(alive().length===2)state.events.push({kind:'lastTwo',round:state.round,time:state.time});
        }
        if(alive().length<=1||state.elapsed>=ROUND_TIME){finishRound();state.acc=0;break;}
      }
    }
    function hud(id){
      const p=roster.find(x=>x.id===id),m=current(id);
      if(!p)return {};
      const rimGap=m?.alive?state.radius-MARBLE_RADIUS-Math.hypot(m.x,m.y):null;
      const recoverReady=!!m?.alive&&!m.recoverUsed&&m.cooldown<=0&&
        m.energy>=RECOVER_COST&&rimGap>=0&&rimGap<=RECOVER_MARGIN;
      const pulseTime=SHOCK_TIMES[state.pulseIndex];
      const pulseIn=pulseTime==null?null:Math.max(0,pulseTime-state.elapsed);
      return {
        turnLabel:state.done?'BOWL BRAWL COMPLETE':`ROUND ${state.round}/${ROUNDS} · ${alive().length} IN THE BOWL`,
        roundScore:p.points,energy:Math.round(m?.energy||0),
        modePhase:state.done?'finished':m?.alive?'brawling':'eliminated',
        isTurn:!!m?.alive,
        hazard:state.hazard,
        pulseIn,
        edgeDistance:rimGap===null?null:Math.max(0,rimGap),
        recoverReady,
        recoveryUsed:!!m?.recoverUsed,
        knockouts:p.knockouts,bonus:m?.glory||0,
        modeControls:!m?.alive&&!state.done&&!state.spectators.has(id)?
          [{a:'spectate',label:'CHEER THE FINALISTS',v:0}]:m?.alive&&!state.done?[
          {a:'left',label:'◀ TURN',v:2},
          {a:'ram',label:'RAM!',v:0},
          {a:'right',label:'TURN ▶',v:2},
          {a:'anchor',label:'ANCHOR',v:0},
          ...(recoverReady?[{a:'recover',label:'SAVE YOUR MARBLE!',v:0}]:[])
        ]:[],
        modeHint:m?.alive?(
          recoverReady?'EDGE DANGER! Use your one recovery NOW.':
          pulseIn!=null&&pulseIn<=SHOCK_WARNING?
            'SHOCKWAVE IN '+pulseIn.toFixed(1)+'s! ANCHOR braces against the blast.':
          m.recoverUsed?'Lifeline used · RAM 28 · ANCHOR 15':
          'RAM for KO bonuses · RECOVER once near the rim'):
          'Out! Cheer the final duel and get ready for the next round',
        timeRemaining:Math.max(0,Math.ceil(ROUND_TIME-state.elapsed))
      };
    }
    function draw(){ /* Party Pack v2: legacy graphics deleted; renderer lives in party-ui-v2.js. */ }
    return {state,current,action,tick,hud,draw,standings,alive,finishRound,rimRadius};
  }
  return Object.freeze({create,ROUNDS,ROUND_TIME,START_RADIUS,END_RADIUS,
    SHOCK_TIMES,SHOCK_WARNING,RECOVER_COST,RECOVER_MARGIN,KO_BONUS});
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
