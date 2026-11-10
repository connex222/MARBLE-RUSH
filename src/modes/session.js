/* MARBLE RUSH — cross-mode Party Night coordinator (headless, no DOM).
   Keeps the list of players fixed for one night. The TV controls transitions.
   No mode is started unless its implementation is marked available. */
const PartyCoordinator = (() => {
  'use strict';
  function start({playlist, playerIds}) {
    if (!Array.isArray(playerIds) || playerIds.length < 1 || playerIds.length > 8 ||
        new Set(playerIds).size !== playerIds.length ||
        playerIds.some(id => typeof id !== 'string' || !id))
      throw Error('Party Night needs 1–8 unique player IDs');
    const session = PartyNight.create(playlist, playerIds.length);
    return { session, roster: playerIds.slice(), history: [], status: 'ready' };
  }
  function current(c) {
    return c.status === 'complete' ? null : PartyNight.next(c.session);
  }
  function begin(c) {
    if (c.status !== 'ready') throw Error('Party Night cannot begin next game');
    const id = current(c);
    if (!id || !MODES[id]?.available) throw Error('Next game is not available');
    c.status = 'playing';
    return id;
  }
  function complete(c, ranking) {
    if (c.status !== 'playing') throw Error('Party Night has no active game');
    if (!Array.isArray(ranking) || ranking.length !== c.roster.length ||
        new Set(ranking).size !== c.roster.length ||
        ranking.some(id => !c.roster.includes(id)))
      throw Error('Ranking must contain every participant exactly once');
    const mode = current(c);
    const scores = PartyNight.record(c.session, ranking);
    c.history.push({mode, ranking: ranking.slice(), scores: new Map(scores)});
    c.status = c.session.finished ? 'complete' : 'ready';
    return {finished: c.status === 'complete', next: current(c), totals: scores};
  }
  function standings(c) {
    return c.roster.slice().sort((a,b) => 
      (c.session.totals.get(b)||0)-(c.session.totals.get(a)||0) ||
      c.roster.indexOf(a)-c.roster.indexOf(b))
      .map(id => ({id, points: c.session.totals.get(id)||0}));
  }
  function snapshot(c) {
    return {
      status:c.status,
      round:c.session.index + (c.status==='complete'?0:1),
      total:c.session.queue.length,
      mode:current(c),
      standings:standings(c)
    };
  }
  return Object.freeze({start,current,begin,complete,standings,snapshot});
})();
if(typeof module!=='undefined')module.exports=PartyCoordinator;
