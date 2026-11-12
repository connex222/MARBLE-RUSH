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
