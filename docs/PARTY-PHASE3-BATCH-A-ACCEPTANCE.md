# Party Pack AAA — Phase 3 Batch A — Approved environment plates

Five concept-environment images approved by the user. Each production plate is named `pp_<mode>_bg.png` and is 1920 × 1080. The build generates `assets/img/pp_<mode>_bg.webp`. `MarblePartyStage.picture` tries the new plate, then falls back to `party_card_<mode>.webp` on a failed request.

These are *decorative*, not 3D geometry. The original images contain marbles painted into the scene, so they are shaded behind the interactive game board. They do not replace live player marbles or physical course objects. The complete Phase 3 requires separately generated clean playfield surfaces and transparent prop sprites, animations and results screens.

**Scope:** development branch only; no merge/deploy. Grand Prix remains unchanged.

**Checks:** five files present, 1920 × 1080, syntax checks of full `registry.js` and `tools/build.js`. Regressions and visual screenshots require running the built game on a local/CI instance *after* image upload.

**Live visual acceptance:** confirm each game displays a matching backdrop, no duplicated moving marbles or unreadable HUD, framerate stable, graceful fallback when the asset is absent, and no effects when reduced-motion is requested.
