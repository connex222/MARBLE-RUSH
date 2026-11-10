/* Party Pack Marble Derby: reserved for its dedicated implementation phase. */
registerMode({
  id: 'derby', name: 'Marble Derby', tagline: 'Back a marble, cheer it home', icon: '🏇',
  minPlayers: 1, maxPlayers: 8, roundsDefault: 5,
  available: false, awards: [],
  setup(game) { throw Error('Marble Derby is not implemented yet'); },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
