/* MARBLE RUSH Party Pack mode registry — no DOM or network dependencies. */
const MODES = Object.create(null);
const PARTY_POINTS = Object.freeze([10,8,6,5,4,3,2,1]);
const MODE_METHODS = ['setup','startRound','tick','draw','onInput','onAction','botTick','hud','standings','roundResults','finalResults'];
function registerMode(spec) {
  if (!spec || !/^[a-z]+$/.test(spec.id) || MODES[spec.id]) throw Error('Invalid or repeated mode id');
  if (!Number.isInteger(spec.minPlayers) || !Number.isInteger(spec.maxPlayers) || spec.minPlayers < 1 || spec.maxPlayers > 8 || spec.minPlayers > spec.maxPlayers) throw Error('Invalid player range');
  for (const method of MODE_METHODS) if (typeof spec[method] !== 'function') throw Error(spec.id + ' missing ' + method);
  MODES[spec.id] = Object.freeze(spec);
}
function partyPoints(ids) {
  if (!Array.isArray(ids) || ids.length > 8 || new Set(ids).size !== ids.length) throw Error('Ranking must have unique racers (up to eight)');
  return new Map(ids.map((id, i) => [id, PARTY_POINTS[i]]));
}
const PartyNight = {
  create(ids, playerCount) {
    if (!Array.isArray(ids) || ![3,5,7].includes(ids.length)) throw Error('Select 3, 5 or 7 games');
    if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 8) throw Error('Invalid player count');
    for (const id of ids) {
      const mode = MODES[id];
      if (!mode || !mode.available || playerCount < mode.minPlayers || playerCount > mode.maxPlayers)
        throw Error('Game unavailable or unsuitable for player count: ' + id);
    }
    return { queue: ids.slice(), index: 0, totals: new Map(), finished: false };
  },
  record(session, ranking) {
    if (session.finished || session.index >= session.queue.length) throw Error('Party Night already finished');
    const points = partyPoints(ranking);
    for (const [pid, pts] of points) session.totals.set(pid, (session.totals.get(pid) || 0) + pts);
    session.index++;
    session.finished = session.index >= session.queue.length;
    return new Map(session.totals);
  },
  next(session) { return session.finished ? null : session.queue[session.index]; }
};
if (typeof module !== 'undefined') module.exports = { MODES, registerMode, PARTY_POINTS, partyPoints, PartyNight };
