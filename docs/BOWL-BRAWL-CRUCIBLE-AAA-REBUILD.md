# MARBLE RUSH — BOWL BRAWL / THE CRUCIBLE
## Development acceptance record · 15 November 2026

**Branch:** `improvement/marble-rush-bowl-brawl-aaa`  
**Status:** native WebGL implementation and release isolation committed; **visual and physical acceptance NOT YET PASSED**.  
**Production:** unchanged. Do **not** merge/deploy to Render until approved.

### 1. Protected product and hidden add-ons

- Original **Grand Prix** remains the default, playable mode. All **seven original tracks** and the Grand Prix physics, track definitions, camera and art files remain byte-for-byte untouched by this branch.
- The five add-ons remain in the source tree, including their existing physics, art, scoring and session code. They have **not** been deleted.
- The ordinary TV mode picker and phone-host picker expose Grand Prix alone.
- Party Night is disabled for this development release: it must not silently fill a three-, five- or seven-mode sequence with unapproved games.
- A **deliberate development-only opt-in URL** enables exactly Bowl Brawl in addition to Grand Prix, without publishing the other four modes.

### 2. The Crucible — real 3D engine

`src/modes/party-brawl-webgl.js` is a **native WebGL mesh renderer** (not an old canvas overlaid by another one). It has a tessellated bowl floor with calculated wall depth, stadium platform, machined metal rail, metal segments, inset lights, lit glass marbles and hazard-specific 3D geometry. Its baseline draw path is two GPU draws: a cached static arena mesh and an updated dynamic mesh.

The renderer **only reads** the original deterministic `BowlBrawl` state and events. It does not invent a second set of impacts or scoring rules:
- bumpers at the real engine locations; rotating collider at the engine's actual moving position
- slippery ice region in the correct physical place
- actual shrinking safe radius and warning/edge state
- center-origin timed shockwaves, telegraphed before firing
- live 3D marble positions, RAM/ANCHOR/RECOVER visual status
- real collisions, knockouts and award cues

The existing single Party Pack screen host mounts/unmounts the active WebGL canvas exclusively and restores a new 2D canvas when leaving. It reverts to the existing 2D Bowl Brawl in the event of WebGL creation failure, repeated rendering failures or unrecovered context loss. **Grand Prix's `#cv` renderer remains separate and untouched.**

The modelled environment is a first playable 3D candidate, **not** proof that the final visual quality matches the ChatGPT-generated art-direction concept.

### 3. Visual language

Working name: **THE CRUCIBLE BOWL**. Premium engineered sport, not children's carnival. Graphite metal, satin brass, controlled cyan/amber hazard lighting, restrained typography, hairline card borders, discreet stadium visual cues and coloured glass player marbles. The new HUD CSS is scoped strictly to the 3D renderer; every other game and the 2D fallback retain their original styles.

The ChatGPT concept render is an **art-direction reference**, not a claim that the same rendered image or meshes are present in the playable scene. No generated bitmap has been smuggled in as a fake gameplay environment.

### 4. Creative Claw sound

Five new generated sounds/music assets have **development-only** permanent Creative Claw CDN URLs, applied only with `?brawl3d=1`:
- cinematic instrumental arena loop, quiet enough for the announcer and impacts
- charged RAM propulsion
- glass-on-metal impact, triggered by an **actual** engine `hit` event
- telegraphed shockwave blast, triggered by an **actual** `shockwave` event
- knockout accent, triggered by a **real** knockout

The existing game music and effects toggles govern playback. The preview uses the existing original/synth audio if the Creative Claw asset cannot load; do **not** make CDN availability a production dependency. For release, approve and ingest properly licensed/source-verified audio files into the repository's asset pipeline and verify CORS, volumes, transitions and no hiss on target hardware. Generated file URLs here are intentionally restricted to the opt-in branch.

### 5. How to preview (development only)

Check out this branch to a **new folder** (do not replace a working main checkout). Install dependencies using `npm install`, run `npm run build` then `npm start`. Open:

- Grand Prix-only public selection: `http://localhost:PORT/tv`
- Grand Prix **plus** Bowl Brawl WebGL preview: `http://localhost:PORT/tv?brawl3d=1`
- Phone controller: same server `/play` path (or scan the TV QR)

Use `PORT` from the local server's output. The actual Render production URL still serves `main`, so adding the query flag there **will not** display the unmerged native Bowl Brawl branch.

Offline test command: `npm run test:brawl3d`.

### 6. QA status

**Performed using current tool access:**
- GitHub source review of the existing six modes and five separate authoritative engines.
- No files changed in `src/engine.js`, `src/modes/grandprix.js`, track data or approved raw assets, verified by GitHub commit comparison.
- Syntax parsing of modified JavaScript files in a V8 sandbox: pass.
- Computational mocked-WebGL five-hazard render cycle: pass; verified 2 draws per scene, nonempty geometry and unmount behavior with a fake GPU.

**Not performed or not approved:**
- Full `npm install && npm run build` and Node test suite on a real Git checkout
- Real WebGL shader compile/pixels in Chrome on target GPU
- 1080p and 4K physical TV review, premium material appearance and accessibility
- Actual 2–4 physical phone join and 20+ minute sessions
- Physical latency, sustained FPS, audio mixing/decay, single-view continuity through several games
- Human excitement testing, audience clarity and final AAA visual sign-off

**Stop conditions:** blank arena, wrong orientation, wrong hazard hitbox indication, unreadable marbles or labels, duplicated canvas, blocked controls, audio hiss, wrong result, broken Grand Prix, slow-frame overload, unavailable phone input, false fallback status. Do not merge when any of these is unresolved.

### 7. Next acceptance sequence

1. Run the repository build and `test:brawl3d` plus established Grand Prix physics and gameplay regression suites locally.
2. Compare real screenshots/video: original Grand Prix vs The Crucible on the same 1080p TV. The new level must be unmistakably premium without exaggerated glow.
3. Measure real native GPU performance. Target a sustained 60 FPS at 1080p on the actual TV hardware; anything consistently below 45 FPS blocks release.
4. Test 2–4 physical phones, RAM/ANCHOR/RECOVER, all five hazard rounds, disconnect/rejoin, results and return to Grand Prix; check no second canvas.
5. Review sound at lounge TV volumes, including narrator ducking, mute/unmute and transition. Record a live visual/audio approval and only then discuss release/Render deployment.
