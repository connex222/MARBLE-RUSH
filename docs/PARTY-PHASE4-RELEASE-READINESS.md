# MARBLE RUSH — Phase 4 Final Visual Acceptance & Release Preparation

**Release candidate:** Party Pack AAA (Phase 2+3), development branch `dev/party-pack-aaa`  
**Pull request:** [Draft PR #49](https://github.com/connex222/MARBLE-RUSH/pull/49)  
**Production:** Do **not** merge or deploy without explicit approval. The current Render service on `main` remains untouched.

## What Phase 4 delivers

- Consolidated Phase 3 art integration: 5 new environments, 5 materials, 10 props, 48 cinematic FX assets (68 total) plus original approved art.
- A fixed build-time release gate: exactly 200 finished images, five approved audio tracks, all premium visuals and TV/host-phone controls present.
- Five game-mode-specific champion podium screens; reduced-motion entry visuals; old Grand Prix presentation remains independent.
- CI simulation checks: deterministic gameplay, 30 seeded CPU games per mode, TV Chromium rendering, simulated TV plus two phone controllers.
- Release handover, acceptance checklist, safe merge plan, rollback plan, and outstanding real-device conditions.

## Automated verification — release gate

From `dev/party-pack-aaa`:

```sh
npm ci
npm run build
node tools/test-phase4-release.js
node tools/test-party-presentation.js
node tools/test-party-fx.js
node tools/art-browser-smoke.js
```

The browser smoke runs against a local server and requires Playwright. For a complete official run, check the GitHub Actions tab on draft PR #49: **Party Pack foundation QA**, **Phase 8 Party Pack integration QA**, **Approved art integration QA**. All must be green for the exact latest head SHA; a green run on an older SHA is not sufficient.

The 200-image expectation is 132 original + 68 Phase 3 approved. Of the 68 additions: 5 backgrounds, 15 materials/props and 48 effects.

## Real-TV acceptance — must be completed by a person

Test with a 1920×1080 TV at normal sofa distance (around three metres) and physical phones. Each step is **PASS / FAIL**, not assumed to pass because a headless browser passed.

1. Open the **compiled preview** from the latest successful GitHub Actions artifact, or run the development branch locally on a PC connected to the TV. **Do not use production Render** to review this unmerged branch.
2. Verify all five games visually resemble the original Grand Prix's premium art language: recognisable toy-diorama environments, readable active marbles, correct materials, props that do not obscure collisions, HUD legible from three metres, smooth movement and unobstructed Back to Lobby.
3. For **Derby**, verify all horses/marbles remain visible on each course, active form/odds and photo-finish moments make sense, and the podium correctly displays winner names.
4. For **Drop Zone**, verify multiplier pegs/jackpot and buckets remain readable, impact FX are at collision points, no flashes overwhelm the ball path.
5. For **Bowl Brawl**, verify all hazards remain visible, hits and KOs match on-screen events, the arena edge is unambiguous.
6. For **Curling**, verify sweep/curl guidance, ice/marble contrast, the house, measurement and last-stone results.
7. For **Golf**, verify every hole surface, bridge/windmill/tunnel/obstacle, putting direction, flags, water and final scores.
8. Verify **Back to Lobby** on every game, both on TV and host phone, without covering standings/scoreboard. Exit to lobby, start again, confirm other phones return cleanly.
9. Turn music/SFX off and on; enter games while the narrator is talking. Narration must stop on transition, no post-voice hiss, no overlapping commentary. Confirm all games have appropriate impact/winner SFX and overall volume is reasonable.
10. Enable reduced motion. No distracting shake, strobe or forced slow-motion; winner podium and state changes still complete.
11. Test 2, 3 and 4 **physical phones** joining by QR, playing a complete Party Night, rejoining after refresh, recording scores, progressing games and showing final champion. Check one phone is not silently disconnected while other players continue.
12. Verify a complete multi-game session ends without crash, missing assets or unusable buttons on TV, tablet and PC sizes.

**A failure in item 2, 8, 9 or 11 blocks production approval** regardless of passing CI.

## Visual quality caveat

The approved graphics are rendered 2D sprites and 2D canvas with lighting, depth cues, parallax and cinematic effects. They are **not** true 3D geometry, real-time ray tracing or a new GPU renderer. Only the human user may decide whether their final presentation satisfies the requested AAA comparison. Do not label the live product "visually accepted" until this check has passed.

## Release plan — only after explicit approval

1. Verify branch protection and the exact commit shown on draft PR #49; resolve any new conflicts with `main`, rerun all three CI checks on the merge candidate.
2. Keep Grand Prix's seven tracks, camera, simulation and original approved assets unchanged.
3. On explicit release approval, mark draft PR #49 ready, then squash merge only after confirming its complete diff, asset totals, and test status. Render auto-deploys new `main` commits.
4. Verify Render deployment is **live**, `/health` responds, static assets/manifest contain 200 images + five audio sources, and a TV with two phones can start a game and return to lobby.
5. Verify actual physical-device acceptance and compare Grand Prix before announcing an Alpha release.

## Rollback

If the deployed release fails, immediately restore the **previous production commit** using a safe revert of the merge commit or a documented Render rollback after checking its compatibility with server state. Never force-push `main`. Leave the branch intact for a fix-forward PR.

## Remaining release blockers

- **Physical TV visual acceptance not performed** by CI.
- **Real 2–4-phone multiplayer not performed** by CI.
- **Audio speaker/listening check not performed** by CI.
- Previously observed high-severity npm audit advisory must be reviewed and resolved or documented before broader launch.

**Phase 4 preparation can be complete while the release remains blocked. Do not merge or deploy as a side effect of this document.**
