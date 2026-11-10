# MARBLE RUSH Party Pack — Phase 6 Marble Curling

**Version:** 0.9.0 development · **Branch:** `dev/party-pack-phase6-marble-curling`
**Parent:** Phase 5 Marble Derby branch, not production main.
**Protection:** Do not merge or deploy without a separate release instruction.

## Rules and scoring

Marble Curling is a **five-end** game for **2–8 participants**, including CPUs. Each participant plays **two stones per end** in a fixed, repeating turn order. During their turn, the player aims left/right (−40° to +40°), adjusts shot power (30–100), and throws towards the scoring button. The thrown stone slides across the rink under ice friction, rebounds from walls and can knock other stones aside. While a player's stone is moving, they can **SWEEP** to temporarily reduce friction. All actions are validated by the TV against the current owner; another player cannot throw or sweep the wrong stone.

A scoring house, four concentric rings and the centre button are drawn on the TV. At the end of an end, players are ranked by the distance of their closest stone to the button. The closest player receives **10 points**, then 8, 6, 5, 4, 3, 2, 1 according to rank. Each player's stones within 80 world units of the button add **2 bonus points apiece**. After five ends the highest cumulative score wins; end victories and original join order break ties. The full game returns to the existing championship presentation.

A player can aim for up to **18 seconds** before the game automatically throws their stone. Every slide is bounded by **22 seconds**, preventing an abandoned phone or an edge-case collision from stalling Party Night. CPUs choose seeded aim/power and take their own turns automatically. The 60 Hz fixed-step simulation has deterministic collision and shot results for identical seeds and control sequences.

## TV and phones

The TV renders a **1920×1080** ice rink, concentric target rings, all stones, an aim line, current end, scores and status. Its local **AIM / POWER / THROW / SWEEP** controls support keyboard or local play. Phone players see current end, their turn, angle, power, throw and sweep buttons. The shared large phone pad triggers THROW during aim or SWEEP during the slide.

## Party Night

Marble Curling is the fifth playable Party Pack mode, alongside Grand Prix, Marble Derby, Drop Zone and Bowl Brawl. It counts as **one game** in a 3/5/7-game Party Night. Its final five-end rankings are converted to the established 10/8/6/5/4/3/2/1 Party Points ledger. Marble Golf remains locked until Phase 7.

## Acceptance and constraints

- `npm run test:curling`: **30 independent seeded five-end, three-CPU matches**, each replayed, validating exactly two stones per player per end, scoring, all five end results, winner determination and deterministic output. Also eight-player capacity and invalid player/action checks.
- Preserve `npm run test:derby`, `npm run test:brawl`, `npm run test:dropzone`, `npm run test:party`, seven-track Grand Prix physics regression against main, and compiled TV/phone build.
- Real-browser headless TV Curling flow, local aim/power/throw checks, five-end completion, and mixed Party Night regression. Simulated one-TV plus two phones over local WebSocket checks sequential throws, HUD synchronisation and ownership.
- Existing **119 approved artwork assets**, all approved audio, Grand Prix physics and the Phase 3–5 games stay unchanged. The new Curling ice is **functional code-rendered art**, not a claim of approved AAA 3D art.
- Real **2–4 physical phone** acceptance remains separate from simulated browser QA.
- Final Phase 6 engineering acceptance requires **both same-commit GitHub Action suites passing**. No GitHub main merge or Render deployment is authorised.
