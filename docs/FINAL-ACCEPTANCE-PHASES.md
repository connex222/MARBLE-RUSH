# MARBLE RUSH — Final Alpha Release-Candidate Phase Gates

Branch: \`improvement/marble-rush-real-rebuild\`  
Release decision: **DO NOT MERGE OR DEPLOY** until the owner approves the actual TV/phones and final visual style.  
Source baseline: \`dev/party-pack-ui-v2-rebuild\`; original Grand Prix baseline: \`main\`.

## Status matrix

| Phase | Scope | Engineering state | Approval state |
|---|---|---|---|
| 0 | Read-only baseline and truthful five-game inventory | COMPLETE | Source verified |
| 1 | Remove competing canvases, routes, fallback game UIs | COMPLETE | Automated strict single-host tests pass |
| 2 | Derby race, fair betting, actual results and elastic camera | COMPLETE | Physical TV acceptance outstanding |
| 3 | Drop Zone live launch, real pegs/collisions and prize prediction | COMPLETE | Physical TV/phone acceptance outstanding |
| 4 | Bowl Brawl timed pulses, one-use rescue, actual knockout bonuses | COMPLETE | Human fun/jeopardy testing outstanding |
| 5 | Curling real stone motion, sweep, button measurement | COMPLETE | Human TV legibility outstanding |
| 6 | Golf physical obstacles, five/nine-hole strokes, shot and cup | COMPLETE | Human TV legibility outstanding |
| 7 | Unified visuals and perf: five independent renderers, single canvas, approved background cache | COMPLETE | True 3D mesh art **not** delivered; aesthetic sign-off blocked |
| 8 | Automated regression: six games, resets, phone-to-TV sessions, reproducible stress tests, asset integrity | COMPLETE after green latest Actions | Hardware testing outstanding |
| 9 | Release candidate and physical-acceptance tooling | COMPLETE after green latest Actions | Owner approval outstanding |
| 10 | Production merge + Render deployment | **NOT AUTHORISED** | Do not perform |

**Important distinctions:** Finished *software phases* are not the same as AAA visual approval or physical-device testing. The current scenes are 2.5D Canvas2D with approved pre-rendered 3D-looking raster art and physically correct locations. They are not true realtime 3D models. Screenshots and headless Playwright cannot establish the artistic quality or actual 60 Hz TV output.

## Your independent test package

On Windows, use \`tools/OPEN-REAL-REBUILD-PREVIEW.bat\` on the improvement branch. It clones a separate folder, installs dependencies using \`npm install\` (**not \`npm ci\`**), runs mandatory unit checks, builds and opens the preview TV. This does not modify GitHub \`main\` or Render.

The updated launcher opens:

- TV with local QA: \`http://localhost:36002/tv?qa=1\`
- Normal uncluttered TV: \`http://localhost:36002/tv\`
- Phones: scan the QR or use the TV machine's private LAN IP and the room code. Connect to the *same Wi-Fi*.
- Close the separate server window to stop the preview.

The local QA panel shows the active renderer, frame intervals and missed-frame share. Select **SAVE QA REPORT (.JSON)** after testing each game. The downloaded \`MARBLE-RUSH-PHYSICAL-TV-QA.json\` records **only local display timing, no player names or network data**; it does not upload to a server. Its default form fields remain null because it cannot observe physical devices or give itself a PASS.

## Physical acceptance procedure — no fabricated results

1. **Display:** connect the actual Windows TV computer to the actual TV. Test at 1920×1080 and, if supported, 3840×2160. All five games must show readable scores, countdowns, hazards, winner/loser outcomes and the correct single stage. Also test Grand Prix with its own canvas.
2. **Join:** scan the real QR code with two different physical phones on the same local Wi-Fi. Confirm unique names/avatars, both active in the lobby, host/guest permissions and room code.
3. **Five games:** finish Derby's five heats, Drop Zone's five rounds, Brawl's five rounds, Curling's five ends and Golf's five-hole Party Night plus nine-hole championship. Record each pass/fail. On Brawl, confirm shockwaves threaten actual marbles, ANCHOR mitigates danger, RAM knockouts award only verified bonuses and one rescue per round can save a marble.
4. **Controls:** perform ten or more repeated inputs per relevant action. Confirm button activation, immediate phone feedback, TV state and final physical outcome. Avoid measuring from a screenshot or Playwright alone; a slow-motion phone recording of tap to TV-visible outcome is preferable if exact end-to-end latency is required.
5. **Reset and mixed sessions:** with two phones, switch five modes without losing connection. Leave and rejoin one physical phone mid-lobby, then mid-game; restart the TV tab and confirm rejoin/host policy. If recovery isn't supported for an in-progress match, record the limitation, rather than invent it.
6. **Long run:** play at least 20 minutes with audio, QR, controller and graphics active. Watch for double narrator lines, missing sounds, accumulated slow frames, unresponsive controls, incorrect points, lingering panels and console errors.
7. **Motion tolerance:** verify Derby automatically zooms out for the slowest marble and eases back in as the pack closes. Repeat with reduced motion enabled. In Bowl Brawl ensure the entire rim remains visible during camera moves.
8. **Report:** export QA JSON, note Windows GPU/CPU, display refresh rate and resolution, phone models, Wi-Fi conditions, number of connected devices, your gameplay feedback and whether the art actually feels premium.

### Minimum release target (not a pass claim)

- Aim for sustained **60 FPS at 1080p on the target TV computer**, without distracting jank. If consistently below 45 FPS, **performance is a release blocker**; 45–59 FPS requires explicit discussion of target hardware and user approval. Headless CI numbers are diagnostic only.
- Target **under 150 ms median** physical input-to-visible-change and investigate any repeated outliers over 250 ms. The opt-in TV recorder reports **handler receipt→next animation callback**, which is a different, smaller quantity and **must not be presented as phone-to-pixel latency**.
- **Zero** duplicate visible game canvases, incorrect mode routes, broken Grand Prix, missing approved assets, stuck games, score mismatches, or unhandled errors.
- A 60 FPS proxy cannot certify actual monitor scan-out, Wi-Fi quality, user input or visual acceptance.

## Tests/artefacts that MUST be green before requesting merge

- \`tools/test-party-scene-cache.js\`: a single detached (non-DOM) approved scenery buffer, correct invalidation, no second animation loop.
- \`tools/test-tv-qa.js\` and \`tools/tv-qa-browser-smoke.js\`: QA opt-in isolation, local JSON report, no false hardware claims.
- \`tools/test-party-ui-v2.js\` and \`tools/test-phase8-integration.js\`: correct mode mapping, no legacy canvases.
- \`tools/test-brawl.js\`, \`tools/test-brawl-balance.js\`: deterministic real shockwaves, rescues, KO points, 120 seeded CPU playthroughs and comeback rates.
- \`tools/party-ui-v2-browser-smoke.js\`: five exact new stages, five complete playthroughs, Finale, reset matrix, GP and Derby camera.
- \`tools/party-ui-v2-multiplayer-smoke.js\`: real two-phone WebSocket controls for all five Party Pack games.
- \`tools/test-grandprix-regression.js\`: original engine identical to \`main\`.
- Asset integrity: all **200 approved source files remain byte-for-byte unchanged** against the active baseline \`dev/party-pack-ui-v2-rebuild\`.
- Review package: five side-by-side screenshots, phone controls, frame and input reports, compiled preview. No artifact is a substitute for a physical test.

## Stop conditions

If any CI test fails, mark the release **BLOCKED**, fix it on this branch and repeat the complete run. Do not skip browser checks, modify the physics to appease an artwork test, or silently turn off a renderer. If art is judged insufficient, create an additional, separately approved art production phase rather than calling the existing 2.5D scene true 3D.

**Final decision remains:** software-ready for *manual candidate evaluation*; not authorised for merging, production deployment or AAA marketing claims.
