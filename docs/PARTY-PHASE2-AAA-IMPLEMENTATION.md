# MARBLE RUSH — Phase 2 gameplay implementation & QA

## Scope
Development branch: `dev/party-pack-aaa` only. This is a complete **source-code** patch. It does not add any Phase 3 graphics or audio, and does not merge or deploy.

## Changed files

| File | Change |
|---|---|
| `src/modes/derby.js` | Form stats, seeded course terrains, late surge, cheer meter, photo-finish, bot betting |
| `src/modes/dropzone.js` | Gold pegs, eligible 2× awards, moving jackpot, 10-second release, spectator prediction, structured events |
| `src/modes/brawl.js` | Five seeded hazard types, hazard collision physics, spectator action, telegraphs, tactical CPU |
| `src/modes/curling.js` | Spin/curl, sweep tap rhythm, last-stone drama, measurement, spectator predictions, CPU targeting |
| `src/modes/golf.js` | Nine-hole championship, new moving obstacles and slopes, legacy five-hole option, shot ghost, cheer, event hooks |
| `src/modes/bots.js` | Seeded difficulty-aware planning for the five modes |
| `src/tv.js` | Whitelist and route all new phone action names; nine-hole standalone versus five-hole Party Night |
| `src/play.html` | Improved mobile touch-target sizing for mode buttons |
| `tools/test-party-aaa-phase2.js` | New comprehensive deterministic rule and regression tests |
| `tools/balance-aaa-phase2.js` | 30-seed cross-skill CPU balance lab |
| `MARBLE_RUSH_MASTER.md` | Complete updated Master Bible with §16.10 |

## Tests executed locally (Node v22.16.0)

- PASS `node tools/test-party-foundations.js`
- PASS `node tools/test-dropzone.js`
- PASS `node tools/test-brawl.js`
- PASS `node tools/test-derby.js`
- PASS `node tools/test-curling.js`
- PASS `node tests/phase7-golf.test.js`
- PASS `node tools/test-phase8-integration.js`
- PASS `node tools/test-party-aaa-phase2.js` (30 seeded full games each, replay twice, plus 8-player tests and invalid-action checks)
- PASS `node tools/test-grandprix-regression.js src/engine.js` (same unchanged engine supplied as baseline)
- PASS `node tools/balance-aaa-phase2.js`
- PASS `node --check` for all modified mode JS and TV code

## Exploratory 30-seed CPU tournament (three players, easy/normal/hard)

| Mode | Easy wins | Normal wins | Hard wins | Interpretation |
|---|---:|---:|---:|---|
| Derby | 9 | 9 | 12 | Form-aware hard CPU has modest advantage |
| Drop Zone | 10 | 10 | 10 | Intentional chance allows all difficulty levels to compete |
| Bowl Brawl | 9 | 6 | 15 | Hazard-aware hard CPU has better survival |
| Curling | 5 | 8 | 17 | Better strength/angle targeting is rewarded |
| Golf (9 holes) | 9 | 9 | 12 | Power targeting improves results moderately |

These are small exploratory samples, **not** a statistical guarantee of perfect balance. Humans, 8-player tournaments, fairness by turn order and real device pacing still require acceptance testing.

## What is not finished

1. Phase 3 actual premium ChatGPT-generated art. No new images exist in this pack.
2. Phase 4 camera, VFX, visual events/animations and on-device frame-time optimisation. Game physics emits hooks but does not yet consume them for visual effects.
3. Phase 5 Creative Claw sounds, narration, ducking and audio cleanup. No additional sound assets exist in this pack.
4. Real phone/TV integration QA after the development-branch upload; local simulation tests do not prove network/controller UX is flawless.

## Important rule interpretation

A seeded new ruleset is replayable: the same seed under Phase 2 yields the same winner. New rules may produce a **different** winner from the Phase 1 ruleset for that seed; that cannot be prevented while genuinely altering physics and gameplay. The original Grand Prix engine is not modified. Its deterministic baseline is preserved.
