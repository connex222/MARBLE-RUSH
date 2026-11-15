# Bowl Brawl — Combat Overdrive

**Reason for this rebuild:** the previously deployed 3D arena was attractive but the underlying game still felt slow and strangely quiet with two players. Polishing a renderer cannot substitute for satisfying action.

## Grounded diagnosis

On prior `main` the engine spawned two marbles 380 units apart, began each at rest, supplied only 85 units/s² continuous thrust, and waited for deliberate RAM presses or timed shockwaves to create pace. In 12 seeded two-human matches with no inputs the five-round game averaged approximately **113 seconds**.

The original television sound code also ducked the entire music mix for 2.6 seconds whenever it showed a text announcer overlay, **even if no recorded voice existed for the requested line**. CPU-triggered RAMs were silent because the effect played only in the player-action handler rather than from engine events. Some TV controls still hardcoded the old 42-second clock, 28-energy RAM and obsolete shockwave timings.

## New deterministic gameplay

- Five rounds remain. Same 2–8-player multiplayer WebSocket architecture; Grand Prix and its seven tracks remain untouched.
- Two-player marbles spawn **290 units apart**, already moving inward at speed 145; 3–4 players start at 165 radius, larger groups at 190. No stationary cold open.
- Continuous thrust increases from 85 to **235 units/s²**, bounded by a deterministic speed limit. RAM impulse increases from 480 to **625**, cooldown shortens, cost becomes 24 energy, and energy regenerates faster.
- CPU decision interval shortens; CPU attacks are real engine actions under exactly the same energy/cooldown rules as humans.
- Survival ring closes earlier, 32-second upper round limit, four real shockwave bursts at 3, 8, 15 and 24 seconds, with a two-second telegraph. Speed does not remove the ANCHOR/RECOVER counterplay.
- **Fifth round Crossfire Finale:** two visible counter-rotating physical striker hammers orbit at exactly 80 units, using 40-unit visual radius plus the existing 22-unit marble collision radius. Their impacts, momentum and knockout consequences are computed authoritatively in Bowl Brawl. The 2D fallback depicts the same moving objects.
- Close-up 3D duel camera framing, quick event-driven camera recoil (disabled with Reduce Motion) and streaks behind real marble velocity, not arbitrary particle movement.

## Sound rebuilt with Creative Claw

- New 45-second original 152-BPM driving instrumental combat score.
- Original heavy arena hammer collision sound and final-duel stinger.
- Both human and CPU RAMs now emit audio from the engine's actual `ram` event; moving hazards emit real metal impacts, major collisions and knockouts cut through the score.
- Text-only announcer captions do **not** lower music volume when there is no playable voice recording; actual voice lines still duck the score appropriately.
- Keep effect cooldowns and user mute/volume settings so a noisy game does not become noisy hiss or a compressed wall of sound.

All three new Creative Claw assets are references in `tools/approved-audio-sources.json`; on build the audio is downloaded and served locally. The build must finish with **200 protected images and 12 sounds**.

## Mechanical benchmark (not a claim of subjective fun)

The first engine simulations before Crossfire/sound integration, over 28 seeds each:

| Players | Human idle old | Human idle Overdrive | 2 CPU old | 2 CPU Overdrive |
|---|---|---|---|---|
| 2 | 113 seconds (12 seeds) | 60.5 seconds | 41.2 seconds | 31.7 seconds |

Overdrive currently passes 2/4/8-player seeded completion and deterministic replay checks. New `npm run test:brawl-overdrive` confirms complete scoring, fifth-round Crossfire, physical contacts, real RAM and predictable round timing.

**Still required:** Full build, real GPU screenshot, genuine two-phone game, actual player feedback, sound playback at TV volume and physical-device 60fps. Do not claim AAA from AI-bot metrics alone. Never modify the original seven Grand Prix tracks or approved artwork.
