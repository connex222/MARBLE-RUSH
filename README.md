# MARBLE RUSH — Party Pack (Alpha)

The TV is the track, phones are the buttons. Tap to boost, hold to grip.

Grand Prix v0.4 gameplay and approved base artwork remain intact. The Party Pack adds five more games and shared Party Night scoring.
The Party Pack contains six games, all now merged into `main`: Grand Prix, Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf. The premium Phase 2–4 production assets and code are integrated. Physical TV visual/audio acceptance and real-device multiplayer QA are still pending.

### Party Night (production)
In the TV lobby choose 3, 5 or 7 games under **PARTY NIGHT**, add racers and
start. The eligible modes rotate across the selected Party Night length. Bowl Brawl and Curling require two or more players. After each Grand Prix cup, select **Next Party Game**;
Party Points 10/8/6/5/4/3/2/1 carry forward across cups.
The host can also choose Party Night length on their phone.
Hover or focus a game card to see its 15-second concept preview. All six registered modes are available in this release.


## Try it right now (no internet, no server)

1. Open `public/tv.html` in Chrome on your laptop (double-click it).
2. Click **Open the track**.
3. Click **Add keyboard racer** (you race with **Space**; **X** uses an item) and **Add CPU racer** a few times.
4. Click **Start the Cup**, then click a track card to vote (or **Decide now**).

Phones don't work in this mode — that needs the server below.

## Put it online on Render (so phones can join)

You've done this before for your other TV games. Same steps:

1. Create a new GitHub repo called `marble-rush` and upload **everything in this folder** (keep the folder structure).
2. In Render: **New → Web Service** → pick the `marble-rush` repo.
3. Fill in:
   - **Region:** Frankfurt (closest to the UK — matters for button lag)
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Plan:** Free
4. Click **Create Web Service**. Wait for "Live".
5. Open the Render address on the TV/laptop. Phones go to the same address with `/play` on the end and type the code.

The free plan sleeps when unused. The TV shows "Polishing the marbles…" for up to a minute while it wakes up — that's normal.

## Adding ChatGPT art and sound

1. Save each image as PNG with the **exact filename** from `MARBLE_RUSH_MASTER.md` Section 9 into `assets/raw/`.
2. Save sounds (MP3 is easiest) with the exact filename from Section 11 into `assets/raw/audio/`.
3. Upload them to GitHub. Render rebuilds automatically and the art appears in the game.

Anything you haven't made yet stays code-drawn, so the game always works.

## What's new in v0.4

- **Skill pays now.** Faster marbles can overtake, holding grip never stops you dead, and tapping with a full meter gives a **SUPER boost**. A marble nobody touches now finishes near the back instead of winning.
- **Chunky track.** Rails are thick textured beams on scaffolding, and the camera sits closer so marbles are readable from the sofa.
- **Smarter CPU racers** that read the track (grip before kickers, boost into loops and shortcuts).

## Balance check (optional)

`npm run balance` races every track with test racers (do-nothing, button-masher, CPU levels and an "expert" that looks ahead) and prints who wins. Use it after changing any physics number in `src/engine.js`.

## Folder map

| Folder | What's in it |
|---|---|
| `src/` | The game source (engine, TV, phone) |
| `public/` | The built, ready-to-run pages (made by the build) |
| `server/` | The small relay server Render runs |
| `assets/raw/` | Where you drop ChatGPT images and sounds |
| `fonts/` | Fredoka and Nunito (free OFL fonts), baked into the pages |
| `tools/build.js` | Resizes art and bakes everything into single files |
| `tools/balance-lab.js` | Screen-free race tester (`npm run balance`) |

## Phase 2 developer checks (development branch)

```
npm install
npm run build
npm run test:party
npm run test:dropzone
npm run test:brawl
npm run test:derby
npm run test:curling
npm run balance -- grandprix 1
```

GitHub Actions additionally compares Grand Prix physics against main over
all seven tracks and tests a simulated TV plus two phones in Chromium.
The physical 2–4 phone acceptance test remains outstanding.

Party Pack shared systems: `src/modes/registry.js`, `session.js`,
`bots.js`, `attract.js`, `geometry.js`, and the six individual mode files.
Future mode files remain disabled until each game passes its own acceptance.

## Drop Zone — Phase 3

Drop Zone is a five-round pegboard contest for 1–8 racers: aim using **LEFT**
or **RIGHT** on the phone, then press **DROP** (or the big phone pad).
One marble falls through 85 pegs and moving obstacles into an eight-bucket
scoring tray (50/100/200/500/1000/500/200/100). The highest cumulative
score wins. CPU players take automatic turns, and Drop Zone can appear in
Party Night. The TV also has local Left/Drop/Right controls.

Development acceptance details: [Phase 3](docs/PARTY-PHASE3-DROPZONE.md).

## Bowl Brawl — Phase 4

