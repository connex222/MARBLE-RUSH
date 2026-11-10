# MARBLE RUSH Party Pack — Phase 5 Marble Derby

**Development release:** v0.8.0 · `dev/party-pack-phase5-marble-derby`  
**Base:** Phase 4 `dev/party-pack-phase4-bowl-brawl` (not production `main`).  
**Release constraint:** Do not merge or deploy without explicit authorisation.

## Game rules

Marble Derby is a five-heat contest for **1–8 players**. Each player begins with **600 entirely virtual gems** and can back one of six named marble runners each heat. Players select a stake of **25, 50, 100 or 200 gems** using their phones, select a runner, and watch the race on the TV. Wagers are deducted exactly once before the heat. The runner's odds are displayed before selection and locked when the bet is placed. A winning pick returns the integer portion of **stake × locked odds**; losing picks return nothing. There is **no real money, cash-out, prize or financial service**. If a player's balance falls below 25, the next heat grants a 100-gem gameplay stipend to prevent lockout.

Each 12-second selection window ends early when all racers have placed a choice. Otherwise missing bets are automatically selected at the end of the window, preventing disconnected controllers from blocking the night. CPU entrants choose their own runners and affordable stakes; all physics, speed oscillations, track length and odds are seeded for reproducibility. The six runners race along separate lanes over 1,500 world units. Race duration is bounded by 24 seconds. One small **CHEER** boost is allowed per player per heat on their backed marble.

Each heat's finishing order and every player's payout are recorded. After five heats, the **highest final gem balance wins**. Ties use successful bets, then net profit, then join order. The full match reaches the existing approved winner presentation.

When played in Party Night, the Derby's final gem ranking is converted into the existing Party Points schedule **10/8/6/5/4/3/2/1** as one game. Grand Prix, Drop Zone and Bowl Brawl remain playable. Marble Curling and Marble Golf remain locked.

## TV and phones

TV: 1920×1080 six-lane animated track, odds, runners, gem leaderboard, five-heat status and fallback buttons for local play. Phones: current heat and phase, wallet, one-time wager selection, six runners, four stake presets, cheer button and host abort. The game validates every action by the sending player ID; unrecognised IDs, invalid stakes/horse IDs, duplicate bets and repeated cheers are rejected. The authoritative TV is responsible for the race and scores; no client can set its own payout or odds.

## QA gates

- `npm run test:derby`: at least 30 different complete seeded matches of 3 CPU players, each replayed to confirm identical results, plus eight-player capacity, invalid-roster, stake validation, payouts, ownership, cheer and inactivity guard checks.
- Regression: `npm run test:brawl`, `npm run test:dropzone`, `npm run test:party`, seven-track Grand Prix physics comparison against `main`, standalone TV and phone build and art asset audit.
- Chromium TV: playable five-heat Derby, virtual-gem totals, normal finale and mixed Party Night coordinator. One TV plus two connected phone browsers: both choose distinct runners, wallet and betting state reach both phones over the real local WebSocket.
- Both final GitHub Actions workflows must pass **on the same final head commit**. Physical 2–4-phone multiplayer acceptance remains a separate release gate.

## Artwork boundary

All **119 approved artwork assets**, original game audio, Grand Prix camera and Phase 3–4 gameplay are retained unchanged. The new Derby track is functional code-rendered artwork using the existing palette; new AAA 3D race imagery and narration have not been produced or approved in this phase. That work is reserved for the subsequent visual/audio production stage.

## Production protection

PR for Phase 5 targets the unmerged Phase 4 branch. Its parent PR #40 targets Phase 3, which targets Phase 2. Neither GitHub `main` nor the live Render service should change during this development phase.
