/* Party Pack Drop Zone: reserved for its dedicated implementation phase. */
registerMode({
  id: 'dropzone', name: 'Drop Zone', tagline: 'Drop, bounce, bank it', icon: '🎯',
  minPlayers: 1, maxPlayers: 8, roundsDefault: 5,
  available: false, awards: [],
  setup(game) { throw Error('Drop Zone is not implemented yet'); },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
