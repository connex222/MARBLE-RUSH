# MARBLE RUSH Party Pack — Phase 2 (foundations)

**Development branch only. Do not merge or deploy.**

## Implemented
- Six registered game descriptors, all with a common method interface.
- DOM-free reusable geometry primitives for peg grids, spinners, bucket sensors, moving gates, target rings, golf cups, water zones and shrinking rims. The World now supports opt-in peg and spinner hub collision and edge-triggered bucket, target, water and cup sensor events; spinner arms, timed sensors, moving gates and other full mechanics are not yet connected.
- Grand Prix remains the sole playable mode. Its original cup initialisation sequence is now delegated to the mode adapter without changing call order; its race/voting/results logic remains in the existing TV state machine.
- Five non-playable descriptors are intentionally disabled to prevent a user entering unfinished games.
- A compact TV game-picker showing all six modes, visually distinguishing Grand Prix from future games. Browser QA now checks that the picker stays clear of the join information, settings and start buttons.
- Phone HUD transmits mode and phase, supports mode-specific pad labels, and lets the VIP select an available mode from the phone. Unfinished modes remain disabled.
- Pure Party Points ledger (10/8/6/5/4/3/2/1), ranking validation, seeded 3/5/7-game queue planning and cumulative scores.
- New headless PartyCoordinator handles fixed 1–8-player rosters, the begin/complete flow, standings and score snapshots, with guardrails against duplicate scoring, invalid rankings and skipping games. Not yet wired to the TV's live multi-mode flow.
- World option `passing:false` disables the Grand Prix glancing-overtake special rule for future games; the default remains true.
- Existing screen-free balance script remains intact and now rejects unfinished modes explicitly.
- Dedicated Node foundation tests and CI workflow. Browser WebSocket test now also verifies that the VIP phone can select Grand Prix without unlocking unfinished modes.

## Still required before Phase 2 acceptance
- Finish moving the rest of Grand Prix state transitions into its mode adapter with browser regression testing. Only initial cup setup has been extracted so far.
- True 15-second mode-specific CPU attract demos and full settings.
- VIP Party Night game selection and end-to-end cross-mode transitions (ledger is headless only).
- Mode-specific betting/aim/power phone panels and cheer mechanic.
- Complete remaining geometry physics: timed bucket dwell, rotating spinner arms, moving gates, cup and water consequences, target scoring and shrinking rim collisions; existing peg/hub collision and entry sensors are opt-in and tested.
- Mode-specific deterministic bot implementations and 30+ seeded simulations.

## Safeguards
The source branch is isolated from Render's deployed main. Artwork files, sound files and server relay are untouched. A real TV plus 2–4 physical-phone multiplayer acceptance test remains outstanding separately from the new Party Pack work.

## QA
GitHub foundation CI runs `npm install`, `npm run test:party`, `npm run build` and source syntax checks. The browser art suite also runs on development-branch pushes and checks real-TV picker layout and two-phone mode selection. New dedicated CI check compares candidate and main Grand Prix physics over all seven tracks with four racers and identical seeded inputs; this check passed on its first run. Run `npm run balance -- grandprix 1` to compare the live race against the baseline; production has not been touched. CI also runs static syntax checks and audits that the six mode descriptors are baked into the standalone TV page. Do not claim end-to-end Party Night works until modes have been implemented and tested.

## Current integration milestone (10 November 2026)
- Party Night coordinator is connected to TV/phone: 3/5/7 games, cumulative
  Party Points and a 'Next Party Game' transition.
- End-to-end browser smoke includes three complete simulated Grand Prix cups
  inside one Party Night, followed by an ordinary Grand Prix art smoke.
- Grand Prix adapter now owns cup setup, physical input delegation, point
  distribution and final rankings; track voting, rendering, countdown and
  per-frame mechanics remain in the legacy TV controller to preserve behaviour.
- Six mode cards support 15-second CPU *concept previews*. Locked modes cannot
  be started or selected as a playable game.
- Mode-specific phone controls and spectator cheering are integrated as
  shared scaffolding. Their actual betting, aim and power rules belong to
  each game's dedicated production phase.
- World Builder provides all eight new obstacle families. Opt-in physics
  includes peg, spinner-arm, moving gate and shrinking rim contacts, plus
  bucket scoring after 0.4 seconds and one-shot sensor events.
- Seeded bot planners are available for all five new modes; real competitive
  bots and 30+ simulated full games per mode require those modes' rules.

**Remaining boundary:** Phase 2 establishes the shared infrastructure.
No one should claim that the five new games are playable or balanced yet.
Grand Prix is kept authoritative in the TV controller where required by
the approved runtime, rather than risking an unverified complete extraction.
