# MARBLE RUSH — True-3D Party Pack Visual Overhaul (Design Review)

**Art director verdict: Phase 3 is not AAA gameplay presentation.** Five attractive images and 48 sprites cannot compensate for flat Canvas surfaces and a single fixed camera. The Phase 3 result is acceptable as an illustrated 2.5D party-game alpha, but not as a visual peer of the original Grand Prix.

## Competitor research (November 2026)

1. [Marble It Up! Ultra](https://marbleitup.com/) — physical 3D track geometry, elevation, environmental lighting, visible marble motion, readable chases and fast course transitions.
2. [Marble World](https://store.steampowered.com/app/1491340/Marble_World/) — constructed tracks, realistic physics, marbles visibly interacting with sloped machines and decorations.
3. [Marbles on Stream](https://steamcommunity.com/app/1170970/allnews/) — race-director cameras, selected marble spotlights, trailing-marble chases, finish-line attention and deliberately controlled camera shake.

**Do not copy their characters, maps or artwork.** Adopt the production principles behind their visual clarity and movement.

## Audit of the five new MARBLE RUSH modes

| Mode | Current problem | True-3D target |
|---|---|---|
| Derby | Six flat, horizontally scrolling strips | Sculpted toy track, multiple elevation levels, animated grandstands, tracking/finish cameras, all six racers identifiable |
| Drop Zone | Peg diagram on a pasted background | Physically modelled upright cabinet, raised brass pins, mechanical arms, visible glass falls and jackpot bin camera |
| Bowl Brawl | Static shaded circle | A real metallic bowl, raised lip, dynamic collisions, animated hazards, orbiting director camera and genuine 3D glass marbles |
| Curling | Top-down flat rectangle | Reflective ice with grooves, physical curling stones/marbles, low wide camera and close-up scoring |
| Golf | Flat green board | Sculpted putting terrain, mechanical bridges, water, physical obstacles, follow-camera and close cup celebration |

## Non-negotiable visual acceptance

- Actual 3D geometry, not simply PNGs, gradients, CSS perspective or 2D parallax.
- 1080p TV: large legible HUD at 3 m, never obscured by a return button or decorative art.
- High-quality sphere shading, shadows, metal/wood/ice materials and believable contact with the board.
- Filmic camera transitions but never hide the active marble or player's target; motion-reduced option.
- Sustained 30 FPS minimum on a typical TV/desktop browser with no crashes; prefer 60 FPS when available.
- Physics and scoring stay server-authoritative, never recomputed in the visual layer.
- Full original 2D fallback if WebGL is missing, crashed or toggled off; no external CDN dependency.
- Test real Windows Chrome on TV plus at least two phone controllers before merging.

## Implementation plan

**Stage 1 — engineering pilot in development branch** `dev/true-3d-party-pack-pilot`:
- Pin [Three.js r187](https://threejs.org/manual/pages/installation.html) and bundle both ESM files locally at build time.
- Create optional five-mode WebGL stage, exactly synchronized to existing 2D game states. The game simulation continues untouched.
- Create genuine physical meshes for golf obstacles and putting surfaces, Curling rink, Derby lanes, Drop Zone cabinet/pegs and Bowl Brawl arena/rim.
- Add dynamic group camera, warm/cool lighting, shadowed spheres, physically based clearcoat, and a visible 2D fallback toggle.
- Capture the resulting TV screenshots and compare against the five original 2D screenshots.

**Stage 2 — art production and detail:** sculpted models, physically accurate collision contact shadows, scene-specific animations, HDR studio/reflection environments, per-mode shaders and 3D environmental props.

**Stage 3 — camera director:** precision action cameras, Derby tracking and photo finishes, Drop Zone ball-follow, Brawl final-two spotlight, Curling measurement close-up and Golf cup follow, plus object occlusion avoidance and non-strobing transitions.

**Stage 4 — optimization and acceptance:** performance tiers (WebGL off / balanced / high), CPU and GPU frame budgets, device fallback, automated scene tests, 2–4 physical phones and TV visual acceptance.

The current code is a **visual-pipeline pilot**. It is *not* claimed to achieve final AAA artistic polish: large 3D detail, dynamic hazards, cinematic animations and real-hardware performance verification remain.

## Release restrictions

Work only on `dev/true-3d-party-pack-pilot`. No merge or Render deployment without a user-approved TV quality comparison. Grand Prix assets, seven tracks, simulation, camera and all pre-existing avatars remain untouched. New artwork remains ChatGPT only; Creative Claw remains audio/narration only.
