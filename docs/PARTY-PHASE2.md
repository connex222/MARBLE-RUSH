# MARBLE RUSH Party Pack v0.5.0 — Phase 2 acceptance record

**Development only:** `dev/party-pack-phase2-foundations` / PR #38.
**Release policy:** do not merge or deploy until separately authorised.

## Delivered Phase 2 shared foundations

1. **Mode framework:** six registered descriptors with a common interface. Grand Prix is the only playable mode. Unfinished Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf can show previews but cannot start.
2. **Grand Prix adapter:** legacy cup setup, track ballot generation, vote collection/resolution, CPU ballot timing, seeded race construction and grid, normal CPU behaviour, inputs, per-race scoring, final standings, race timeout and next-step decisions are delegated to `src/modes/grandprix.js`. The TV still owns visual presentation, camera, particles, sound, room network and main frame loop. This separation preserves its approved look and physics.
3. **TV lobby:** six mode cards, selection and 15-second mode-specific code-drawn CPU concept previews. The picker is tested against other lobby controls for overlap.
4. **Party Night:** 3/5/7-game selection on TV and VIP phone; player-eligibility validation; seeded playlist planning; fixed 1–8-player roster, protected begin/complete state transitions, 10/8/6/5/4/3/2/1 Party Points ledger, per-game standings and next-game action. Until future game releases, available Grand Prix repeats.
5. **Phone controller:** backwards-compatible Grand Prix pad; mode-aware labels, optional aim/power/bet/turn panels, VIP game selection, VIP Party Night settings, and a 3-second rate-limited cheer for waiting/finished racers. Mode panels do not imply implemented new-game rules.
6. **Physics foundations:** DOM-free Builder objects for pegs, spinner arms, moving gates, buckets, target rings, golf cups, water zones and shrinking rim. Opt-in World contact and sensor events; buckets score after 0.4 seconds of dwell. Grand Prix does not instantiate Party Pack obstacles.
7. **CPU planning:** seeded skill-based decision planners for each future game, tested over at least 30 independent seeds each. These are planning **interfaces**, not substitutes for actual playable minigame bots or completed game-balance simulations.
8. **Preservation:** all 119 approved image assets and existing audio kept unchanged. Render and GitHub main remain untouched.

## Automated acceptance gate

Required CI jobs:
- Party Pack foundation QA: syntax, six mode registry, Party Night scoring/session guards, seven-track deterministic Grand Prix physics comparison against main, geometry/sensor tests and compiled TV/phone output.
- Approved art integration QA: approved runtime asset audit, real-browser Grand Prix race, TV lobby layout and preview, simulated TV plus two phones via local WebSocket and controller actions.
- A browser-only short-circuit test completes 3 Grand Prix cups within a Party Night and starts an ordinary Grand Prix afterwards. This validates transitions but is **not** the same as physically completing three full races.

Only mark **Phase 2 engineering complete** after both CI jobs pass on the final commit. No actual multi-phone acceptance is claimed from browser simulation.

## Boundaries — Phase 3 and beyond

The following are **not Phase 2 foundation defects**:
- Phase 3: implement Drop Zone rules, full physics, artwork, UI, actual scoring, deterministic bots and 30+ full-game simulations.
- Later dedicated phases: Bowl Brawl, Marble Derby, Curling and Golf actual competitive rules, physical mechanics, animations and full bots, with independent acceptance.
- Final art/audio production and physical-device end-to-end acceptance before Alpha release.

A Mode Pack of six playable games is **not** yet complete. This distinction must remain visible in release notes.

## Final status

Development implementation is complete. Verify the latest *matching commit* for both GitHub Actions workflows before promoting Phase 2 to accepted. **No merge or Render deployment is authorised by this document.**
