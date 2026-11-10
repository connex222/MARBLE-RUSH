/* Party Pack Marble Golf: reserved for its dedicated implementation phase. */
registerMode({
  id: 'golf', name: 'Marble Golf', tagline: 'Crazy golf with loops', icon: '⛳',
  minPlayers: 1, maxPlayers: 8, roundsDefault: 5,
  available: false, awards: [],
  setup(game) { throw Error('Marble Golf is not implemented yet'); },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
