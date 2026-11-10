# Marble Rush — v0.5.0 Party Pack development

The TV is the track, phones are the buttons. Tap to boost, hold to grip.

**This development branch is not the live release.** Grand Prix v0.4 gameplay remains intact.
The Party Pack framework now shows six games, but the five new games are
preview-only and are **not playable** until their dedicated implementation phases.

### Party Night preview (development branch only)
In the TV lobby choose 3, 5 or 7 games under **PARTY NIGHT**, add racers and
start. The available mode (Grand Prix) repeats until the other five modes
are implemented. After each Grand Prix cup, select **Next Party Game**;
Party Points 10/8/6/5/4/3/2/1 carry forward across cups.
The host can also choose Party Night length on their phone.
Hover or activate a locked game card to watch a 15-second code-drawn
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
npm run balance -- grandprix 1
```

GitHub Actions additionally compares Grand Prix physics against main over
all seven tracks and tests a simulated TV plus two phones in Chromium.
The physical 2–4 phone acceptance test remains outstanding.

Party Pack shared systems: `src/modes/registry.js`, `session.js`,
`bots.js`, `attract.js`, `geometry.js`, and the six individual mode files.
Future mode files remain disabled until each game passes its own acceptance.
