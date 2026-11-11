# MARBLE RUSH — Party Pack UI v2 Clean Rebuild

**Status:** Development-only, NOT MERGED, NOT DEPLOYED.  
**Branch:** `dev/party-pack-ui-v2-rebuild` (forked from the current `main`, not the rejected layered WebGL experiment).  
**Completed development modes:** Marble Derby, Drop Zone, Bowl Brawl and Marble Curling.
**Current visual acceptance:** These are working development previews; user review of Curling's new presentation is pending.  

## Why this branch exists

The previous `dev/aaa-gameplay-cinematic-rebuild` preview failed visual acceptance: Golf and Curling looked like a 3D pane over an old game, Brawl reverted to the old UI, and Derby and Drop Zone barely changed. That branch is **not** the foundation of v2.

## Hard reset scope

- Remove the five old mode screen canvases and controls from `src/tv.html`.
- Remove the legacy `draw()` view implementations from `src/modes/derby.js`, `dropzone.js`, `brawl.js`, `curling.js` and `golf.js`. Keep the harmless empty `draw()` public API shim for compatibility until all callers migrate.
- Retire the obsolete `MarblePartyStage` shared rendering helpers from `src/modes/registry.js`.
- Keep **all authoritative mode simulations**, scores, phone actions, game-specific event metadata, assets, music and Grand Prix untouched.
- Do not combine the old flat canvases with the new UI. One mode = one exclusive new stage.
- Temporarily mark only the unrebuilt Golf **unavailable** on this branch. Their rules/tests remain available. They must never be selectable without a working new scene.
- Preserve the shared lobby, original Grand Prix, networking and final score flow.

## Marble Derby v2 — first rebuild

- Dedicated new full-TV stage (`src/modes/party-ui-v2.js`), mounted through `data-screen="party-stage"`.
- New TV HUD: clearly readable heat/course/timer, virtual-gem betting, runner choice, TV cheer control, live gem standings and crowd meter.
- Reuses approved `pp_derby_bg`, `pp_derby_surface_main`, `pp_derby_prop_grandstand`, `pp_derby_prop_hay_bales`, `pp_derby_fx_laurel`, `pp_derby_fx_surge`, plus the approved marble-swirl textures.
- Hand-built perspective stadium diorama presentation with six graduated lanes, raised rails, a perspective finish gantry, rolling marble texture, movement trails and heat-winner reveal.
- No new simulation, no new randomness in game rules and no new external asset hosting. Betting is virtual and remains authoritative on the TV as before.
- The game presentations use a new single-stage perspective Canvas2D composition, **not a claim of physically simulated 3D**. Upgrade to genuine 3D only if TV visual review establishes a clear need; never put one render layer over the old UI.

## Drop Zone v2 — second rebuild

- Dedicated full-screen glass and brass cabinet reusing **all four principal approved Drop Zone assets** (`pp_dropzone_bg`, `pp_dropzone_surface_main`, `pp_dropzone_prop_glass_chute`, `pp_dropzone_prop_gold_bucket`) and the approved peg, multiplier, jackpot, coins and confetti effects.
- Authentic game-state pegs, moving gold targets, spinner, oscillating gate, falling marble and eight live prize bins. The 85 peg locations, x/aim, physics and jackpots are all read directly from `DropZone.state`.
- Brand-new left-side TV aim/drop controls, separate right-hand jackpot leaderboard, current player, elapsed time, round information and last prize.
- Matching teal/gold phone controller: full-size DROP action while aiming, compact 8-bin predictor buttons during a drop, the existing VIP lobby exit.
- Real 5-round deterministic game engine, scoring, CPU and connection paths unchanged. No duplicate old TV pegboard canvas behind the new presentation.
- A separate browser and two-phone WebSocket smoke must pass; visual approval on the actual TV remains required.

## Bowl Brawl v2 — third rebuild

