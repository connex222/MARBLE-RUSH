# MARBLE RUSH — Physical TV QA evidence review (12 November 2026)

**Release status: BLOCKED — physical multiplayer, Golf, full-game and AAA aesthetic acceptance outstanding.**

## Provenance

Owner-supplied file `MARBLE-RUSH-PHYSICAL-TV-QA (1)(1).json`, `tv-qa-v1`, collected `2026-11-12T08:29:53.891Z`. The collector describes its environment as "Real TV computer when run locally; CI browser only if executed there"; the JSON does **not** identify which was used. Viewport `1536 × 706`, device pixel ratio `1.25`. Neither 1920×1080 nor 3840×2160 physical TV verification is evidenced.

## Measured requestAnimationFrame cadence (not physical display scan-out)

| Mode | Samples | Reported FPS proxy | p95 frame interval | Frames >33 ms | Frames >50 ms |
|---|---:|---:|---:|---:|---:|
| Bowl Brawl | 1,233 | 60.24 | 16.8 ms | 4 | 2 |
| Curling | 786 | 60.24 | 16.8 ms | 3 | 2 |
| Drop Zone | 632 | 59.88 | 16.8 ms | 2 | 1 |
| Derby | 780 | 60.24 | 16.8 ms | 2 | 2 |
| Grand Prix | 1,800 | 60.24 | 17.0 ms | 0 | 0 |
| **Marble Golf** | **not included** | **unmeasured** | — | — | — |

All five *measured* modes have usable near-60 Hz requestAnimationFrame cadence. The report's `frameShareOver33ms` rounds to zero despite recording isolated >33 ms frames; use the raw slow-frame counts above instead of assuming precisely zero slow frames.

Handler-to-next-frame samples: Brawl lobby 2.1 ms; Curling lobby 3.2 ms; Drop Zone lobby 1.7 ms; Derby lobby 0.4 ms. These samples are *not* measured physical phone tap-to-TV-pixel latency. `rendererIsolationPassed` is `null`, not `true`.

## Outstanding manual fields (all null in source report)

- `tv1080p`, `tv4k`, `physicalPhonesConnected`, `wifiRejoin`
- `touchLatency`, `motionComfort`, `allFiveGamesComplete`
- `grandPrixComplete`, `visualAccepted`

The JSON does not certify physical device testing, Wi-Fi, controls, score integrity, full gameplay, final aesthetics, or actual monitor refresh. It also cannot prove a scene actually changed or identify a dropped network packet.

## Next acceptance sequence

1. Re-run the opt-in TV QA capture with **Golf**, plus all other games, at **1920×1080** on the intended TV computer; verify real 4K separately only if supported.
2. Connect **2–4 physical phones** on local Wi-Fi. Test join/host, ten repeated control inputs, cross-mode switching, reload/rejoin, one mid-game disconnect, and TV tab restart.
3. Complete the five-game Party Pack (Derby five heats; Drop Zone five rounds; Brawl five rounds; Curling five ends; Golf five-hole game and nine-hole championship) and a Grand Prix race. Record correctness, console errors and audio.
4. Test a **20-minute** continuous session, real motion tolerance, Derby straggler zoom and reduced-motion mode. If latency is quantified, use genuine end-to-end video measurement rather than the handler proxy.
5. Explicitly approve/reject actual appearance at TV viewing distance. **Current rebuild is 2.5D Canvas2D rather than native realtime 3D; near-60 FPS is not AAA art acceptance.**

**Release gate:** Keep PR #52 draft, do not merge into `main`, do not deploy Render until the missing independent checks pass and owner approves the actual visuals.
