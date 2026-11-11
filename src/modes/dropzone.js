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
      color:typeof p.color==='string'?p.color:COLORS[i],cpu:!!p.cpu,skill:p.difficulty==='hard'?.85:p.difficulty==='easy'?.25:.55,
      score:0,drops:0,results:[]
    }));
    const s={roster,seed,random,turn:0,round:1,x:500,ball:null,balls:[],
      elapsed:0,turnElapsed:0,done:false,finishedCalled:false,steps:0,
      activeSeed:0,autoAt:0,pegs:PEGS,last:0,gold:[],jackpotBin:4,events:[],predictions:new Map()};
    function setRoundFeatures(){
      // Select stable gold pegs and moving jackpot using the seeded simulation RNG.
      const first=Math.floor(random()*PEGS.length);
      const second=(first+9+Math.floor(random()*(PEGS.length-10)))%PEGS.length;
      s.gold=[first,second];s.jackpotBin=2+Math.floor(random()*4);
      s.predictions=new Map();
      s.events.push({kind:'round_start',round:s.round,gold:s.gold.slice(),jackpot:s.jackpotBin,time:s.elapsed});
    }
    setRoundFeatures();
    function current(){return s.roster[s.turn%s.roster.length]||null;}
    function owner(){return current();}
    function action(pid,a,v){
      if(a==='predict'){
        if(s.done||!s.ball||pid===owner()?.id||!s.roster.some(p=>p.id===pid)||
           s.predictions.has(pid)||!Number.isInteger(v)||v<0||v>=BINS.length)return false;
        s.predictions.set(pid,v);
        s.events.push({kind:'prediction',id:pid,bin:v,round:s.round,time:s.elapsed});return true;
      }
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
          t:0,settled:0,bin:-1,scored:false,color:p.color,multiplier:1,goldHit:[]};
        s.ball=b;s.balls.push(b);s.turnElapsed=0;s.predictions=new Map();
        s.events.push({kind:'release',id:p.id,x:b.x,round:s.round,time:s.elapsed});return true;
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
      const base=BINS[b.bin],p=owner();
      // Upgrade only to a valid existing bin award to preserve old game
      // contracts and score ledger while making gold encounters worthwhile.
      const bonus=Math.min(1000,base*2);
      let score=b.multiplier===2&&BINS.includes(bonus)?bonus:base;
      if(s.round===ROUNDS&&b.bin===s.jackpotBin&&score<1000){
        b.jackpot=true;score=1000;
        s.events.push({kind:'jackpot',x:b.x,y:b.y,score:1000,round:s.round,time:s.elapsed});
      }
      s.events.push({kind:'bucket',id:p.id,x:b.x,y:b.y,bin:b.bin,score,
        multiplier:b.multiplier,round:s.round,time:s.elapsed});
      p.score+=score;p.drops++;p.results.push(score);s.last=score;
      s.ball=null;s.turn++;s.turnElapsed=0;
      if(s.turn>=s.roster.length*ROUNDS){
        s.done=true;
        if(!s.finishedCalled){s.finishedCalled=true;onFinish(standings());}
      }else{const oldRound=s.round;s.round=Math.floor(s.turn/s.roster.length)+1;s.x=500;
        if(s.round!==oldRound)setRoundFeatures();}
    }
    function step(dt){
      if(s.done)return;
      dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
      s.elapsed+=dt;s.turnElapsed+=dt;
      if(s.round===ROUNDS){
        const bin=2+Math.round((1+Math.sin(s.elapsed*.85))*1.5);
        if(bin!==s.jackpotBin){s.jackpotBin=bin;
          s.events.push({kind:'jackpotMove',bin,time:s.elapsed,round:s.round});}
      }
      if(s.events.length>700)s.events.splice(0,s.events.length-700);
      if(!s.ball){
        if((owner().cpu&&s.turnElapsed>=.75)||s.turnElapsed>=10){
          // After 25 seconds of inactivity, release automatically so a
          // disconnected or distracted player cannot stall the whole party.
          const target=owner().score<500?500:500+(random()-.5)*250;
          if(owner().cpu){
            const p=owner(),gold=PEGS[s.gold[Math.floor(random()*s.gold.length)]];
            const focus=gold?.x||target;
            s.x=clamp(Math.round(focus+(random()-.5)*180*(1-p.skill)),80,920);
          }
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
          {collision(b,peg.x,peg.y,peg.r,.75);
            const index=PEGS.indexOf(peg);
            if(s.gold.includes(index)&&!b.goldHit.includes(index)){
              b.goldHit.push(index);b.multiplier=2;
              s.events.push({kind:'goldPeg',id:b.id,x:peg.x,y:peg.y,
                strength:1,round:s.round,time:s.elapsed});
            } else if(b.goldHit.length<1&&b.t<8&&s.events.length<500 && s.steps%8===0){
              s.events.push({kind:'pegImpact',x:peg.x,y:peg.y,strength:.5,time:s.elapsed});
            }
          }
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
      const prediction=!turn&&!s.done&&!!s.ball&&!s.predictions.has(id);
      return {turnLabel:s.done?'DROP ZONE COMPLETE':`Round ${s.round}/${ROUNDS} · ${o?.name||''}${turn?' — YOUR TURN':''}`,
        roundScore:p.score,power:null,aim:Math.round(s.x),
        modeControls:prediction?BINS.map((value,index)=>({a:'predict',v:index,label:'◈ '+value})):turn?[
          {a:'left',label:'◀ LEFT',v:2},
          {a:'drop',label:'DROP!',v:0},
          {a:'right',label:'RIGHT ▶',v:2}
        ]:[],
        isTurn:turn||prediction,modePhase:s.done?'finished':s.ball?'falling':'aim',totalScore:p.score,
        ghostX:Math.round(s.x),goldPegs:s.gold.slice(),jackpotBin:s.jackpotBin,aimSeconds:Math.ceil(Math.max(0,10-s.turnElapsed))};
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
  onInput(pid,k){if(k==='p')dropZoneGame?.action(pid,'drop');},
  onAction(pid,a,v){return dropZoneGame?.action(pid,a,v)||false;},
  botTick(){},
  hud(player){return dropZoneGame?.hud(player.id)||{};},
  standings(){return dropZoneGame?.standings()||[];},
  roundResults(){return dropZoneGame?.standings()||[];},
  finalResults(){return dropZoneGame?.standings()||[];},
  session(){return dropZoneGame;}
});
