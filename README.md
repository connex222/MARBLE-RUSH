# MARBLE RUSH — Grand Prix

**One game. Ten tracks: seven originals and three new courses.** Marble Rush is a multiplayer marble-racing game for television, PC and mobile controllers. The TV is the track; phones are the buttons. Tap to boost, hold to grip.

**Play on TV / PC:** https://marble-rush.onrender.com/tv  
**Phone controller:** https://marble-rush.onrender.com/play

## How to play

1. Open Marble Rush on the television or computer and select **Open the track**.
2. Scan the QR code or enter the four-letter room code on players' phones. You can also add keyboard and CPU racers in the lobby.
3. Choose the cup length (1, 2, 4, 7 or 10 races) and optional items, catch-up, music and sound effects.
4. Select **Start the Cup**. Players vote for a track; tap on the phone to boost, or hold to grip.
5. Compete for points across the cup, crown the champion, and start a new cup or return to the lobby.

The original themes are **Toybox, Candy, Ice, Space, Jungle, Seaside and Clockwork**. All seven original tracks remain unchanged. Three new course layouts reuse approved existing theme art: **Jetty Dash** (short sprint), **Canopy Expedition** (long endurance race) and **Gearshift Gauntlet** (technical challenge). The optional **Full Tour (10)** cup races all ten tracks exactly once. Racing physics, multiplayer relay, artwork, fullscreen support and phone controls are preserved.

## Production scope — 15 November 2026

**Grand Prix is the only published game.** The previous Party Pack additions — Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf — and Party Night are no longer selectable in the public television or phone interface. The public lobby goes directly from joining racers to starting the cup.

This is a non-destructive rollback. The older experiments and assets remain in GitHub for reference, but they are not supported or promoted as part of the live game. No existing original racing data, track definition or artwork was deleted.

Internal legacy regression tests may access the experimental mode picker using `/tv?partyQa=1` **on localhost / 127.0.0.1 only**. This cannot unlock those games on the deployed Render website.

## Run locally

```bash
npm install
npm run build
npm start
```

The build writes the standalone TV and phone pages to `public/`. For the original racing-game balance tests, run `npm run balance`. The single-game release regression is `node tools/test-single-game-release.js`.

## Structure

| Location | Purpose |
|---|---|
| `src/engine.js` | Ten Grand Prix courses, including the protected seven originals |
| `src/tv.js`, `src/tv.html` | Television / PC lobby and race presentation |
| `src/play.html` | Phone controller |
| `server/server.js` | Room code and WebSocket relay |
| `assets/raw/` | Approved original and archived game artwork |
| `tools/build.js` | Asset integration and browser-page build |
| `docs/GRAND-PRIX-ONLY-RELEASE.md` | Reversible release change and QA guardrails |

Older Party Pack design and test notes in `docs/` are historical engineering records, not documentation of currently published games.

Production uses Render and automatically deploys merges to `main`. Avoid merging during a live game night, as restarting the server may interrupt active races.
