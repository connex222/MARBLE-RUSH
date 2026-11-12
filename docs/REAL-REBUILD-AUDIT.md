# MARBLE RUSH — Real Rebuild: Source Audit and Asset Custody

**Audit date:** 11 November 2026. **New branch:** `improvement/marble-rush-real-rebuild`.
**Exact source branch / commit:** `dev/party-pack-ui-v2-rebuild` at `324010c17af491cd8f4bd73cd19296872c81a4b2`.
**Production baseline:** `main` at `7770ee678338825b03eb11af02a96e161cbb903b`.
**Release policy:** no merge, no Render deployment, no production writes without explicit visual acceptance.

## Verified playable games and intended presentation order

| Order | Real mode ID | Game | Preserved authoritative rules | Presentation and meaningful player decisions |
|---|---|---|---|---|
| 0 | `grandprix` | Grand Prix | `src/engine.js`, `src/modes/grandprix.js` | Original track, items, camera and phone booster kept separate |
| 1 | `derby` | Marble Derby | `src/modes/derby.js` | Five heats, six real runners, pick virtual-gem stake, cheer after betting; smoothly wider camera for stragglers |
| 2 | `dropzone` | Drop Zone | `src/modes/dropzone.js` | Release position, physical pin hits and scored prize bins, spectator predictions |
| 3 | `brawl` | Bowl Brawl | `src/modes/brawl.js` | Five elimination rounds, real collisions, timed shockwaves, one emergency edge rescue, knockout bonuses; phone RAM / ANCHOR / RECOVER |
| 4 | `curling` | Marble Curling | `src/modes/curling.js` | Five ends, stones, aim / power / curl / sweep, house scoring and spectator prediction |
| 5 | `golf` | Marble Golf | `src/modes/golf.js` | Five-hole Party Night / nine-hole championship, actual stroke counter, moving course hazards, putting, direction guide and spectator cheers |

All six `MODES` registrations reported `available:true` at the original development baseline. The five newer game experiences are not separate Grand Prix variants: they are distinct physics/session engines.

## Retired code and ownership — P0

| Retired / changed item | Reason | Replacement or retained behaviour |
|---|---|---|
| Five rules-engine `function draw()` shims and adapter `draw(ctx,w,h)` | Nonfunctional legacy UI API could be called from an old route | Rules methods return physics, turn state and inputs only; registry no longer requires a draw method |
| `src/modes/party-fx.js` and build inclusion | Old never-used overlay painter, a possible second visual ownership path | Approved individual FX sprite images remain; one mode renderer draws event-driven effects within the stage |
| `#ppWorkInProgress` markup | Dead fallback UI after all five modes became playable | Every mode has a concrete renderer and an explicit owner |
| `MarblePartyUI.enter()` DOM ownership | Derby/Drop Zone had internal ownership while other modes were dispatched elsewhere | `MarblePartyScreen.mount/unmount` alone toggles every game panel and shared canvas |
| Five separate `frame()` rendering branches | Mode switching risked an old game view or hidden stale canvas drawing | One `MarblePartyScreen.render(mode,state,assets)` dispatch with a fail-closed registry |
| Background Grand Prix `#cv` during Party Pack play | Even a hidden/covered old canvas should never be active behind a game | Explicit `#cv[hidden]` while the exclusive Party Pack canvas is mounted; restored on lobby/Grand Prix |
| Old per-game screen canvases (`derbyCanvas`, `golfCanvas`, `curlingCanvas`, `brawlCanvas`, `dropZoneCanvas`) | User rejected old/new scene layering | Not present in source HTML; negative tests reject any reintroduction |

**Still retained intentionally:** `src/modes/party-presentation.js` for podium/finale themes; the lobby-only attract preview canvas; `src/tv.html#cv` for Grand Prix; `src/play.html#padZone` for Grand Prix phones (must be hidden in Party Pack); all approved image/audio assets. No grandfathered fallback stage.

### Graphics truthfulness

The approved `assets/raw` Party Pack deliverables are **PNG raster images** (stylised pre-rendered 3D artwork, textures, props and effects), not editable mesh assets such as GLB/GLTF. The new TV renderer draws **actual game coordinates, live obstacles, animated marbles, physical outcomes and state-specific FX** into a Canvas2D scene with perspective cues. It is **not a native realtime 3D mesh renderer**. Art preservation and the lack of legacy UI should not be confused with a claim of native AAA 3D quality.

## Complete 68-name Party Pack asset inventory

**Status definition:** `Referenced` means the file's key occurs in a live mode renderer/phone/presentation source; `Preserved` means its bytes are retained but it is not directly named in a current renderer. No original asset is deleted.

