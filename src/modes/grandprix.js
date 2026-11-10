/* Party Pack Grand Prix: Grand Prix adapter; existing TV flow remains authoritative. */
registerMode({
  id: 'grandprix', name: 'Grand Prix', tagline: 'Race to the finish!', icon: '🏁',
  minPlayers: 1, maxPlayers: 8, roundsDefault: 4,
  available: true, awards: [],
  // Existing Grand Prix start-of-night flow moved here without changing order.
  // The TV supplies callbacks so the original state machine stays authoritative.
  setup(game) {
    game.resetNight();
    game.cup.n = game.settings.cup;
    game.cup.race = 0;
    game.cup.played = [];
    game.toVote();
  },
  // Race-state rules live here. The TV still owns drawing, audio and DOM.
  startRound({cup,trackInfo,vote,players,random=Math.random,now}) {
    const fresh=trackInfo.filter(t=>!cup.played.includes(t.id));
    const pool=(fresh.length>=3?fresh:fresh.concat(trackInfo.filter(t=>cup.played.includes(t.id)))).slice();
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];
    }
    vote.opts=pool.slice(0,3);vote.votes=new Map();vote.picked=-1;
    vote.endAt=now+12;
    for(const p of players.values())if(p.cpu)p.bot.voteAt=now+1+random()*5;
  },
  createRace({WorldCtor,tracks,trackId,seed,settings,players,random}) {
    const race = new WorldCtor(tracks[trackId](),{
      seed,items:settings.items,catchup:settings.catchup
    });
    const order=[...players.values()].map(p=>({
      p,k:p.points+random()*.5
    })).sort((a,b)=>b.k-a.k).map(o=>o.p);
    for(const p of order)race.addMarble(p.id,p);
    for(const m of race.marbles){m.appearT=0;m.squash=0;}
    race.goTime=7;
    return race;
  },
  castVote({state,vote,pid,index}) {
    if(state!=='vote'||vote.picked>=0||!(index>=0&&index<vote.opts.length))return false;
    vote.votes.set(pid,index);return true;
  },
  resolveVote({vote,random=Math.random,now}) {
    const counts=vote.opts.map(()=>0);
    for(const v of vote.votes.values())counts[v]++;
    const best=Math.max(...counts);
    const tied=counts.map((c,i)=>c===best?i:-1).filter(i=>i>=0);
    vote.picked=tied[Math.floor(random()*tied.length)];
    vote.revealAt=now+1.6;
    return vote.picked;
  },
  shouldEnd({world,endAt,photoPending}) {
    if(endAt)return !photoPending&&world.time>=endAt;
    if(world.allFinished())return world.time+2.2;
    if(world.firstFinishTime!==null&&world.time-world.firstFinishTime>20)return world.time;
    if(world.time-world.goTime>170)return world.time;
    return 0;
  },
  nextStep({cup}) {return cup.race>=cup.n?'finale':'vote';},
  tick() {}, draw() {},
  onInput({world, pid, k}) {
    if (!world) return;
    if(k==='p') world.press(pid);
    else if(k==='r') world.release(pid);
    else if(k==='i') world.useItem(pid);
  },
  onAction() {},
  botTick({state,players,vote,now,castVote,world,MR,random=Math.random}) {
    if(state==='vote'){
      for(const p of players.values())
        if(p.cpu&&p.bot.voteAt&&now>p.bot.voteAt){
          p.bot.voteAt=0;castVote(p.id,Math.floor(random()*vote.opts.length));
        }
      return true;
    }
    if(!world||!['race','countdown','lobby'].includes(state))return false;
    const t=world.time;
    for(const m of world.marbles){
      const p=players.get(m.id);
      if(!p||!p.cpu)continue;
      const b=p.bot;
      if(m.down&&t>b.rel)world.release(m.id);
      if(state==='countdown'){
        if(!m.down&&!m.startUsed&&Math.abs(world.goTime-t-.03)<.05&&random()<b.skill*.25){
          world.press(m.id);b.rel=t+.05;
        }
        continue;
      }
      if(state==='lobby'){
        if(!m.down&&random()<.004){world.press(m.id);b.rel=t+.05;}
        continue;
      }
      MR.botThink(world,m,b);
    }
    return true;
  },
  hud(player) { return {place:player.lastPlace||0,total:player.points||0}; },
  standings(players) { return [...players].sort((a,b)=>b.points-a.points||b.wins-a.wins); },
  roundResults({standings,players,points}) {
    const ranking=[];
    for(let i=0;i<standings.length;i++) {
      const m=standings[i], p=players.get(m.id);
      if(!p)continue;
      const pts=points[i]||0;
      p.lastPts=pts; p.points+=pts; p.races++;
      if(i===0)p.wins++;
      p.lastPlace=i+1;p.lastTime=m.finished?m.finishTime:null;
      for(const k of ['perfect','offs','bumps'])p.tot[k]+=m.stats[k];
      p.tot.maxAir=Math.max(p.tot.maxAir,m.stats.maxAir);
      p.tot.climb=Math.max(p.tot.climb,m.stats.climb);
      p.tot.topSpeed=Math.max(p.tot.topSpeed,m.stats.topSpeed);
      ranking.push(m.id);
    }
    return ranking;
  },
  finalResults(players) { return [...players].sort((a,b)=>b.points-a.points||b.wins-a.wins); }
});
