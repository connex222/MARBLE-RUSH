# MARBLE RUSH Party Pack — Phase 3 Drop Zone

**Development branch:** `dev/party-pack-phase3-dropzone`  
**Base:** Phase 2 foundation branch `dev/party-pack-phase2-foundations`  
**Release:** **NOT MERGED / NOT DEPLOYED**. Production remains Grand Prix v0.4.

## Playable Drop Zone

Drop Zone is the first newly playable Party Pack game, alongside the existing Grand Prix. It uses 5 rounds per racer (1–8 racers), with each player dropping one marble per turn. Eight buckets award **50, 100, 200, 500, 1000, 500, 200 and 100** points from left to right. Everyone's accumulated Drop Zone score determines the game ranking. Ties use number of jackpot drops and then original player joining order.

TV game picker and VIP phone choose Drop Zone. When started, the TV shows a 1920×1080 rendered board, peg grid, moving obstacle, goal buckets, scores and live turn order. Players use phone **LEFT / DROP / RIGHT** buttons, or press the big phone pad to drop. TV control buttons provide a fallback for local play. The CPU plays its turns automatically. Inputs from another player are rejected.

The board uses **85 staggered pegs**, gravity, velocity, collision response, side rails, a moving bumper, a moving gate and bucket settle detection (0.4 seconds). Each marble has a bounded 10-second travel time. The game uses seeded randomness to reproduce the same CPU sequence and outcome for a given seed, roster and input sequence.

A completed game reaches the existing trophy/finale presentation. In Party Night, the five-round game counts as one selected game, and the established 10/8/6/5/4/3/2/1 ranking points accumulate towards the Party Night winner. Both Grand Prix and Drop Zone are eligible for 3/5/7-game sessions. The four remaining new game cards stay preview-only and cannot be started.

## QA and safety gates

`npm run test:dropzone` simulates **30 seeds × 3 CPU racers × 5 rounds**, repeats each seed to check deterministic results and checks score totals, player ownership, repeat actions, game termination and result ordering. The existing `npm run test:party` and seven-track seeded Grand Prix regression remain mandatory.

Actual Chromium browser acceptance checks the existing Grand Prix gameplay and approved assets, then starts the playable Drop Zone, drops marbles and reaches the five-round finale. A simulated one-TV/two-phone WebSocket test checks joining, Drop Zone mode selection, connected phone control, live phone HUD and a physical marble release initiated by the controller. Local browser simulation is not a substitute for the eventual **2–4 physical-phone** acceptance test.

**Art boundary:** the game board is currently rendered in code with the approved palette, while previously approved 119 artwork assets remain untouched. A separate Phase 8 visual/audio polish review may replace the code-drawn board with approved artwork. No other game has been unlocked.

### Phase 3 exit gate

Do not describe Phase 3 as accepted until the **same final commit** passes both GitHub Actions foundation and real-browser jobs. Any failures must be corrected in this development branch, without merging or deploying.
