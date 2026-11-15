# MARBLE RUSH — Phase 9 physical-TV acceptance

This checklist tests the *deployed* Grand Prix and Bowl Brawl **The Crucible**. The previous GitHub Actions tests proved real Chromium rendering and WebSocket commands, not real living-room hardware performance.

## Quick test — real TV and two phones

1. On the television browser, open **https://marble-rush.onrender.com/tv?qa=1**. The small QA card appears at bottom-right *only* with this URL. It records no names or room identifiers.
2. Click the normal start/boot control, create a room, scan the QR code on two actual phones, and join from each. Test both portrait and landscape where supported.
3. Select **Bowl Brawl** from the normal game picker. It should launch the native GPU Crucible bowl automatically (no `brawl3d=1` flag). Note the GPU class, actual internal render dimensions and 3D fallback status displayed on the QA card.
4. Play the full **five rounds**. Exercise **RAM**, **ANCHOR**, **RECOVER**, edge saves, the moving rotor and final two-player duel. Confirm physical hazards are where the TV shows them and results/next rounds advance.
5. Press **Back to Lobby**. Confirm the original Grand Prix stage returns, with **all seven tracks**, no stale Bowl Brawl banner, no overlapping buttons and no second canvas. Then finish a Grand Prix race.
6. On the TV click **SAVE QA REPORT (.JSON)** while the same browser remains open. Share that JSON and, ideally, a TV photo or short video. The report now records the actual WebGL GPU label and internal output dimensions and retains the last Bowl Brawl snapshot after leaving it.

## Additional scenarios

- **4K display:** Repeat the test at native 3840×2160. Check whether the upscaled WebGL presentation remains legible, whether the lobby and Back to Lobby buttons overlap and whether the game fills the screen correctly.
- **Low-end device:** Open `/tv?qa=1&brawl2d=1` to inspect the **forced 2D diagnostic mode** and compare its controls/results with the 3D version. This must *not* change default behaviour for normal players.
- **Refresh/rejoin:** Reconnect one phone during a live round, keeping the other connected. No ghost players, duplicate room entries or stuck controls.
- **Audio:** Try quiet lobby music, voice ducking in Brawl, impact and shockwave cues, complete mute/unmute, and return to lobby. Listen for distortion and hiss.
- **Long session:** Run 15–20 minutes, covering a full match and replay. Check that GPU context loss and render failures do not leave a black TV.

## Interpreting the saved report

`brawl3d` is a last-known real renderer snapshot, containing `gpuLabel`, `gpuCategory`, `internalResolution`, `qualityScale`, `p95FrameMs`, `observedFpsProxy`, `fallbackReason` and `exclusiveStage`. The reporter never automatically marks `hardwareApproved` true. If it says `gpuCategory: software`, its frame rate cannot certify native hardware performance.

A p95 frame interval near or below 16.7ms may indicate roughly 60fps animation on a 60Hz display. Intervals much above 33ms indicate noticeable frame drops; these browser figures remain proxies, not external high-speed camera measurements. For release-level acceptance, assess performance **while playing** with real phones and check a real TV recording, rather than treating numbers from GitHub Actions as a pass.

The report may contain device and GPU technical data, but not room codes, names or phone identifiers.

## Protected scope

This phase adds opt-in technical diagnostics and documentation. It **does not alter Grand Prix**, the seven original tracks, game scoring, Bowl Brawl physics, appearance or music. Do not change the normal game build or require QA mode for play.
