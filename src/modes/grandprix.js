/* Party Pack Grand Prix: Grand Prix adapter; existing TV flow remains authoritative. */
registerMode({
  id: 'grandprix', name: 'Grand Prix', tagline: 'Race to the finish!', icon: '🏁',
  minPlayers: 1, maxPlayers: 8, roundsDefault: 4,
  available: true, awards: [],
  setup(game) { return game; },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