### DERBY — 12 assets

| Exact approved file | Source usage |
|---|---|
| `pp_derby_bg.png` | Referenced: party-ui-v2.js, src/play.html |
| `pp_derby_fx_confetti.png` | Referenced: party-ui-v2.js |
| `pp_derby_fx_dust.png` | Preserved, not directly referenced |
| `pp_derby_fx_impact.png` | Preserved, not directly referenced |
| `pp_derby_fx_laurel.png` | Referenced: party-ui-v2.js |
| `pp_derby_fx_photo.png` | Referenced: party-ui-v2.js |
| `pp_derby_fx_speed.png` | Preserved, not directly referenced |
| `pp_derby_fx_sunset.png` | Preserved, not directly referenced |
| `pp_derby_fx_surge.png` | Referenced: party-ui-v2.js |
| `pp_derby_prop_grandstand.png` | Referenced: party-ui-v2.js |
| `pp_derby_prop_hay_bales.png` | Referenced: party-ui-v2.js |
| `pp_derby_surface_main.png` | Referenced: party-ui-v2.js |

### DROPZONE — 12 assets

| Exact approved file | Source usage |
|---|---|
| `pp_dropzone_bg.png` | Referenced: party-ui-v2.js, src/play.html |
| `pp_dropzone_fx_chime.png` | Preserved, not directly referenced |
| `pp_dropzone_fx_coins.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_fx_confetti.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_fx_fall.png` | Preserved, not directly referenced |
| `pp_dropzone_fx_jackpot.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_fx_multiplier.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_fx_peg.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_fx_superjackpot.png` | Preserved, not directly referenced |
| `pp_dropzone_prop_glass_chute.png` | Referenced: party-ui-v2.js |
| `pp_dropzone_prop_gold_bucket.png` | Referenced: party-ui-v2.js, src/play.html |
| `pp_dropzone_surface_main.png` | Referenced: party-ui-v2.js |

### BRAWL — 12 assets

| Exact approved file | Source usage |
|---|---|
| `pp_brawl_bg.png` | Referenced: party-brawl-ui-v2.js, src/play.html |
| `pp_brawl_fx_dust.png` | Preserved, not directly referenced |
| `pp_brawl_fx_impact.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_fx_ko.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_fx_ricochet.png` | Preserved, not directly referenced |
| `pp_brawl_fx_shockwave.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_fx_spin.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_fx_victory.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_fx_warning.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_prop_spin_hazard.png` | Referenced: party-brawl-ui-v2.js, src/play.html |
| `pp_brawl_prop_striped_bumper.png` | Referenced: party-brawl-ui-v2.js |
| `pp_brawl_surface_main.png` | Referenced: party-brawl-ui-v2.js |

### CURLING — 12 assets

| Exact approved file | Source usage |
|---|---|
| `pp_curling_bg.png` | Referenced: party-curling-ui-v2.js, src/play.html |
| `pp_curling_fx_aurora.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_fx_impact.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_fx_mist.png` | Preserved, not directly referenced |
| `pp_curling_fx_ricochet.png` | Preserved, not directly referenced |
| `pp_curling_fx_scrape.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_fx_sweep.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_fx_target.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_fx_victory.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_prop_alpine_lodge.png` | Referenced: party-curling-ui-v2.js |
| `pp_curling_prop_ice_blocks.png` | Referenced: party-curling-ui-v2.js, src/play.html |
| `pp_curling_surface_main.png` | Referenced: party-curling-ui-v2.js |

### GOLF — 12 assets

| Exact approved file | Source usage |
|---|---|
| `pp_golf_bg.png` | Referenced: party-golf-ui-v2.js, src/play.html |
| `pp_golf_fx_confetti.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_cup.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_flag.png` | Preserved, not directly referenced |
| `pp_golf_fx_holeinone.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_putt.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_ricochet.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_roll.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_fx_sunset.png` | Preserved, not directly referenced |
| `pp_golf_prop_stone_bridge.png` | Referenced: party-golf-ui-v2.js |
| `pp_golf_prop_windmill.png` | Referenced: party-golf-ui-v2.js, src/play.html |
| `pp_golf_surface_main.png` | Referenced: party-golf-ui-v2.js |

### SHARED — 8 assets

