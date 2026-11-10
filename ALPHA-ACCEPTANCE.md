# MARBLE RUSH — Alpha acceptance register

Updated: 10 November 2026

## Release identity
- GitHub repository: https://github.com/connex222/MARBLE-RUSH
- Render URL: https://marble-rush.onrender.com
- Verified live Render commit: `8f310e705cc69781d02bf90e091420775f97629a` (dynamic race camera)
- Release classification: **Alpha release candidate — physical multiplayer acceptance pending**.
- This document records user-reported acceptance, not independent reproduction of physical-device tests.

## Acceptance evidence
| Test | Status | Evidence |
| --- | --- | --- |
| TV display and readable graphics | PASS | User-reported |
| All race tracks and power-ups | PASS | User-reported |
| Dynamic camera and respawning | PASS | User-reported |
| Results and winner screens | PASS | User-reported |
| Full game finishes without crashes | PASS | User-reported |
| Two to four actual phones join and control marbles | NOT TESTED | Required before final Alpha acceptance |

Previously completed browser automation included a simulated TV and two browser-based phone controllers; **that is not a substitute for real devices**.

## Final physical-device acceptance (outstanding)
1. Open the live URL on TV or PC; keep the same lobby active.
2. Join using the QR code on at least two different phones (preferably test four as well).
3. Give each player a distinct marble and test simultaneous boost/grip and item controls.
4. Complete a multiplayer race; check ranking, results, and transition to the next track.
5. Temporarily disconnect/reconnect one phone; verify that rejoin is handled safely.
6. Confirm the TV race remains stable, and no player can accidentally control a different marble.
7. Record devices, browsers, pass/fail and any issues.

## Release gate
Do **not** call this release *Alpha Complete* until real-phone multiplayer passes. If it fails, log a reproducible issue, fix on a new branch, run automated QA, and repeat acceptance.

## Repository housekeeping
- PR #33: approved full artwork integration, merged.
- PR #35: dynamic camera improvement, merged.
- PR #34: older overlapping artwork change, still open at the time of this register; review its diff against main before closing or merging. Do not blindly merge it.

## Change discipline
This document-only update must not alter game logic, art, sound, server configuration, or the live deployment.