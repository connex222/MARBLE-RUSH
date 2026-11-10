/* MARBLE RUSH — Drop Zone, Phase 3.
 * Self-contained deterministic five-round plinko game. 1920×1080 TV canvas.
 * Simulation coordinates use a 1000×800 board with fixed 1/120s physics.
 */
const DropZone = (() => {
  'use strict';
  const WIDTH=1000, HEIGHT=800, R=12, STEP=1/120, ROUNDS=5;
  const BINS=[50,100,200,500,1000,500,200,100];
  const COLORS=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d','#a7deed','#ffd4a2'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);}
  function pegs(){
    const out=[];
    for(let row=0;row<10;row++){
      const count=row%2===0?9:8, dx=92, first=row%2===0?132:178;
      for(let col=0;col<count;col++)out.push({x:first+col*dx,y:160+row*46,r:9});
    }
    return out;
  }
  const PEGS=pegs();
  function create(players,seed=1,onFinish=()=>{}){
    if(!Array.isArray(players)||players.length<1||players.length>8 ||
       new Set(players.map(p=>p.id)).size!==players.length ||
       players.some(p=>!p||typeof p.id!=='string'||!p.id))throw Error('Drop Zone requires 1–8 distinct players');
    const random=rng(seed), roster=players.map((p,i)=>({
      id:p.id,name:String(p.name||('Player '+(i+1))).slice(0,16),
      color:typeof p.color==='string'?p.color:COLORS[i],cpu:!!p.cpu,
      score:0,drops:0,results:[]
    }));
    const s={roster,seed,random,turn:0,round:1,x:500,ball:null,balls:[],
      elapsed:0,turnElapsed:0,done:false,finishedCalled:false,steps:0,
      activeSeed:0,autoAt:0,pegs:PEGS,last:0};
    function current(){return s.roster[s.turn%s.roster.length]||null;}
    function owner(){return current();}
    function action(pid,a,v){
      if(s.done||s.ball||!owner()||pid!==owner().id)return false;
      if(a==='left'||a==='right'){
        const n=Number.isInteger(v)?clamp(v,1,5):1;
        s.x=clamp(s.x+(a==='left'?-n:n)*21,80,920);return true;
      }
      if(a==='aim'&&Number.isFinite(v)&&v>=80&&v<=920){
        s.x=clamp(Math.round(v),80,920);return true;
      }
      if(a==='drop'){
        const p=owner();
        const b={id:p.id,x:s.x,y:35,vx:(random()-.5)*16,vy:12,r:R,
          t:0,settled:0,bin:-1,scored:false,color:p.color};
        s.ball=b;s.balls.push(b);s.turnElapsed=0;return true;
      }
      return false;
    }
    function collision(b,cx,cy,r,e){
      const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||.0001,sum=b.r+r;
      if(d>=sum)return;
      const nx=dx/d,ny=dy/d;
      b.x+=nx*(sum-d);b.y+=ny*(sum-d);
      const vn=b.vx*nx+b.vy*ny;
      if(vn<0){b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;}
    }
    function finishBall(){
      const b=s.ball;if(!b||b.scored)return;
      b.scored=true;b.bin=clamp(Math.floor((b.x-80)/105),0,BINS.length-1);
      const score=BINS[b.bin],p=owner();
      p.score+=score;p.drops++;p.results.push(score);s.last=score;
      s.ball=null;s.turn++;s.turnElapsed=0;
      if(s.turn>=s.roster.length*ROUNDS){
        s.done=true;
        if(!s.finishedCalled){s.finishedCalled=true;onFinish(standings());}
      }else{s.round=Math.floor(s.turn/s.roster.length)+1;s.x=500;}
    }
    function step(dt){
      if(s.done)return;
      dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
      s.elapsed+=dt;s.turnElapsed+=dt;
      if(!s.ball){
        if((owner().cpu&&s.turnElapsed>=.75)||s.turnElapsed>=25){
          // After 25 seconds of inactivity, release automatically so a
          // disconnected or distracted player cannot stall the whole party.
          const target=owner().score<500?500:500+(random()-.5)*250;
          if(owner().cpu)s.x=clamp(Math.round(target+(random()-.5)*100),80,920);
          action(owner().id,'drop');
        }
        return;
      }
      const b=s.ball;
      for(let k=0;k<Math.min(15,Math.ceil(dt/STEP));k++){
        const h=Math.min(STEP,dt-k*STEP);if(h<=0)break;
        b.t+=h;s.steps++;b.vy+=960*h;b.vx*=Math.max(0,1-.05*h);
        b.x+=b.vx*h;b.y+=b.vy*h;
        if(b.x<80+b.r){b.x=80+b.r;b.vx=Math.abs(b.vx)*.74;}
        if(b.x>920-b.r){b.x=920-b.r;b.vx=-Math.abs(b.vx)*.74;}
        for(const peg of PEGS)if(Math.abs(b.x-peg.x)<b.r+peg.r&&Math.abs(b.y-peg.y)<b.r+peg.r)
          collision(b,peg.x,peg.y,peg.r,.75);
        // A small oscillating rotating bumper and a moving gate.
        const sx=500+110*Math.sin(s.elapsed*1.2),sy=480;
        collision(b,sx,sy,19,.8);
        const gx=500+115*Math.sin(s.elapsed*.9);
        if(b.y>590&&b.y<607&&Math.abs(b.x-gx)<55){
          collision(b,gx,598,25,.75);
        }
        if(b.y>=710){
          b.y=710;b.vy=-Math.abs(b.vy)*.3;b.vx*=.82;
          b.settled+=h;
        }
        // Safety guard for pathological physics: every dropped marble scores.
        if(b.settled>=.4||b.t>=10){finishBall();break;}
      }
    }
    function standings(){return s.roster.slice().sort((a,b)=>b.score-a.score||
      b.results.filter(n=>n===1000).length-a.results.filter(n=>n===1000).length||
      s.roster.indexOf(a)-s.roster.indexOf(b));}
    function hud(id){
      const p=s.roster.find(x=>x.id===id),o=owner();
      if(!p)return {};
      const turn=!s.done&&o?.id===id&&!s.ball;
      return {turnLabel:s.done?'DROP ZONE COMPLETE':`Round ${s.round}/${ROUNDS} · ${o?.name||''}${turn?' — YOUR TURN':''}`,
        roundScore:p.score,power:null,aim:Math.round(s.x),
        modeControls:turn?[
          {a:'left',label:'◀ LEFT',v:2},
          {a:'drop',label:'DROP!',v:0},
          {a:'right',label:'RIGHT ▶',v:2}
        ]:[],
        isTurn:turn,modePhase:s.done?'finished':s.ball?'falling':'aim',totalScore:p.score};
    }
    function draw(ctx,w=1920,h=1080){
      const sx=w/1920,sy=h/1080;
      ctx.save();ctx.scale(sx,sy);
      const bg=ctx.createLinearGradient(0,0,1920,1080);
      bg.addColorStop(0,'#14173b');bg.addColorStop(1,'#393065');
      ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);
       MarblePartyStage.backdrop(ctx,'dropzone',s.elapsed);
       MarblePartyStage.frame(ctx,523,112,935,818,'dropzone');
      ctx.fillStyle='#fff4e0';ctx.font='bold 66px Fredoka,sans-serif';ctx.fillText('DROP ZONE',75,92);
      ctx.fillStyle='#ffd23f';ctx.font='bold 27px Nunito,sans-serif';
      ctx.fillText(`ROUND ${Math.min(s.round,ROUNDS)} / ${ROUNDS}    ·    ${s.turn}/${s.roster.length*ROUNDS} DROPS`,77,138);
      ctx.save();ctx.translate(445,130);ctx.scale(1.08,1.02);
      const wood=ctx.createLinearGradient(0,0,1000,800);
      wood.addColorStop(0,'#e5b577');wood.addColorStop(1,'#ab784b');
      ctx.fillStyle=wood;ctx.fillRect(73,0,854,740);
      ctx.fillStyle='#28345b';ctx.fillRect(80,0,840,710);
      ctx.strokeStyle='#ffe9ae';ctx.lineWidth=11;ctx.strokeRect(80,0,840,740);
      for(const peg of PEGS){
        ctx.beginPath();ctx.fillStyle='#dcc3a0';ctx.arc(peg.x,peg.y,peg.r,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.fillStyle='#fff4d5';ctx.arc(peg.x-3,peg.y-3,2,0,Math.PI*2);ctx.fill();
      }
      const gx=500+115*Math.sin(s.elapsed*.9);
      ctx.strokeStyle='#f7a76c';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(gx-55,598);ctx.lineTo(gx+55,598);ctx.stroke();
      ctx.fillStyle='#d7a5f2';ctx.beginPath();ctx.arc(500+110*Math.sin(s.elapsed*1.2),480,19,0,Math.PI*2);ctx.fill();
      for(let i=0;i<BINS.length;i++){
        const x=80+i*105;
        ctx.fillStyle=i===4?'#a24f57':'#3c6381';ctx.fillRect(x,712,105,65);
        ctx.fillStyle='#ffe8c0';ctx.fillRect(x,710,4,67);
        ctx.fillStyle='#fff4e0';ctx.textAlign='center';ctx.font='bold 24px Nunito,sans-serif';
        ctx.fillText(String(BINS[i]),x+52,748);
      }
      if(!s.done&&!s.ball){
        ctx.strokeStyle='#ffe083';ctx.lineWidth=5;
        ctx.beginPath();ctx.moveTo(s.x,8);ctx.lineTo(s.x,90);ctx.stroke();
        ctx.fillStyle='#ff3b5c';ctx.beginPath();ctx.arc(s.x,35,R,0,Math.PI*2);ctx.fill();
      }
      const balls=s.ball?[s.ball]:[];
      for(const b of balls){
        const grad=ctx.createRadialGradient(b.x-5,b.y-6,2,b.x,b.y,R);
        grad.addColorStop(0,'#fff');grad.addColorStop(.3,b.color);grad.addColorStop(1,'#172144');
        ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle='#fff4e0';ctx.font='bold 36px Fredoka,sans-serif';
      ctx.fillText(s.done?'FINAL SCORES':`NOW DROPPING: ${owner()?.name||''}`,55,260);
      ctx.font='bold 28px Nunito,sans-serif';
      for(let i=0;i<s.roster.length;i++){
        const p=s.roster[i],y=318+i*72;
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(78,y-10,16,0,2*Math.PI);ctx.fill();
        ctx.fillStyle='#fff4e0';ctx.fillText(p.name.slice(0,13),108,y);
        ctx.fillStyle='#ffd23f';ctx.fillText(p.score+' pts',108,y+32);
      }
      ctx.fillStyle='#fff4e0';ctx.font='bold 28px Nunito,sans-serif';
      ctx.fillText(s.done?'Game complete':s.ball?'Bouncing through the pegs…':'Move left or right, then DROP',53,1010);
      ctx.restore();
    }
    return {state:s,owner,action,step,standings,hud,draw,finishBall};
  }
  return Object.freeze({create,PEGS,BINS,ROUNDS,WIDTH,HEIGHT});
})();
if(typeof module!=='undefined')module.exports=DropZone;
let dropZoneGame=null;
registerMode({
  id:'dropzone',name:'Drop Zone',tagline:'Drop, bounce, bank it',icon:'🎯',
  minPlayers:1,maxPlayers:8,roundsDefault:5,available:true,awards:[],
  setup({players,seed,onFinish}) {
    dropZoneGame=DropZone.create([...players.values()],seed,onFinish);
    return dropZoneGame;
  },
  startRound(){return dropZoneGame;},
  tick(dt){dropZoneGame?.step(dt);},
  draw(ctx,w,h){dropZoneGame?.draw(ctx,w,h);},
  onInput(pid,k){if(k==='p')dropZoneGame?.action(pid,'drop');},
  onAction(pid,a,v){return dropZoneGame?.action(pid,a,v)||false;},
  botTick(){},
  hud(player){return dropZoneGame?.hud(player.id)||{};},
  standings(){return dropZoneGame?.standings()||[];},
  roundResults(){return dropZoneGame?.standings()||[];},
  finalResults(){return dropZoneGame?.standings()||[];},
  session(){return dropZoneGame;}
});
