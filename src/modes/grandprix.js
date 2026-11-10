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
  startRound() {}, tick() {}, draw() {},
  onInput({world, pid, k}) {
    if (!world) return;
    if(k==='p') world.press(pid);
    else if(k==='r') world.release(pid);
    else if(k==='i') world.useItem(pid);
  },
  onAction() {}, botTick() {},
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
