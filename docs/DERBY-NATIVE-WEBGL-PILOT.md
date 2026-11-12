# MARBLE RUSH — Derby native-WebGL pilot (review only)

Branch: `improvement/marble-rush-derby-true3d` from production `main` at `66cc729e310b5c905c0e165e706e63d12c1d1dec` (the previously merged real-rebuild commit).

## Explicit scope and approval

This change is **not** the completed five-mode visual rebuild and **not** an AAA art acceptance. Do not merge or deploy it without explicit owner approval. Default `/tv` and the other modes retain the old presentation; the WebGL Derby preview activates **only** with `/tv?derby3d=1`. A/B comparisons can be run from the same server and same rules.

## Why this is genuinely 3D

- Single on-screen `#partyStageCanvas`. The shared Party Pack host removes the old Canvas2D DOM node when Derby WebGL mounts; it creates a fresh Canvas2D canvas on unmount. Neither old Derby nor Grand Prix renders behind it.
- Original `src/modes/derby.js` provides the six marble x-coordinates, the six actual runner colours, five heats, virtual-gem bets, cheer effects and result history. There is **no visual-side physics simulation**.
- WebGL vertex/index buffers, per-triangle normals, sphere and cuboid meshes, vertex/fragment shader lighting, depth testing, actual 3D camera perspective and model matrices. Fences, gates, raised track, stands, lanes and marbles occupy real 3D positions.
- Camera tracks the true slowest and fastest runner as the field spreads, then moves back smoothly. Reduced-motion uses a fixed full-course framing. No parallel animation loop.
- Unchanged original Derby TV HUD (including controls, odds and gem standings) updates from the same state. Phone WebSocket actions are untouched.
- Approved original `pp_derby_surface_main` provides track surface texture; `pp_derby_prop_grandstand` and `pp_derby_prop_hay_bales` are placed as contextual billboards within the same WebGL scene. The six approved `marble_swirl_01`…`06` images are texture sources. Approved source bytes are not modified. The geometry is new authored code rather than GLB art.

## Evidence and fidelity constraints

`tools/test-derby-webgl.js` asserts native triangle meshes and a single owned renderer. `tools/derby-webgl-browser-smoke.js` starts Derby in headless Chromium/SwiftShader, asserts WebGL and actual draw calls, captures 1920×1080 screenshots, exercises live betting/race, completes five heats in the existing authoritative game and verifies returning to Drop Zone Canvas2D and Grand Prix. The pilot CI workflow compares `assets/raw`, `src/engine.js`, `src/modes/grandprix.js` and `src/modes/derby.js` against main.

**Headless software rendering is not a real TV GPU benchmark.** Measure FPS on the intended TV PC at 1080p; check real Wi-Fi/phones, animation comfort, full races, results, texture legibility, spectators and 20-minute stability. Prototype may be visually insufficient even if Chromium passes: specifically review start-gate scale, prop integration, lane/ball visibility and long-range camera motion.

## Preview on Windows

Run `tools/OPEN-DERBY-WEBGL-PREVIEW.bat` on a development machine. It clones this branch to a separate Documents folder, runs regression checks, builds, and opens:
- `http://localhost:36004/tv?derby3d=1` for the new 3D Derby.
- `http://localhost:36004/tv?derby3d=1&qa=1` for opt-in diagnostics.
- `http://localhost:36004/tv` to compare original 2.5D Derby.

No Render action or production deploy is wired to this preview or CI.

## Rollout decision

Do not port the experimental renderer to Drop Zone/Brawl/Curling/Golf until the Derby proof is visually better at TV distance, the single active scene is verified by browser tests and a physical TV/phone session has been accepted. Preserve the other four modes, their assets and rules meanwhile.

## Browser pilot observation — first playable screenshot

The initial GitHub Actions software-Chromium run proved 116 actual draw calls per frame, nine loaded textures, exclusive WebGL ownership, a native GPU program and live authoritative race positions. Its measured headless software frame rate was about **5.1 FPS** (12 frames, average draw 207 ms). This is **not acceptable 1080p target-device performance** and must not be presented as a pass. That run revealed a real typed-resource cleanup error on Derby's finale; the following revision records buffer/shader/program types and removes the large foreground start arch. Passing CI remains necessary before requesting physical acceptance. Real-TV hardware must be measured separately.

## Track draw-call batching

The stadium's immutable lanes, cuboid rails, distance marks and gantry are pre-transformed into **one combined WebGL triangle buffer with per-vertex colours**. The six real marble spheres, six textured lane surfaces and contextual props remain independently drawn using the same camera/depth buffer. This is geometry batching, **not** a Canvas2D screenshot or faux 3D image layer. The effect on software Chromium is measured by the subsequent CI run; this is not itself a 60 FPS claim.


## Phase 1B — visual integration and TV-safe camera

The approved `pp_derby_bg` environment is now rendered as a WebGL texture **inside the same backbuffer** as the native 3D stadium, not as an old DOM game scene. The track plinth, lanes, checkered finish, stands and safe-height rails are real camera-projected triangles. Six position-anchored player labels form **new HUD only** and are detached on unmount; no legacy game screen has ownership. The camera restricts lateral follow movement, widens for stragglers, and uses steady reduced-motion framing.

Performance changes: the fragment shader computes expensive specular highlights only on marble surfaces, periodically samples GPU errors instead of every frame, and adaptively reduces the one canvas' backing resolution if rendering stays slow while preserving full-resolution DOM controls. The actual render scale and GPU name are recorded in QA telemetry; no result is automatically described as physical-TV performance. Software-Chromium measurement and real-TV assessment remain separate acceptance gates.


## Phase 1C — screenshot-driven composition corrections

The first reviewed headless screenshot showed three defects despite passing gameplay QA: the full-screen approved image was vertically inverted, the finish gantry crossed the contenders diagonally, and the raised arena base consumed excessive TV height. This revision corrects the environment UV upload orientation, replaces the finish arch with an unobtrusive back-side marker (the physically checkered finish still spans each lane), reduces podium thickness, and places small runner labels to the left of their 3D marbles rather than above them. Tests explicitly prevent these three regressions. All input/physics/game logic remains untouched.

## Phase 1D — eliminate oversized inert apron

The approved 1C screenshot still showed a huge dark empty foreground beneath the track. The root cause was the 3D platform's 15-unit half-depth against only about 7 units of playable six-lane width—not the platform height. This correction tightens all three plinth layers to the actual arena footprint while preserving positions, collisions, camera and original assets. It also updates the QA guard so the oversized slab cannot silently return.
