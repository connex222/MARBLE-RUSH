# MARBLE RUSH Party Pack — Phase 2 (foundations)

**Development branch only. Do not merge or deploy.**

## Implemented
- Six registered game descriptors, all with a common method interface.
- DOM-free reusable geometry primitives for peg grids, spinners, bucket sensors, moving gates, target rings, golf cups, water zones and shrinking rims (constructors and sensors only; not yet connected to World physics).
- Grand Prix remains the sole playable mode. The previous TV race state machine is unchanged; the adapter does not yet extract its internals.
- Five non-playable descriptors are intentionally disabled to prevent a user entering unfinished games.
- A TV game-picker showing all six modes, visually distinguishing Grand Prix from future games.
- Phone HUD transmits mode and phase, supports mode-specific pad labels, and lets the VIP select an available mode from the phone. Unfinished modes remain disabled.
- Pure Party Points ledger (10/8/6/5/4/3/2/1), ranking validation, 3/5/7-game queue validation and cumulative scores.
- World option `passing:false` disables the Grand Prix glancing-overtake special rule for future games; the default remains true.
- Existing screen-free balance script remains intact and now rejects unfinished modes explicitly.
- Dedicated Node foundation tests and CI workflow.

## Still required before Phase 2 acceptance
- Extract legacy Grand Prix flow into its mode adapter without changing behaviour. This is deliberately deferred to avoid an unverified large rewrite.
- True 15-second mode-specific CPU attract demos and full settings.
- VIP Party Night game selection and end-to-end cross-mode transitions (ledger is headless only).
- Mode-specific betting/aim/power phone panels and cheer mechanic.
- Integrate the newly provided geometry primitives into the existing DOM-free World collision/physics routines and add per-mode tests.
- Mode-specific deterministic bot implementations and 30+ seeded simulations.

## Safeguards
The source branch is isolated from Render's deployed main. Artwork files, sound files and server relay are untouched. A real TV plus 2–4 physical-phone multiplayer acceptance test remains outstanding separately from the new Party Pack work.

## QA
Run `npm install`, `npm run test:party`, `npm run build`, and `npm run balance -- grandprix 1`. CI also runs static syntax checks and audits that the six mode descriptors are baked into the standalone TV page. Do not claim end-to-end Party Night works until modes have been implemented and tested.
