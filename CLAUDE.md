# CLAUDE.md - Marble Rush

Instructions for AI assistants working in this repository.

## What this is

Marble Rush is a family marble-racing party game. The TV is the track; phones are the buttons (tap to boost, hold to grip). The Party Pack has six games: Grand Prix, Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf, plus Party Night scoring across 3, 5 or 7 games.

- Live game: https://marble-rush.onrender.com (phones use `/play`)
- Master design and graphics document: `MARBLE_RUSH_MASTER.md` (shared by Claude and ChatGPT; follow it)
- Phase and acceptance records: `docs/`

## Architecture

| Part | Location |
|---|---|
| Physics engine | `src/engine.js` |
| Game modes | `src/modes/` (one file per game; `registry.js` lists them) |
| TV and phone source pages | `src/tv.html`, `src/tv.js`, `src/play.html` |
| Built pages (generated, do not hand-edit) | `public/` |
| Relay server (Node + `ws`) | `server/server.js` |
| Build script (resizes art, bakes single files) | `tools/build.js` |
| Raw ChatGPT art and sound drop folder | `assets/raw/` |

Edit `src/`, then run the build. Never edit `public/tv.html` or `public/play.html` directly.

## Commands

```
npm install
npm run build
npm start
npm run balance
npm run test:party
npm run test:dropzone
npm run test:brawl
npm run test:derby
npm run test:curling
```

After changing any physics number in `src/engine.js`, run `npm run balance` and confirm that skill still beats button-mashing and doing nothing.

## Project rules

- Grand Prix gameplay and its approved artwork must not regress. GitHub Actions compares Grand Prix physics against `main`.
- A new mode stays disabled in `registry.js` until it passes its own acceptance record in `docs/`.
- Bowl Brawl and Curling need two or more players.
## Working with Shaun (the owner)

- Shaun is not a programmer. Explain every step in plain English, in order, and assume no prior knowledge.
- Give complete, ready-to-use files, never partial snippets or "..." placeholders.
- Use UK English in all player-facing text.
- Before changing anything, read this file, `README.md` and the design document named below.
- Never delete files to "tidy up". Move old notes into `docs/` instead, and say what you moved.
- Never force-push, rewrite history, or rename the repository.

## Hosting rules (Render)

- The game runs on Render's free plan in Frankfurt and auto-deploys from `main`.
- Game rooms live in server memory. **Any push to `main` restarts the server and ends every live game.** Never push during a game night, and warn Shaun before any change that will deploy.
- The free plan sleeps when idle; the first visit can take up to a minute to wake.
- The server must listen on `process.env.PORT`.

## Party-game conventions

- The TV is the shared screen; phones are private controllers. Secret information must never be sent to the TV or to spectators.
- Text on the TV must be readable from a sofa; phone controls must work one-handed in portrait.
- Art and sound are made by Shaun with ChatGPT. Keep the exact filenames listed in the asset manifest so new files drop in without code changes, and keep a working code-drawn fallback for anything missing.
