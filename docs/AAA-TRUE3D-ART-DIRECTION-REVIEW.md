# MARBLE RUSH — Senior Art Direction Review & True-3D Upgrade

Date: 11 November 2026. Branch: `dev/aaa-gameplay-cinematic-rebuild`.

## Verdict

The original Grand Prix establishes a desirable premium toy-diorama direction. The five added modes do not achieve consistent AAA presentation because their staging is still rooted in framed 2D playfield designs, even when approved cinematic background and particle PNGs are present. Artwork quantity is not the problem: the in-game camera, composition, physical material depth, game-feel response and feedback hierarchy are.

**This branch is an engineering / visual pilot, not an AAA certification or an approval to deploy.** Source-backed evaluation includes previous game's browser QA snapshots and the existing `dev/true-3d-party-pack-pilot` WebGL implementation.

### Comparators

- [Marble It Up! Ultra](https://marbleitup.com/) — player-sized spheres, responsive world camera, physical paths, motion trails, clear primary objective and high-contrast navigation.
- [Super Monkey Ball Banana Rumble](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Super-Monkey-Ball-Banana-Rumble-2528573.html) — sculpted miniature worlds, visible verticality, readable moving hazards, a focal player/ball and wide arena staging.
- [Jelle's Marble Runs](https://jellesmarbleruns.com/) — televised sports presentation, pacing, commentary beats and finish-line stakes.

Do not duplicate their artwork, trademarks, layouts or proprietary camera algorithms; use only general design principles.

## Game-specific production targets

| Game | Why the existing composition feels flat | What the 3D build should add |
| --- | --- | --- |
| Derby | Thin horizontal lanes and a large empty navy lower half | Full-frame curved track with raised rails, physical scenic grandstands, readable balls, tracking camera and decisive photo finish |
| Drop Zone | Flat vertical pegs in a graphic panel | Real brass cabinet depth, lit three-dimensional pins, physical chute, jackpot anticipation, tracked descent and impact light |
| Brawl | Small static circular bowl | Enlarged arena camera, sculpted stadium deck, physical rim, collision bursts, dynamic hazard lights and last-two showdown framing |
| Curling | Flat rectangle with a photographic mountain strip | Reflective sculpted ice, side fencing/chalet, 3D swept stones, camera follow and clear house / target |
| Golf | Flat mini-golf top-down field | Camera that frames each hole, 3D raised walls, bridges, water and windmill scenery, rolling ball spin and success reveal |

## Changes in this branch

- Reuses the **unmerged** version-pinned Three.js WebGL pilot, with a 2D fallback when WebGL fails.
- Widens 3D viewing frames and changes camera distance to make the gameplay board the visual hero, not a tiny cut-out against a dark panel.
- Replaces flat moving marble discs with actual sphere geometry, painterly swirled material under clear coat, and orientation changes as the marble rolls.
- Places real-time FX billboards **inside the 3D world** tied to the authoritative mode event stream, not just effects drawn on the obscured 2D canvas.
- Adds physically modelled scenic sets around the playable area: Derby rails/crowd lighting, Drop Zone cabinet accents, Brawl stadium rings, Curling fences/snow scenery, and Golf landscaping/windmill. These **do not affect collisions**, and fake obstacles are not put into the playable track.
- Keeps existing rules, WebSocket authority, scores, phones, Grand Prix camera, seven Grand Prix tracks, menus, avatars and approved artwork unchanged.
- All game graphics originate from existing ChatGPT-approved art and in-engine procedural geometry. **Creative Claw is only used for existing audio, never images.**

## Acceptance and release gate

### Technical
1. All foundation, phase8 integration and approved-art browser/2-phone simulations pass on the exact PR head.
2. `node --check src/modes/party-3d.js` and `node tools/test-3d-visuals.js` pass.
3. Browser QA proves 3D renders **in front** of the original canvas and that the 2D fallback remains usable.
4. On first-time use, WebGL loads bundled local Three.js modules (no live CDN).
5. No GPU/context errors or stale WebGL renderers after 30 game-switch cycles; restore controls if device lacks WebGL.

### Visual (human review, not covered by CI)
1. At 1920×1080, one metre to three metres from the screen: moving marbles and goals are readable at all times.
2. Actual playfield fills the majority of the stage; no large empty dark areas or huge irrelevant side panels.
3. 3D surfaces look physically attached to scenery; light/shadows communicate height and collision.
4. Each event causes obvious, short-lived visual and audio feedback; no overwhelming bloom, motion sickness or lingering effects.
5. Grand Prix visual standard is matched across all five modes; evaluate screenshots side-by-side and reject modes that still appear flat.
6. At least 30 fps on target low-power TV PC/tablet hardware, with optional 2D fallback and reduced motion.
7. Back to Lobby, player standings and phone action areas remain visible and clickable on all five games.
8. 2–4 **physical phones** play a full Party Night; complete gameplay, results and narration/audio silence tests pass.

**Do not merge or deploy this draft PR until the visual, actual speaker/audio and real-device multiplayer checks pass.** A WebGL pilot is not itself proof of AAA quality.