| Exact approved file | Source usage |
|---|---|
| `pp_shared_fx_boost.png` | Preserved, not directly referenced |
| `pp_shared_fx_confetti.png` | Referenced: party-presentation.js |
| `pp_shared_fx_crown.png` | Preserved, not directly referenced |
| `pp_shared_fx_dust.png` | Preserved, not directly referenced |
| `pp_shared_fx_finale.png` | Preserved, not directly referenced |
| `pp_shared_fx_impact.png` | Preserved, not directly referenced |
| `pp_shared_fx_select.png` | Preserved, not directly referenced |
| `pp_shared_fx_start.png` | Preserved, not directly referenced |

## Validation matrix / acceptance gates

1. **P0 static ownership:** exactly one `#partyStageCanvas`; `#cv` hidden during every additional game; one correct `data-renderer`, visible HUD group, no old mode canvas, placeholder, legacy painter, or engine `draw()`.
2. **P1 real gameplay:** all five full playthroughs in deterministic rules tests, 30+ Brawl seeds, five/nine Golf holes, score and finish callback exactly once, collision and reset scenarios.
3. **P1 responsiveness/performance:** Chromium 1920×1080 screenshot and runtime renderer metrics per mode; real Playwright phone WebSocket actions; browser click-to-visible-state latency samples; report average and percentile rather than claiming physical-device FPS.
4. **Camera:** Grand Prix original elastic pack framing and catch-up remains unchanged; Derby zoom depends on actual relative runner positions and eases in/out, with reduced-motion suppression.
5. **Release blocker:** physical TV/laptop and 2–4 actual phones have not been tested via connector. Manual acceptance must cover Wi-Fi connectivity, TV readability, input latency, motion tolerance, rejoin and restart. Do not merge or deploy before approval.

## Evidence process

Capture matching 1920×1080 TV shots for Derby, Drop Zone, Brawl, Curling and Golf from both the previous development build and the improvement build; label source commit and phase. Pair each with relevant phone screenshots, gameplay state trace and CI artefact. Visual changes to unaffected game layouts may be minimal: **do not falsely market unchanged art as a new generation of 3D assets**. All changed architecture and mode behaviour must be documented.

## 12 November 2026 review — what is verified and what remains inadequate

**Baseline provenance:** five before images come from `dev/party-pack-ui-v2-rebuild`'s
successful CI run `43054153324` (source commit `324010c1`); five after images
come from improvement-branch CI run `43110470509` (commit `7a4fc67e`).
Files are the existing `qa-ui-v2-{derby-live,dropzone-aim,brawl-live,curling-aim,golf-aim}.png`.
The baseline and after screenshots show **very similar visual compositions**:
the important improvement is removal of duplicate ownership and consolidation
of physics-driven screen routing, not a completely new series of 3D environments.
These image pairs are different live moments, **not pixel-matched renders**.
No claim of upgraded native mesh rendering is justified.

**Automated test evidence:**
- Five normal complete mode playthroughs and original Grand Prix regression
  pass; replay/reset isolation runs all five additional modes again.
- Source-verified no legacy canvases, one live host, shared race canvas hidden,
  and UI groups hidden unless owned by the current mode.
- 120 simulated five-round Bowl Brawl matches (40 seeds each at 2, 4 and 8
  players) ran with real physics: mid-match leader reversal 40.0%, 47.5% and
  42.5% respectively; average knockouts 1.925, 6.3 and 16.1 per match.
  These are **CPU simulations**, not measured human excitement.
- Five Playwright phone-to-TV control samples: Derby 77ms, Drop Zone 124ms,
  Brawl 100ms, Curling 111ms, Golf 115ms. Median 111ms; five-sample maximum
  (reported p95) 124ms. **Do not interpret five observations as a robust
  network p95 or physical Wi-Fi latency**.

**Open critical performance issue:** Initial one-second headless Chromium CI
samples at 1920x1080 reported just 18.6 FPS Derby, 16.2 Drop Zone,
20.7 Brawl, 18.3 Curling and 17.4 Golf. Average actual draw calls
were 0.56–1.75ms, so it is **not proven** that Canvas drawing itself is the
bottleneck. These are small and hardware-unrepresentative browser-CI samples.
Instrumentation now captures p95 frame interval, p95 draw time and more
frames per mode. Nevertheless **these results are not a 60fps performance pass**.
Measure on the user's target Windows/TV hardware before approving.

**Release status remains BLOCKED:** manual 1080p/4K TV usability, 2–4 physical
mobile devices on the same Wi-Fi, input latency and reconnection, long sessions,
and human judgement of hazard clarity/agency and spectator comprehension.
A genuine artistic step-change beyond the current approved raster dioramas
would require separate production art work, not more CSS layers. Preserve the
original image bytes and Grand Prix architecture throughout.