- Entirely new stadium composition in `src/modes/party-brawl-ui-v2.js`: original camera-like elliptical bowl and sculpted copper rail, authoritative shrinking boundary, glowing dynamic hazards, shaded and texture-backed marbles, collision effects and brief winner transitions.
- Reuses approved `pp_brawl_bg`, `pp_brawl_surface_main`, `pp_brawl_prop_spin_hazard`, `pp_brawl_prop_striped_bumper`, plus approved `pp_brawl_fx_*` effects. No replacement asset requests.
- New TV HUD for hazard, round, countdown, survivors, live standings, energy, steering, RAM and ANCHOR. No old Brawl canvas or old overlay.
- New matched phone layout with large RAM and ANCHOR controls and spectator state. Original authenticated inputs and authoritative 2–8 player, five-round scoring untouched.
- `Brawl` is enabled only in the UI v2 development branch. Curling has since been rebuilt; Golf remains locked.
- Automated QA covers whole matches, precise collision/energy mechanics, full TV compositing, four mounted control buttons and two actual WebSocket phones; manual TV art acceptance is still required.

## Marble Curling v2 — fourth rebuild

- Entirely new Alpine winter set and raised ice rink `src/modes/party-curling-ui-v2.js`. Four built-in approved backdrop/surface/prop assets and approved ice/sweep/impact/victory effects make the game visually distinct from the withdrawn screen.
- The actual physics coordinates `1300 × 530` and button position `(1140,265)` drive the stone positions, house rings, power aim and movement effects. No fake physics or overlayed old board.
- TV-safe separate HUD for 5 ends, 2 stones per player, shot clock, precise aiming, shot power, curl, sweep, real player scores and action states.
- Matching alpine teal phone control layout, full-size THROW and SWEEP actions, and spectator/house-prediction view. All input messages remain authenticated through the original multiplayer engine.
- No user avatars, Grand Prix assets or previously approved mini-game art modified.
- Preview launcher: `tools/OPEN-PARTY-UI-V2-CURLING-PREVIEW.bat` on localhost port `35997`, never production.
- New browser and 2-phone QA verifies all five ends, scoring, throws, sweeps, spectator predictions and absence of old mode UI.

## Acceptance gates

1. `node tools/test-party-foundations.js` and game-specific deterministic regression tests pass, even for the remaining gated Golf mode.
2. `node tools/test-party-ui-v2.js` proves all old mode canvases, old stage helpers and stale view handlers are gone.
3. `npm run build`, `node tools/test-phase4-release.js`, `node tools/audit-art.js` verify existing files and approved image/audio counts.
4. Browser `tools/party-ui-v2-browser-smoke.js` checks all four independent 1920×1080 presentations, Curling aim/power/spin/sweep, each game's five-round/end finale, commentator cleanup and Grand Prix.
5. WebSocket `tools/party-ui-v2-multiplayer-smoke.js` checks two independent phones, VIP selection, private Derby wagers, Drop Zone aiming/drop/prediction, Brawl RAM/ANCHOR, and Curling aiming/throw/sweep and spectators.
6. Real 1920×1080 TV visual assessment, reliable performance and physical 2–4-phone acceptance are **still required before a release**.
7. Get explicit user approval of each rebuilt mode's gameplay and visual screen before proceeding to the next full mode rebuild. **No merge or deployment until all five are completed and approved.**

## Review

Latest independent launcher: `tools/OPEN-PARTY-UI-V2-CURLING-PREVIEW.bat` (Windows, Node.js + Git required). It opens `http://localhost:35997/tv` using a separate preview folder. All screenshots are generated by the branch-only GitHub Actions workflow `party-ui-v2.yml`, which does not deploy.

## Remaining roadmap

- Stage 2: Drop Zone — brass-and-glass game-show cabinet, integrated chute and live jackpot HUD (development complete; review pending).
- Stage 3: Bowl Brawl — complete new elimination arena, live shrink ring, five hazards, authenticated phone RAM/ANCHOR, spectator panel (development complete; visual acceptance pending).
- Stage 4: Marble Curling — independent premium Alpine ice diorama, live house, aim and throw HUD, phone SWEEP controls and five-end scoring (development complete; visual acceptance pending).
- Stage 5: Marble Golf — miniature hole dioramas, shot control and turn HUD.
- Stage 6: unify presentation/result screens and perform full Party Night/TV/multiplayer acceptance.

**Release remains blocked** while Golf's old interface is retired but its replacement is unfinished, and the four new presentations still need final manual visual acceptance.
