# MARBLE RUSH — Phase 3 final production acceptance

**Development branch:** `dev/party-pack-aaa`  
**Status:** development implementation complete; TV/player visual acceptance remains required.  
**Production:** no merge to main and no Render deployment.

## Batch coverage

- **A — Environments:** five ChatGPT-generated approved 1920×1080 mode backgrounds. In-game fallback to previous card art if a file is missing.
- **B — Materials and props:** five terrain materials and ten miniature-diorama props, optional renderer and fallback.
- **C — Cinematic effects:** 48 transparent effects (8 each for five modes plus 8 shared), mapped onto seeded simulation event streams. VFX expire; renderer never changes a race result and supports reduced motion.
- **D — Finale screens:** five themed champion environments reusing approved backgrounds. TV displays a three-place podium, glass marble presentation, names and points drawn in code. Existing awards, Party Night scoring and flow are unchanged. Text is not baked into any artwork.
- **E — Final integration:** gentle mode-entry reveal, final podium browser smoke test, QA across existing Party Pack and Grand Prix, asset audit. No changes to the original seven Grand Prix tracks, camera or protected artwork.

**Graphics producer:** ChatGPT only. Creative Claw was not used for any image.

## Automated acceptance

- Existing deterministic Party Pack and full CPU simulation suites must pass.
- A full build must produce **200 images**: baseline 132 + Batch A 5 + Batch B 15 + Batch C 48.
- Chromium must load the game and show a readable Curling finale podium (heading, visible winner, name), without interrupting the next-game/lobby actions.
- Browser TV/phone simulated WebSocket acceptance must pass; this does not substitute for physical device tests.
- Grand Prix regression compares the 7 tracks against the current main engine, untouched.
- Missing optional Phase 3 art must not stop gameplay.
- Sound and voice-over changes belong to separate audio QA, not graphic generation.

## Release gate

**Do not merge or deploy** until the user has seen the real game on a TV, verified that all five new modes are genuinely premium relative to Grand Prix, and checked 2–4 physical phone controllers, live result screens, animation and audio. PR #49 is a draft for review and CI only.

Draft PR: https://github.com/connex222/MARBLE-RUSH/pull/49