A **five-round**, simultaneous marble arena for **2–8 players**. Steer your
marble with **TURN LEFT** and **TURN RIGHT**, launch a charged **RAM** into
opponents or **ANCHOR** yourself to resist knockback. RAM uses 28 energy and
ANCHOR uses 15; energy regenerates automatically. As the round progresses,
the safe circle shrinks. The last marble standing earns the most points.
Results are scored 10/8/6/5/4/3/2/1 each round; the highest combined
five-round total is the winner. CPU racers compete automatically.

The mode can also feature inside **Party Night**, awarding the standard
Party Points based on the final Bowl Brawl standings. The separate
[Phase 4 acceptance record](docs/PARTY-PHASE4-BRAWL.md) details the tests
and limitations. Visuals are functional code-drawn art pending AAA polish.

## Marble Derby — Phase 5

A **five-heat**, six-runner marble racing game for **1–8 players**.
Each participant receives **600 entirely virtual gems** to back
one runner per heat at odds shown on the TV and their phone. Choose
25/50/100/200 virtual gems, select a runner and watch the race. Winning
bets return stake × locked odds, while losing stakes are spent.
Players can CHEER once per heat for a small temporary burst of speed.
After five heats, the highest gem balance is champion.
There is no real money, payout or purchasable currency. An automatic
virtual stipend prevents players from being eliminated for running out
of gems. CPU runners and disconnected players are handled automatically.

The game is available in Party Night and uses the usual final ranking
Party Points. [Phase 5 QA and rules](docs/PARTY-PHASE5-DERBY.md).
The track is functional code-rendered artwork pending later visual polish.

## Marble Curling — Phase 6

Curling is a **five-end** ice-rink contest for **2–8 players**.
Each racer throws **two stones per end**. Aim left/right, choose power,
THROW and SWEEP during the slide to preserve momentum.
Stones collide and can knock rivals away from the scoring house.
Closest stones earn the most points; stones near the central button
earn a small bonus. The highest total after five ends wins.
CPU racers take their turns automatically and Curling can appear
within a 3/5/7-game Party Night.

See [Phase 6 rules and QA](docs/PARTY-PHASE6-CURLING.md).
The Phase 3 premium diorama presentation has since been integrated; the original Grand Prix visuals and physics are preserved.

## Phase 8 — integration and release gates

Marble Golf is now connected to the TV/phone UI, with gamepad and on-screen aim, power and SHOOT controls, per-player HUD, five-hole results and Party Night scoring. CI checks the integration and all earlier modes. See [Phase 8 integration record](docs/PARTY-PHASE8.md) for the **remaining AAA assets/audio and physical-device acceptance blockers**. The code is prepared for Alpha release. The approved card art was uploaded, and the Phase 3 environment, surface, prop and cinematic-effect art is included in the production build.

## Consolidated Alpha release notes (10 November 2026)

Six modes: Grand Prix, Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf. Party Night: 3/5/7 games, 1–8 players where mode minimums allow, phones and local CPU/keyboard controllers. The approved original graphics and avatars remain unchanged. The 13 approved Party Pack cards and banners are included in `assets/raw`. Audio is generated with Creative Claw only and recorded in `tools/approved-audio-sources.json`; the build bundles it when available with a playable procedural fallback when the audio provider cannot be reached. See `docs/PARTY-PHASE8.md` for the acceptance plan and outstanding physical multiplayer test. Never claim new graphics are live until the production manifest lists them.


## Consolidated premium Party Pack release (11 November 2026)

Merged via [PR #49](https://github.com/connex222/MARBLE-RUSH/pull/49) to `main`.

- **Grand Prix protected:** its seven tracks, existing art, camera and deterministic physics were not redesigned.
- **Five premium modes:** Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf include Phase 2 gameplay enhancements, existing Party Night scoring and phone controller improvements.
- **Phase 3 graphics:** 5 approved game backgrounds, 5 materials, 10 props and 48 cinematic effect sprites (68 additions, 200 images in the full build), all generated with ChatGPT rather than Creative Claw. Art falls back to canvas-rendered effects when a new asset is unavailable.
- **Results and presentation:** five themed winner podiums, reduced-motion stage transitions and winner/score text drawn in code.
- **Audio:** approved Creative Claw tracks are audio-only. Existing narrator and rolling-noise gating fixes retained.
- **QA:** GitHub Party Pack foundation, Phase 8 integration and approved-art browser / two-phone simulated multiplayer suites all passed on the release candidate. This is *not* a claim of real TV or physical 2–4-phone acceptance.
- **Release documents:** [Phase 3 acceptance](docs/PARTY-PHASE3-FINAL-ACCEPTANCE.md) and [Phase 4 readiness and rollback](docs/PARTY-PHASE4-RELEASE-READINESS.md).
- **Hosting:** production <https://marble-rush.onrender.com>, deployed from `main` by Render automatic deployment.
- **Remaining checks:** real TV premium-quality review, physical phone multiplayer, narration/hiss listening and dependency vulnerability review before wider distribution.
