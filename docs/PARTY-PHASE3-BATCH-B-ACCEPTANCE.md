# MARBLE RUSH — Phase 3 Batch B acceptance

**Scope:** five material maps and ten props, matched to the approved Phase 3 palette. Stage-only drawing; no simulation changes.

## Source versus generated data
- PNG assets are source files under `assets/raw/` and are packaged separately for GitHub binary upload.
- `tools/build.js` converts them to WebP in `public/assets/img/` and adds them to the runtime manifest.
- `MarblePartyStage.surface` applies optional material overlays to game boards; `MarblePartyStage.backdrop` adds two props per game, outside playfields and HUD.
- Missing images trigger the existing code-drawn fallback. The `drawSprite` helper returns false when assets are absent.

## What is and is not complete
- **Prepared:** Batch B artwork and integration source on `dev/party-pack-aaa`.
- **To verify:** local TV screenshots after the binary upload, position/legibility with 2–8 players, reduced-motion settings, and the physical 2–4 phone test.
- **Remaining Phase 3:** more art variety, impact effects/particles, cinematic results and motion integration. Batch B is not equivalent to a full 3D engine.
- **Safety:** do not touch Grand Prix assets, cameras, tracks, or main deployment.

## Executed verification (10 November 2026)
- `node --check` on complete `src/modes/registry.js` and `tools/build.js`: **PASS**.
- PNG validation: all 15 assets readable; 10 sprites have RGBA alpha; five materials are RGB square: **PASS**.
- `tools/test-party-aaa-phase2.js` with Phase 2 source and revised renderer: **PASS** — 30 seeded full games × two replays per mode, eight-player matches, legacy five-hole Golf and nine-hole championship.
- `tools/balance-aaa-phase2.js`: **completed**; exploratory CPU results, not a human balance guarantee.
- Actual in-browser artwork integration and physical mobile controls: **not yet tested** (binary files not yet uploaded to development branch).
