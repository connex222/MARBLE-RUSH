# Marble Rush — v0.1

The TV is the track, phones are the buttons. Tap to boost, hold to grip.

## Try it right now (no internet, no server)

1. Open `public/tv.html` in Chrome on your laptop (double-click it).
2. Click **Open the track**.
3. Click **Add keyboard racer** (you race with **Space**; **X** uses an item) and **Add CPU racer** a few times.
4. Click **Start race**.

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

## Folder map

| Folder | What's in it |
|---|---|
| `src/` | The game source (engine, TV, phone) |
| `public/` | The built, ready-to-run pages (made by the build) |
| `server/` | The small relay server Render runs |
| `assets/raw/` | Where you drop ChatGPT images and sounds |
| `fonts/` | Fredoka and Nunito (free OFL fonts), baked into the pages |
| `tools/build.js` | Resizes art and bakes everything into single files |
