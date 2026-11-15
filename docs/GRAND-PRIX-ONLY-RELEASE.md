# The Marble Rush Grand Prix-only release

**Decision:** From 15 November 2026, Marble Rush is a single game: the original Grand Prix racing format and phones-as-controllers (initially seven tracks, expanded to ten on 15 November 2026).

## Product scope

Published: Grand Prix, the seven untouched original tracks (Toybox, Candy, Ice, Space, Jungle, Seaside, Clockwork) plus Jetty Dash (short), Canopy Expedition (long) and Gearshift Gauntlet (expert). QR room joining, phone tap-to-boost and hold-to-grip, keyboard and CPU racing, selectable cup length including the non-repeating ten-track Full Tour, voting, results, settings and Back to Lobby.

Unpublished: Party Night, Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf. Do not show the five experimental games as menu items, adverts, public cards or phone action controls.

## Reversible implementation

The extra modes are retired **from the public navigation and action paths**, not destructively deleted. The experimental code and approved original art remain in Git history and source archives. This avoids reverting useful fullscreen, TV-navigation or Grand Prix improvements when rolling back earlier experiments.

The production host uses a restrictive source gate in `src/tv.js`: only `grandprix` is published. The hidden picker is never displayed on a public host, and the phone receives an empty `availableModes` list. Public requests to switch mode or enable Party Night are rejected. Returning to the lobby resets to Grand Prix.

The explicit `?partyQa=1` flag on localhost / 127.0.0.1 exists exclusively for automated regression testing of archived modes. It is intentionally ineffective on Render or any public domain.

## Release acceptance

1. Public TV lobby has no alternative game picker or Party Night controls.
2. Host and other player phones have no game-selection buttons; controller contains only Grand Prix controls.
3. Two independent phones connect by four-letter room, vote, race, boost and grip. One CPU/keyboard racer remains possible.
4. All seven original tracks remain unchanged and selectable. The three new tracks appear in TV and phone voting, and Full Tour plays all ten without repeats. Original settings/results and Back to Lobby remain.
5. Attempts to change modes or select Party Night via public actions must have no effect.
6. Offline QA of archived modes can still run behind localhost opt-in, without making them publicly accessible.
7. No Grand Prix engine, track art, avatar/swirl or WebSocket protocol files are modified.

## Notes

This is a production rollback of scope, **not** a claim that the extra games are repaired. They are intentionally set aside. Do not redeploy or promote the archived modes without a new product decision and real-device acceptance.

## Ten-track expansion (15 November 2026)

The seven original course layouts and theme artwork remain intact. Added Jetty Dash (7,568 route units, sprint), Canopy Expedition (38,822 units, endurance) and Gearshift Gauntlet (24,356 units, technical). These are new layouts built from the supported track primitives and reuse the approved Seaside, Jungle and Clockwork art—no new mini-games or rendering dependencies. The ten-race Full Tour presents only unplayed tracks, tapering the final choices to two and then one. The shorter 1/2/4/7-race cups retain their voting behaviour.
