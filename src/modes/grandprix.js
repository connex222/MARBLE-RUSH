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
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
