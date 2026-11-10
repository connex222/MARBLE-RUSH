/* Party Pack Bowl Brawl: reserved for its dedicated implementation phase. */
registerMode({
  id: 'brawl', name: 'Bowl Brawl', tagline: "Bump 'em out", icon: '💥',
  minPlayers: 2, maxPlayers: 8, roundsDefault: 5,
  available: false, awards: [],
  setup(game) { throw Error('Bowl Brawl is not implemented yet'); },
  startRound() {}, tick() {}, draw() {}, onInput() {}, onAction() {}, botTick() {},
  hud() { return {}; }, standings() { return []; }, roundResults() { return []; }, finalResults() { return []; }
});
