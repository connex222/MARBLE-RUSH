# MARBLE RUSH Party Pack — Phase 2 (foundations)

**Development branch only. Do not merge or deploy.**

## Implemented
- Six registered game descriptors, all with a common method interface.
- DOM-free reusable geometry primitives for peg grids, spinners, bucket sensors, moving gates, target rings, golf cups, water zones and shrinking rims. The World now supports opt-in peg and spinner hub collision and edge-triggered bucket, target, water and cup sensor events; spinner arms, timed sensors, moving gates and other full mechanics are not yet connected.
- Grand Prix remains the sole playable mode. Its original cup initialisation sequence is now delegated to the mode adapter without changing call order; its race/voting/results logic remains in the existing TV state machine.
- Five non-playable descriptors are intentionally disabled to prevent a user entering unfinished games.
- A TV game-picker showing all six modes, visually distinguishing Grand Prix from future games.
- Phone HUD transmits mode and phase, supports mode-specific pad labels, and lets the VIP select an available mode from the phone. Unfinished modes remain disabled.
- Pure Party Points ledger (10/8/6/5/4/3/2/1), ranking validation, seeded 3/5/7-game queue planning and cumulative scores.
- World option `passing:false` disables the Grand Prix glancing-overtake special rule for future games; the default remains true.
- Existing screen-free balance script remains intact and now rejects unfinished modes explicitly.
- Dedicated Node foundation tests and CI workflow.

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
GitHub foundation CI runs `npm install`, `npm run test:party`, `npm run build` and source syntax checks. The existing browser art suite runs separately on PR changes. New dedicated CI check compares candidate and main Grand Prix physics over all seven tracks with four racers and identical seeded inputs; this check passed on its first run. Run `npm run balance -- grandprix 1` to compare the live race against the baseline; production has not been touched. CI also runs static syntax checks and audits that the six mode descriptors are baked into the standalone TV page. Do not claim end-to-end Party Night works until modes have been implemented and tested.
