/* Party Pack deterministic CPU planning primitives. No DOM, network or timers.
 * Every game supplies state and applies its own legal actions to the World.
 * Gameplay bot tuning happens in the mode implementation phase.
 */
const PartyBots = (() => {
  'use strict';
  function random(seed) {
    if (!Number.isInteger(seed) || seed < 0) throw Error('Invalid CPU seed');
    let x=seed>>>0;
    return () => {x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};
  }
  const bound=(x,a,b)=>Math.max(a,Math.min(b,x));
  function plan(mode,state={},skill=.5,seed=1) {
    if(!Number.isFinite(skill)||skill<0||skill>1)throw Error('Skill must be 0–1');
    if(!['derby','dropzone','brawl','curling','golf'].includes(mode))throw Error('Unknown bot mode');
    const rand=random(seed);
    const error=1-skill;
    if(mode==='derby') {
      const horses=Array.isArray(state.horses)?state.horses:[];
      const scored=horses.map(h=>({id:h.id,score:
        .45*(Number(h.speed)||Number(h.form)||0)+.3*(Number(h.endurance)||1)+
        .25*(Number(h.consistency)||1)+rand()*error}));
      scored.sort((a,b)=>b.score-a.score);
      return {kind:'bet',horse:scored[0]?.id||null,stake:skill>.7?100:50};
    }
    if(mode==='dropzone') {
      const target=bound(Number(state.goldTargetX??state.targetX??0),-575,575);
      const boardHalfWidth=Math.max(1,Number(state.halfWidth)||575);
      return {kind:'drop',x:bound(target+(rand()-.5)*240*error,-boardHalfWidth,boardHalfWidth),
        reactionMs:bound(Math.round(120+rand()*350*error),120,470)};
    }
    if(mode==='brawl') {
      const dist=Math.max(0,Number(state.nearestDist)||500);
      const energy=bound(Number(state.energy)||0,0,100);
      return {kind:energy>=34&&dist<480*(.7+.3*skill)?'ram':'anchor',
        delayMs:Math.round(90+rand()*300*error)};
    }
    if(mode==='curling') {
      const power=bound(Number(state.power)||.65,0,1);
      const angle=bound(Number(state.angle)||0,-60,60);
      return {kind:'throw',power:bound(power+(rand()-.5)*.24*error,0,1),
        angle:bound(angle+(rand()-.5)*24*error,-60,60),
        curl:bound(Math.round((rand()-.5)*6*error),-3,3)};
    }
    const target=bound(Number(state.targetAngle)||35,5,75);
    const power=bound(Number(state.targetPower)||.65,0,1);
    return {kind:'golf',angle:bound(target+(rand()-.5)*24*error,5,75),
      power:bound(power+(rand()-.5)*.24*error,0,1)};
  }
  return Object.freeze({plan,random});
})();
if(typeof module!=='undefined')module.exports=PartyBots;
