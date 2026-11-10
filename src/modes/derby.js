/* MARBLE RUSH — Phase 5 Marble Derby
 * Fully virtual, no money or cash-out. Seeded five-heat racing with
 * private per-player picks, gem stakes, odds, cheer and cumulative standings.
 * Deterministic fixed-time simulation; no DOM, external RNG or network.
 */
const MarbleDerby=(()=>{
  'use strict';
  const ROUNDS=5,HORSES=6,LENGTH=1500,START_GEMS=600,MAX_HEAT=24;
  const STAKES=[25,50,100,200];
  const COLORS=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d'];
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const randomFrom=(seed)=>{let x=seed>>>0;return()=>((x=(Math.imul(1664525,x)+1013904223)>>>0)/4294967296);};
  function create(players,seed=1,onFinish=()=>{}){
    if(!Array.isArray(players)||players.length<1||players.length>8||
      players.some(p=>!p||typeof p.id!=='string'||!p.id)||
      new Set(players.map(p=>p.id)).size!==players.length)throw Error('Marble Derby needs 1–8 unique racers');
    const rnd=randomFrom(seed);
    const roster=players.map((p,i)=>({id:p.id,name:String(p.name||'Player '+(i+1)).slice(0,16),
      cpu:!!p.cpu,color:typeof p.color==='string'?p.color:COLORS[i%6],
      gems:START_GEMS,won:0,successful:0,bets:[],totalProfit:0,stipends:0}));
    const state={seed,roster,round:0,phase:'betting',phaseTime:0,time:0,
      horses:[],wagers:new Map(),cheers:new Set(),history:[],done:false,finishedCalled:false,
      lastWinner:null,showResultsFor:2.5,acc:0};
    const getPlayer=id=>roster.find(p=>p.id===id);
    const standings=()=>roster.slice().sort((a,b)=>b.gems-a.gems||b.successful-a.successful||
      b.totalProfit-a.totalProfit||roster.indexOf(a)-roster.indexOf(b));
    function newHeat(){
      state.round++;state.phase='betting';state.phaseTime=0;state.wagers=new Map();
      state.cheers=new Set();state.lastWinner=null;
      state.horses=Array.from({length:HORSES},(_,i)=>{
        const form=.91+rnd()*.18;
        const odds= +(clamp(3.5+(1.02-form)*9,2.0,5.5)).toFixed(1);
        return {id:i,name:['Rocket','Whirlwind','Comet','Gold Rush','Lightning','Lucky'][i],
          color:COLORS[i],x:0,v:0,form,odds,pulse:rnd()*6.28,finishedAt:null};
      });
      // Guarantee every player can continue; fresh gems are a controlled
      // virtual stipend, not a debit or a negative wallet.
      for(const p of roster)if(p.gems<STAKES[0]){p.gems+=100;p.stipends+=100;}
    }
    function bet(id,horse,stake){
      const p=getPlayer(id);
      if(!p||state.done||state.phase!=='betting'||state.wagers.has(id)||
        !Number.isInteger(horse)||horse<0||horse>=HORSES||
        !STAKES.includes(stake)||p.gems<stake)return false;
      p.gems-=stake;
      state.wagers.set(id,{horse,stake,odds:state.horses[horse].odds});
      return true;
    }
    function action(id,type,value){
      if(!getPlayer(id)||state.done)return false;
      if(type==='bet'&&value&&typeof value==='object'&&Object.keys(value).length<=3)
        return bet(id,value.horse,value.stake);
      if(type==='cheer'&&state.phase==='racing'){
        const wager=state.wagers.get(id);
        if(!wager||state.cheers.has(id))return false;
        state.cheers.add(id);
        const h=state.horses[wager.horse];
        // A small one-off encouragement, capped to preserve race variance.
        if(h.finishedAt===null)h.v+=18;
        return true;
      }
      return false;
    }
    function settle(){
      if(state.phase!=='racing')return;
      const placed=state.horses.slice().sort((a,b)=>(a.finishedAt??Infinity)-(b.finishedAt??Infinity)||
        b.x-a.x||a.id-b.id);
      const winner=placed[0];
      state.lastWinner=winner.id;
      for(const p of roster){
        const b=state.wagers.get(p.id);
        const payout=b&&b.horse===winner.id?Math.floor(b.stake*b.odds):0;
        if(payout){p.gems+=payout;p.won+=payout;p.successful++;}
        p.totalProfit+=payout-(b?.stake||0);
        p.bets.push({round:state.round,horse:b?.horse??null,stake:b?.stake||0,
          odds:b?.odds||0,winner:winner.id,payout});
      }
      state.history.push({round:state.round,winner:winner.id,
        places:placed.map(h=>h.id),bets:roster.map(p=>({id:p.id,...p.bets[p.bets.length-1]}))});
      state.phase='results';state.phaseTime=0;
    }
    function complete(){
      if(state.done)return;
      state.done=true;state.phase='finished';
      if(!state.finishedCalled){state.finishedCalled=true;onFinish(standings());}
    }
    function autoPick(){
      for(const p of roster)if(!state.wagers.has(p.id)){
        const choice=p.cpu?Math.floor(rnd()*HORSES):Math.floor(rnd()*HORSES);
        const affordable=STAKES.filter(x=>x<=p.gems);
        const stake=p.cpu?affordable[Math.min(affordable.length-1,Math.floor(rnd()*3))]:
          affordable[0];
        if(stake!=null)bet(p.id,choice,stake);
      }
    }
    function step(delta){
      if(state.done)return;
      const dt=Number.isFinite(delta)?clamp(delta,0,.1):0;
      state.acc+=dt;
      let steps=0;
      while(state.acc>=1/60-1e-9&&steps++<7&&!state.done){
        const h=1/60;state.acc-=h;state.time+=h;state.phaseTime+=h;
        if(state.phase==='betting'){
          // CPU bets after a brief pause. Humans get 12 seconds to pick.
          if(state.phaseTime>=.55)for(const p of roster)if(p.cpu&&!state.wagers.has(p.id)){
            const horse=Math.floor(rnd()*HORSES),afford=STAKES.filter(x=>x<=p.gems);
            bet(p.id,horse,afford[Math.min(afford.length-1,Math.floor(rnd()*3))]||25);
          }
          if(state.wagers.size===roster.length||state.phaseTime>=12){
            autoPick();state.phase='racing';state.phaseTime=0;
          }
        }else if(state.phase==='racing'){
          for(const horse of state.horses){
            if(horse.finishedAt!==null)continue;
            const pulse=Math.sin(state.time*3.4+horse.pulse)*7;
            const target=145*horse.form+pulse;
            horse.v+=(target-horse.v)*Math.min(1,h*2.2);
            horse.v=Math.max(40,horse.v);
            horse.x+=horse.v*h;
            if(horse.x>=LENGTH){
              horse.x=LENGTH;horse.finishedAt=state.phaseTime;
            }
          }
          if(state.horses.every(x=>x.finishedAt!==null)||state.phaseTime>=MAX_HEAT){
            // Timeouts rank by distance; every race always settles.
            settle();
          }
        }else if(state.phase==='results'&&state.phaseTime>=state.showResultsFor){
          if(state.round>=ROUNDS)complete();
          else newHeat();
        }
      }
    }
    function hud(id){
      const p=getPlayer(id);if(!p)return {};
      const pick=state.wagers.get(id),canBet=state.phase==='betting'&&!pick;
      const controls=[];
      if(canBet)for(const h of state.horses){
        const stake=p.gems>=50?50:25;
        controls.push({a:'bet',label:h.name+' ('+h.odds+'×)',v:{horse:h.id,stake}});
      }
      if(state.phase==='racing'&&pick&&!state.cheers.has(id))
        controls.push({a:'cheer',label:'CHEER '+state.horses[pick.horse].name+'!',v:0});
      return {
        turnLabel:`Heat ${state.round}/${ROUNDS} · ${state.phase.toUpperCase()}`,
        roundScore:p.gems,gems:p.gems,modePhase:state.phase,
        modeControls:controls,isTurn:canBet||state.phase==='racing'&&!!pick,
        modeHint:pick?`Backed ${state.horses[pick.horse].name} for ${pick.stake} gems`:
          state.phase==='betting'?'Pick a runner and place your gems':'Watch the race',
        myBet:pick?{horse:pick.horse,stake:pick.stake}:null,
        secondsLeft:state.phase==='betting'?Math.max(0,Math.ceil(12-state.phaseTime)):0
      };
    }
    function draw(ctx,w=1920,h=1080){
      ctx.save();ctx.scale(w/1920,h/1080);
      const bg=ctx.createLinearGradient(0,0,1920,1080);
      bg.addColorStop(0,'#141833');bg.addColorStop(1,'#42345a');
      ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);
      ctx.fillStyle='#fff6d8';ctx.font='bold 70px Fredoka,sans-serif';
      ctx.fillText('MARBLE DERBY',65,85);
      ctx.fillStyle='#ffd46b';ctx.font='bold 30px Nunito,sans-serif';
      ctx.fillText(`HEAT ${state.round} OF ${ROUNDS}   ·   ${state.phase.toUpperCase()}`,70,142);
      const tx=510,ty=210,tw=1350,lane=104;
      ctx.fillStyle='#755044';ctx.fillRect(tx,ty,tw,628);
      for(let i=0;i<HORSES;i++){
        ctx.fillStyle=i%2?'#93614d':'#ac785c';ctx.fillRect(tx,ty+i*lane,tw,lane);
        ctx.strokeStyle='#e8cda0';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(tx,ty+i*lane);ctx.lineTo(tx+tw,ty+i*lane);ctx.stroke();
        const horse=state.horses[i],x=tx+35+horse.x/LENGTH*(tw-100),y=ty+i*lane+lane/2;
        const g=ctx.createRadialGradient(x-12,y-12,3,x,y,30);
        g.addColorStop(0,'#fff');g.addColorStop(.25,horse.color);g.addColorStop(1,'#25244a');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,28,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#fff0ce';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#fff6e7';ctx.font='bold 23px Nunito,sans-serif';
        ctx.fillText(horse.name,tx+18,ty+i*lane+35);
        ctx.fillStyle='#ffdd6b';ctx.font='bold 21px Nunito,sans-serif';
        ctx.fillText(horse.odds.toFixed(1)+'×',tx+235,ty+i*lane+35);
      }
      ctx.strokeStyle='#fff5e6';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(tx+tw-60,ty);ctx.lineTo(tx+tw-60,ty+624);ctx.stroke();
      ctx.fillStyle='#fff4e0';ctx.font='bold 34px Fredoka,sans-serif';
      ctx.fillText('THE GEM CLUB',70,255);
      roster.forEach((p,i)=>{
        const y=320+i*72;
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(91,y-13,15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff7e8';ctx.font='bold 25px Nunito,sans-serif';ctx.fillText(p.name,120,y);
        ctx.fillStyle='#ffdb77';ctx.font='bold 22px Nunito,sans-serif';ctx.fillText(p.gems+' gems',120,y+27);
      });
      ctx.font='bold 27px Nunito,sans-serif';ctx.fillStyle='#fff4e0';
      const message=state.phase==='betting'?'BACK YOUR MARBLE — 12 SECONDS':
        state.phase==='racing'?'THEY ARE OFF!':
        state.phase==='results'?'WINNER: '+state.horses[state.lastWinner].name:
        'THE DERBY IS COMPLETE';
      ctx.fillText(message,520,937);
      ctx.font='bold 21px Nunito,sans-serif';ctx.fillStyle='#ffd46b';
      ctx.fillText('All gems are virtual game points. No cash or prizes.',530,1000);
      ctx.restore();
    }
    newHeat();
    return {state,bet,action,step,hud,draw,standings,getPlayer};
  }
  return Object.freeze({create,ROUNDS,HORSES,LENGTH,STAKES,START_GEMS});
})();
if(typeof module!=='undefined')module.exports=MarbleDerby;
let marbleDerbyGame=null;
registerMode({
  id:'derby',name:'Marble Derby',tagline:'Back a marble, cheer it home',icon:'🏇',
  minPlayers:1,maxPlayers:8,roundsDefault:5,available:true,awards:[],
  setup({players,seed,onFinish}){marbleDerbyGame=MarbleDerby.create([...players.values()],seed,onFinish);return marbleDerbyGame;},
  startRound(){return marbleDerbyGame;},
  tick(dt){marbleDerbyGame?.step(dt);},
  draw(ctx,w,h){marbleDerbyGame?.draw(ctx,w,h);},
  onInput(id,k){if(k==='p')marbleDerbyGame?.action(id,'cheer');},
  onAction(id,a,v){return marbleDerbyGame?.action(id,a,v)||false;},
  botTick(){},
  hud(player){return marbleDerbyGame?.hud(player.id)||{};},
  standings(){return marbleDerbyGame?.standings()||[];},
  roundResults(){return marbleDerbyGame?.standings()||[];},
  finalResults(){return marbleDerbyGame?.standings()||[];},
  session(){return marbleDerbyGame;}
});
