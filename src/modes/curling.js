/* Party Pack Marble Curling: reserved for its dedicated implementation phase. */
registerMode({
  id: 'curling', name: 'Marble Curling', tagline: 'Sweep to the button', icon: '🥌',
  minPlayers: 2, maxPlayers: 8, roundsDefault: 5,
  available: false, awards: [],
  setup(game) { throw Error('Marble Curling is not implemented yet'); },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
