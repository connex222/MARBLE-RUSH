# Marble Rush — v0.7.0 Party Pack development

The TV is the track, phones are the buttons. Tap to boost, hold to grip.

**This development branch is not the live release.** Grand Prix v0.4 gameplay remains intact.
The Party Pack framework shows six games. **Grand Prix, Drop Zone and Bowl Brawl are playable.**
The other three games remain preview-only until their dedicated phases.

### Party Night preview (development branch only)
In the TV lobby choose 3, 5 or 7 games under **PARTY NIGHT**, add racers and
start. The available modes (Grand Prix, Drop Zone and Bowl Brawl when at least two
players are present) repeat until the remaining three modes are implemented. After each Grand Prix cup, select **Next Party Game**;
Party Points 10/8/6/5/4/3/2/1 carry forward across cups.
The host can also choose Party Night length on their phone.
Hover or activate an unfinished game card to watch a 15-second code-drawn
CPU concept preview; it cannot start an unfinished game.


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
