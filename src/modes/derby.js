/* MARBLE RUSH — Phase 5 Marble Derby
 * Fully virtual, no money or cash-out. Seeded five-heat racing with
 * private per-player picks, gem stakes, odds, cheer and cumulative standings.
 * Deterministic fixed-time simulation; no DOM, external RNG or network.
 */
const MarbleDerby=(()=>{
  'use strict';
  const ROUNDS=5,HORSES=6,LENGTH=1500,START_GEMS=600,MAX_HEAT=24;
  const STAKES=[25,50,100,200];
  const COURSES=Object.freeze(['Straight Sprint','Hurdle Run','Muddy Bend','Endurance Run','Championship Dash']);
  const COLORS=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#df9cf1','#ff973d'];
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const randomFrom=(seed)=>{let x=seed>>>0;return()=>((x=(Math.imul(1664525,x)+1013904223)>>>0)/4294967296);};
  function create(players,seed=1,onFinish=()=>{}){
    if(!Array.isArray(players)||players.length<1||players.length>8||
      players.some(p=>!p||typeof p.id!=='string'||!p.id)||
      new Set(players.map(p=>p.id)).size!==players.length)throw Error('Marble Derby needs 1–8 unique racers');
    const rnd=randomFrom(seed);
    const roster=players.map((p,i)=>({id:p.id,name:String(p.name||'Player '+(i+1)).slice(0,16),
      cpu:!!p.cpu,skill:p.difficulty==='hard'?.85:p.difficulty==='easy'?.25:.55,color:typeof p.color==='string'?p.color:COLORS[i%6],
      gems:START_GEMS,won:0,successful:0,bets:[],totalProfit:0,stipends:0,stake:50}));
    const state={seed,roster,round:0,phase:'betting',phaseTime:0,time:0,
      horses:[],wagers:new Map(),cheers:new Set(),history:[],done:false,finishedCalled:false,
      lastWinner:null,showResultsFor:2.5,acc:0,events:[],hype:0,course:COURSES[0]};
    const getPlayer=id=>roster.find(p=>p.id===id);
    const standings=()=>roster.slice().sort((a,b)=>b.gems-a.gems||b.successful-a.successful||
      b.totalProfit-a.totalProfit||roster.indexOf(a)-roster.indexOf(b));
    function newHeat(){
      state.round++;state.phase='betting';state.phaseTime=0;state.wagers=new Map();
      state.cheers=new Set();state.lastWinner=null;state.hype=0;
      state.course=COURSES[state.round-1];
      state.events.push({kind:'heat_start',round:state.round,course:state.course,time:state.time});
      state.horses=Array.from({length:HORSES},(_,i)=>{
        const form=.91+rnd()*.18;
        const speed=.86+rnd()*.24,endurance=.84+rnd()*.3,consistency=.84+rnd()*.3;
        const odds= +(clamp(3.5+(1.02-form)*9,2.0,5.5)).toFixed(1);
        return {id:i,name:['Rocket','Whirlwind','Comet','Gold Rush','Lightning','Lucky'][i],
          color:COLORS[i],x:0,v:0,form,odds,speed,endurance,consistency,
          pulse:rnd()*6.28,finishedAt:null,surgeUsed:false};
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
      state.events.push({kind:'bet_locked',id,horse,stake,round:state.round,time:state.time});
      return true;
    }
    function action(id,type,value){
      if(!getPlayer(id)||state.done)return false;
      if(type==='stake'&&state.phase==='betting'&&!state.wagers.has(id)&&STAKES.includes(value)&&getPlayer(id).gems>=value){getPlayer(id).stake=value;return true;}
      if(type==='bet'&&value&&typeof value==='object'&&Object.keys(value).length<=3)
        return bet(id,value.horse,value.stake);
      if(type==='cheer'&&state.phase==='racing'){
        const wager=state.wagers.get(id);
        if(!wager||state.cheers.has(id))return false;
        state.cheers.add(id);
        const h=state.horses[wager.horse];
        // A small one-off encouragement, capped to preserve race variance.
        if(h.finishedAt===null)h.v+=18;
        state.hype=Math.min(100,state.hype+Math.round(100/roster.length));
        state.events.push({kind:'cheer',id,horse:h.id,x:h.x,strength:18,time:state.time});
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
      const second=placed[1];
      if(second && winner.finishedAt!==null&&second.finishedAt!==null&&
         second.finishedAt-winner.finishedAt<.25)
        state.events.push({kind:'photoFinish',winner:winner.id,other:second.id,
          gap:second.finishedAt-winner.finishedAt,time:state.time});
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
      state.events.push({kind:'payout',winner:winner.id,round:state.round,time:state.time});
    }
    function complete(){
      if(state.done)return;
      state.done=true;state.phase='finished';
      if(!state.finishedCalled){state.finishedCalled=true;onFinish(standings());}
    }
    function autoPick(){
      for(const p of roster)if(!state.wagers.has(p.id)){
        const choice=p.cpu?state.horses.slice().sort((a,b)=>
          (b.speed*.45+b.endurance*.3+b.consistency*.25)-(a.speed*.45+a.endurance*.3+a.consistency*.25))[0].id:
          Math.floor(rnd()*HORSES);
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
            const maxForm=Math.max(...state.horses.map(h=>h.speed*.45+h.endurance*.3+h.consistency*.25));
            const best=state.horses.filter(h=>Math.abs(h.speed*.45+h.endurance*.3+h.consistency*.25-maxForm)<.07);
            const horse=(rnd()<p.skill?best[Math.floor(rnd()*best.length)]:state.horses[Math.floor(rnd()*HORSES)]).id,
              afford=STAKES.filter(x=>x<=p.gems);
            bet(p.id,horse,afford[Math.min(afford.length-1,Math.floor(rnd()*3))]||25);
          }
          if(state.wagers.size===roster.length||state.phaseTime>=12){
            autoPick();state.phase='racing';state.phaseTime=0;
            state.events.push({kind:'gate_open',round:state.round,course:state.course,time:state.time});
          }
        }else if(state.phase==='racing'){
          for(const horse of state.horses){
            if(horse.finishedAt!==null)continue;
            const pulse=Math.sin(state.time*3.4+horse.pulse)*7;
            const progress=horse.x/LENGTH;
            const terrain=state.round===2 && progress>.34&&progress<.44?.81:
              state.round===3&&progress>.42&&progress<.66?.84:1;
            const endurance=state.round===4?(1+(horse.endurance-1)*progress*2):1;
            const target=145*horse.form*horse.speed*terrain*endurance+pulse*horse.consistency;
            if(progress>.78&&!horse.surgeUsed){
              horse.surgeUsed=true;
              state.events.push({kind:'lateSurge',horse:horse.id,round:state.round,x:horse.x,time:state.time});
            }
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
      if(canBet){
        for(const stake of STAKES.filter(x=>x<=p.gems))controls.push({a:'stake',label:stake+' gems',v:stake,selected:p.stake===stake});
        const stake=p.gems>=p.stake?p.stake:25;
        for(const h of state.horses)controls.push({a:'bet',label:h.name+' ('+h.odds+'×)',v:{horse:h.id,stake}});
      }
      if(state.phase==='racing'&&pick&&!state.cheers.has(id))
        controls.push({a:'cheer',label:'CHEER '+state.horses[pick.horse].name+'!',v:0});
      return {
        turnLabel:`Heat ${state.round}/${ROUNDS} · ${state.phase.toUpperCase()}`,
        roundScore:p.gems,gems:p.gems,modePhase:state.phase,
        modeControls:controls,isTurn:canBet||state.phase==='racing'&&!!pick,
        stake:p.stake,course:state.course,hype:state.hype,formGuide:state.horses.map(h=>({
          id:h.id,name:h.name,speed:h.speed,endurance:h.endurance,consistency:h.consistency,odds:h.odds})),
        modeHint:pick?`Backed ${state.horses[pick.horse].name} for ${pick.stake} gems`:
          state.phase==='betting'?'Pick a runner and place your gems':'Watch the race',
        myBet:pick?{horse:pick.horse,stake:pick.stake}:null,
        secondsLeft:state.phase==='betting'?Math.max(0,Math.ceil(12-state.phaseTime)):0
      };
    }
    newHeat();
    return {state,bet,action,step,hud,standings,getPlayer};
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
  onInput(id,k){if(k==='p')marbleDerbyGame?.action(id,'cheer');},
  onAction(id,a,v){return marbleDerbyGame?.action(id,a,v)||false;},
  botTick(){},
  hud(player){return marbleDerbyGame?.hud(player.id)||{};},
  standings(){return marbleDerbyGame?.standings()||[];},
  roundResults(){return marbleDerbyGame?.standings()||[];},
  finalResults(){return marbleDerbyGame?.standings()||[];},
  session(){return marbleDerbyGame;}
});
