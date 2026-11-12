# MARBLE RUSH — Drop Zone **actual native 3D** proof (review branch)

Branch: \`improvement/marble-rush-dropzone-real3d\`. **Do not merge or deploy until it is visually and technically accepted.**

## Scope

The existing production 2D Drop Zone stays the default. Visit \`/tv?dropzone3d=1\` for the WebGL alternative. It acquires and owns the *one* \`#partyStageCanvas\` exclusively, replacing the 2D context element on mount and restoring a fresh 2D canvas on unmount. The approved raw scenery is used as a static background, **not an old gameplay screen beneath the new 3D game**.

The new 3D objects are real meshes with projection, vertex buffers, depth testing and a GPU fragment-lit shader:
- a raised Plinko box, ten rows containing the original 85 pegged obstacles;
- a physical three-dimensional ball at \`state.ball.x/y\` or release aim \`state.x\`;
- live pair of gold pegs from \`state.gold\`;
- moving central bumper and gate using exactly the engine's deterministic \`sin(state.elapsed)\` curves;
- eight separate scoring bins sourced from \`DropZone.BINS\`;
- an illuminated final-round jackpot sourced from \`state.jackpotBin\`.

A game event displays a short visual cue only from a real \`goldPeg\`, \`jackpot\` or \`bucket\` event. There is **no replacement scoring, no new RNG, no parallel physics**. Existing phone controls, five rounds, predictions, awards and TV controls remain original. The existing \`MarblePartyUI.updateDropZone\` provides the same HUD, not a second old game canvas.

## Release gates

1. GitHub Actions browser must show the 85 mesh pegs and genuine 3D ball moving with the engine, one active renderer at a time, and complete a scoring action.
2. Switching back to ordinary Derby/Grand Prix must restore 2D with no residual 3D canvas, labels or background.
3. Physical 1080p TV computer must sustain target FPS and show a polished, legible board from across the room; compare directly to original approved 2D production screen.
4. The current native 3D art is an engineering prototype, not automatic AAA visual acceptance. Do not merge this preview just because technical CI is green.


## Phase 2 visual and performance refinement

The software-rendered screenshot exposed cabinet intrusion under the right-hand scoreboard and an unused dark upper face. The camera offsets the complete genuine 3D board left, real brass marquee studs and medallions fill the blank upper face, and all eight bin labels are anchored to projected 3D bin coordinates instead of arbitrary percentages. A physical jackpot frame is rendered only at the final-round engine-selected index. The live ball has a small 3D shadow derived from its real coordinates. Shape topology is cached on mount, eliminating per-frame sphere/cube construction. No alteration to rules or production default. Physical-device QA remains mandatory.


## TV-first camera and reproducible hardware review

The next screenshot moved the main board clear of the right prize HUD, but its brass upper left corner touched the main DROP ZONE masthead. The camera was pulled back 1.5 world units and offset towards the right to preserve a safe margin without shrinking the real peg geometry or modifying original gameplay.

\`tools/OPEN-DROPZONE-3D-PREVIEW.bat\` creates a **new private review folder** in Windows Documents; it never overwrites an existing checkout, the production build or another game's assets. Compare the original \`/tv\` with \`/tv?dropzone3d=1\` in the same browser and test TV scaling and real phones.

\`tools/dropzone-webgl-performance.js\` records a same-session eight-second-style headless SwiftShader frame/clock benchmark and stores the exact device name, backing resolution, draw calls, p95 timing and real rules-clock progress. Slow software GPU values must not be misrepresented as target 1080p-TV performance. Actual performance, 20-minute physical TV stability and multi-phone reconnect remain unverified.


## Phase 3 — real materials and hardware frame monitor

The two actual WebGL triangle batches now carry a tenth float per vertex: 0 matte, 1 metal/brass, 2 glass-like translucent *appearance* (no real transparency), 3 coloured polished marble. The hardware premium shader produces specular highlights and Fresnel edge reflections while the initial SwiftShader/llvmpipe setting uses simplified diffuse light. This is a shader/material effect, not a physically accurate raytraced reflection. Nonuniformly scaled spheres now have corrected normals, and old unused nine-float GPU buffers have been removed.

The local Windows preview launcher opens \`/tv?dropzone3d=1&debug3d=1\`. An opt-in, disposable text monitor shows FPS observed on that physical browser, GPU, draw calls, active material mode and backing canvas resolution. For A/B comparison use \`&dropzoneMaterial=basic\` or \`&dropzoneMaterial=premium\`. No second canvas or render loop is created.

CI deliberately toggles premium shader on the software GPU, checks for rendering errors, and captures a third screenshot, then returns to the cheaper shader before the regular scoring and game-mode-switch acceptance. The dedicated performance script confirms the hardware-monitor DOM text exists. CI software frame rates remain inconclusive for 1080p television acceptance.


## Phase 4 — preserve hero-marble quality while reducing GPU geometry

The field contains 85 physical obstacles, each built from a recessed and front-facing
native 3D sphere. Together with decorative studs there are 219 small static sphere
instances. Their topology has been reduced from 8×12 (192 triangles each) to 6×9
(108 triangles each). Expected static triangle reduction is approximately 43%.
The **single player marble has been upgraded** to a smoother 14×20 sphere
(560 triangles), while bumpers and highlights use 7×10 geometry. No peg coordinates,
collision radii, rules, scoring or controller inputs have changed.

The native 3D renderer reports the *actual* indexed triangle counts in
\`MarbleDropZoneWebGL.debug().staticTriangles\` and \`.dynamicTriangles\`.
Browser QA asserts the geometry remains genuinely three-dimensional but within
the budget. The physics and game clock are unchanged.

Prior code called synchronous \`gl.readPixels\` twice on the very first frame of
**every game**. This is a GPU/CPU synchronization point which can cause stalls.
Now it is available **only** with \`?dropzone3d=1&probe3d=1\`, which
automated browser QA uses to preserve its proof that the real marble writes
visible pixels. The performance benchmark and actual player preview use no
synchronous readbacks. This is a reduction in render cost, not yet evidence
of acceptable hardware frame rates.


## Phase 4b — recover the 3D game after real graphics-context loss

The browser smoke test uses \`WEBGL_lose_context\` to discard the **actual**
GPU context while a Drop Zone game exists, waits for the renderer to report
\`contextLost\`, then restores the context and demands fresh real WebGL
geometry and shader resources. It verifies that the original authoritative
turn, drop count and score have not been reset and there is still exactly
one canvas. It saves a separate restored-scene screenshot.

This test is limited to software Chromium; it is not proof of physical-TV
driver stability, power suspension, network reconnect or a 20-minute session.
If restoration breaks, CI fails and PR #55 must remain a draft.


## Adaptive TV GPU budget (review-only)

The experimental renderer now measures displayed frames in 4-second windows and can reduce its WebGL backing resolution **without modifying world coordinates, physics, game clock, phone controls or camera geometry**. There are hard floors (55% on hardware GPU, 40% on detected software renderer) and a 9.5-second cooldown between changes. Two consecutive slow windows (below 25 FPS) are needed before a downgrade; for hardware GPU the unforced premium material pass is disabled first. Four sustained fast windows (above 56 FPS) permit gradual recovery. The monitor labels AUTO or FIXED and records the last adjustment reason; the quality telemetry exposes exact samples and transitions.

Review overrides: `&dropzoneAdaptive=0` disables automatic changes. `&dropzoneScale=0.60` requests a fixed backing scale and also disables automatic changes. Explicit `&dropzoneMaterial=premium` or `basic` is respected by the policy. The browser smoke test covers an actual live WebGL backing resize after graphics-context restoration, with score, turn and canvas ownership preserved. All production default screens remain unchanged.
