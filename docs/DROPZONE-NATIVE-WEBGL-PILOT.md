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
