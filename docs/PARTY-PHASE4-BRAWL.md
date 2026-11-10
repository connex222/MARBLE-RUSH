# MARBLE RUSH Party Pack — Phase 4: Bowl Brawl

**Version:** 0.7.0 development · **branch:** `dev/party-pack-phase4-bowl-brawl`
**Parent:** Phase 3 Drop Zone development branch, not production `main`.
**Merge / deployment:** **NOT AUTHORISED**. The live game and approved artwork remain unchanged.

## Playable mode

Bowl Brawl is a simultaneous **2–8-player marble arena** with **five rounds** per game. Everyone starts each round in a circular bowl. The camera shows the shrinking ring and all surviving marbles. Players steer **LEFT** and **RIGHT**, use a charged **RAM** to accelerate into opponents and use **ANCHOR** to resist impacts while reducing their momentum. RAM costs 28 energy, ANCHOR costs 15; energy replenishes over time and the controls have a brief cooldown.

The arena begins at a radius of 380 game units. After ten seconds it progressively shrinks toward 110 by the 42-second round limit. Players outside the ring are eliminated until one marble survives, or until the round timer expires. At a timeout, remaining marbles are ranked by distance from the centre; eliminated marbles are ranked by survival time. The scoring order each round is **10, 8, 6, 5, 4, 3, 2, 1**. At the end of five rounds cumulative points determine the champion, with round victories and accumulated collision counts used to break ties.

CPU racers are active participants, moving and ramming toward nearby opponents with deterministic seeded decisions. The complete match automatically advances through rounds and returns to the existing champion screen. In Party Night, the overall Bowl Brawl standings become one game-ranking award; Phase 2 handles cumulative Party Points. A single-player session does not unlock Bowl Brawl, but Grand Prix and Drop Zone remain available.

## TV and phone

The TV shows a **1920×1080** arena, live marbles, shrinking safety ring, scoreboard, round timer and the local TV control fallback. Phone players receive energy, current round, survival state and dedicated **TURN LEFT / RAM / TURN RIGHT / ANCHOR** buttons. A tap on the large phone pad activates RAM. The authoritative TV rejects actions from unrecognised or eliminated racers, rejects malformed aim/turn values and prevents repeated RAMs while on cooldown or below the minimum energy.

## Acceptance gates

1. `npm run test:brawl` — at least **30 independent complete matches with three CPU opponents**, each replayed with the same seed, proving deterministic outcomes; verify five rounds and valid points. Additional eight-player capacity, invalid roster, energy, collision ring and unauthorised-command tests.
2. `npm run test:party`, `npm run test:dropzone`, seven-track Grand Prix deterministic physics regression against `main`, standalone TV/phone build and image-manifest audit.
3. Headless Chromium checks: normal Grand Prix artwork, playable Drop Zone, five-round Bowl Brawl, 1920×1080 TV board and no JavaScript errors. Simulated TV plus two independently connected phone browsers tests VIP selection, RAM action, energy deduction and HUD synchronisation.
4. No merged PR or Render deploy until separately authorised. **2–4 physical phones remain outstanding** for final Alpha acceptance.

## Artwork boundary

Existing **119 approved game images**, avatars, logos, original sounds, Grand Prix physics and camera are preserved. The Bowl Brawl arena is currently a functional **code-rendered** view following the approved palette. It does not constitute newly approved AAA 3D artwork. The dedicated future visual/audio production stage must replace or refine it without altering gameplay.

## Scope

Phase 4 delivers Bowl Brawl. Marble Derby, Marble Curling and Marble Golf remain locked until their own development phases. Phase 4 should not be marked accepted until the final branch HEAD is green on both CI workflows.
