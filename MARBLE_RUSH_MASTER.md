# MARBLE RUSH — Master Game & Graphics Bible
**Version 1.0 · 8 Nov 2026 · Owner: Shaun Ellison**

> One document, two builders.
> **Claude** builds the code, physics, mechanics, tracks and server.
> **ChatGPT (with Creative Claw)** builds the images, sound, music and voice.
> Both follow this file exactly. If something isn't in here, ask Shaun — don't invent it.

---

## 0. How to use this document (start here)

**Shaun's workflow, step by step:**

1. Open a **new ChatGPT chat**. Paste the whole of **Section 8.1 (Style Bible)** first. This locks the look.
2. Ask for **one asset at a time**, pasting its prompt from **Section 9 (Image Asset List)**.
3. When you like an image, **download the PNG** and rename it to the **exact filename** shown (e.g. `clatter_reference.png`). Lower-case, underscores, no spaces.
4. Drop it into `assets/raw/`. Don't resize or edit it — the build script does that.
5. Do the same for sounds using **Section 11 (Sound List)**, saving into `assets/raw/audio/`.
6. Tell Claude "assets updated". Claude runs the build, which resizes, compresses and slots everything in.

**The golden rule:** the game always runs, even with **zero** art. Missing images show coloured placeholders and the tracks are drawn in code, so you can race from day one.

---

## 1. The game in one paragraph

**Marble Rush** is a family marble-racing party game. Each player's glass marble races down a giant, twisting marble run on the TV — loops, jumps, whirlpools, seesaws, bumpers. Your phone is a single big button: **tap to BOOST, hold to GRIP**. Go too fast over a bump and you fly off the track (and pop back at the last checkpoint). Go too slow and you'll get overtaken. Marbles clack into each other, grab power-ups, and fight for the finish. Close finishes get a slow-motion **photo finish** replay.

| | |
|---|---|
| **Players** | 2–8 racers (spectators can watch) |
| **Ages** | 5 to 95 |
| **Race length** | 60–90 seconds |
| **Cup length** | 4 races (~10 minutes including results) |
| **Learn time** | Under 15 seconds — the lobby *is* the tutorial |
| **Devices** | 1 TV/laptop (the "track") + 1 phone each (the "button") |
| **Hosting** | Node + WebSocket relay on Shaun's Render account (**Frankfurt region** — closest to the UK) |

**Design pillars (everything must serve these):**

1. **One button, real skill.** Timing your boosts and grips matters, but mashing still gets you round.
2. **Nobody is ever out.** Flying off costs a couple of seconds, never the race.
3. **The pack stays together.** Gentle catch-up so every race is close at the end.
4. **Physics is the comedy.** Bumps, near-misses and wild jumps should make the room shout.

---

## 2. Roles and the handshake

| Area | Owner | Notes |
|---|---|---|
| Rules, scoring, race flow | Claude | Section 3–4 |
| Physics engine, marble handling, track pieces | Claude | Section 5 |
| Track building and track drawing | **Claude, in code** | Section 6 — rails are drawn in code using ChatGPT textures |
| Server, networking, phone controller | Claude | Section 7 |
| UI chrome (buttons, meters, scoreboard, text, tags, confetti) | **Claude, in code** | Crisp at any size |
| Backgrounds, props, marble textures, mascot, items, logo | ChatGPT | Section 8–9 |
| Sound effects, music, voice | ChatGPT (Creative Claw) | Section 11–12 |

**The handshake is the filename.** Code loads assets by filename only. Match the filename and it just works.

**Hard rules for ChatGPT:**
- **No text, letters or numbers in any image** (except the logo).
- **No sprite sheets or animation frames.** Single still images only. All movement — rolling, spinning, bouncing, squashing — is done in code.
- **Transparent background** on everything except backgrounds and tiling textures.
- **Consistent lighting:** warm key light from top-left, cool rim light from the right.
- **No ground shadows** in images — code adds shadows.

---

## 3. How a game flows

### 3.1 State machine

```
LOBBY (playground bowl) → TRACK VOTE → COUNTDOWN → RACE → PHOTO FINISH (if close) → RESULTS
  → [repeat for 4 races] → CUP STANDINGS → CUP FINALE → (PLAY AGAIN → LOBBY)
```

| State | TV shows | Phone shows | Length |
|---|---|---|---|
| **LOBBY** | Room code, QR, a big bowl where joined marbles roll around and can boost — *practice while you wait* | Name, pick token, then the live button | Until VIP presses Start |
| **TRACK VOTE** | 3 track cards (theme preview) | 3 vote buttons | 10 s (ties: random) |
| **COUNTDOWN** | Track fly-through (4 s), marbles in the starting gate, 3-2-1-ROLL | Button + "Tap on ROLL for a perfect start!" | 7 s |
| **RACE** | The race, camera following the pack | Button, boost meter, position, item button | Until all finish, or 20 s after the winner |
| **PHOTO FINISH** | Slow-motion replay of the last 3 s if 1st and 2nd finished within 0.3 s | "Photo finish!" | 4 s |
| **RESULTS** | Podium for this race, points awarded | Your place and points | 6 s |
| **CUP STANDINGS** | Animated table after each race | Your cup position | 5 s |
| **CUP FINALE** | Trophy ceremony, awards, confetti | Your award card | 15 s |

### 3.2 VIP (the host)

The **first player to join is the VIP** (crown on their tag). VIP phone gets: **Start**, **Skip fly-through**, **Pause**, **Kick**, **Settings** (cup length 1/2/4 races, items on/off, catch-up on/off, effects quality).

### 3.3 Joining

1. TV shows a **4-letter room code** (no I, O, 0, 1) and a **QR code**.
2. Phone scans → opens `play.html?room=ABCD`.
3. Type a name (max 10 characters, family filter), pick a free **token** (colour + shape) and a **marble swirl**.
4. Your marble drops into the lobby bowl with a clack. Your phone instantly becomes the button — players learn boost and grip by playing in the bowl before the first race.

---

## 4. Rules and scoring

### 4.1 Controls (the whole game)

| Action | Phone input | Effect |
|---|---|---|
| **BOOST** | Quick tap (released within 180 ms) | Burst of speed. Costs 25% of the boost meter. |
| **GRIP** | Press and hold | Marble hugs the track (won't fly off as easily) **and** slows down. |
| **ITEM** | Small item button above the pad | Uses the power-up you're holding |

**Why it works:** speed is good, but every crest, loop and corner has a safe speed. Boost on the straights, grip over the crests. Kids mash and still have fun; adults learn the track.

### 4.2 Race scoring

| Place | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th |
|---|---|---|---|---|---|---|---|---|
| **Points** | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 |

- Everyone always finishes. When the race ends (20 s after the winner), unfinished marbles are placed by distance travelled.
- **Cup winner:** most points after 4 races. Tie → better best finish → most wins.

### 4.3 Perfect start

During the countdown, tap within **±150 ms of "ROLL"** → **PERFECT START!** (free boost, no meter cost, sparkle burst). Tap too early → marble wobbles in the gate for 0.5 s.

### 4.4 Power-ups (items)

Glowing **gem boxes** sit across the track in rows. Roll through one to get a random item. You can hold one item at a time.

| Item | Effect | Duration | Given more to |
|---|---|---|---|
| **Turbo Tornado** | Huge instant speed boost | Instant | Back of the pack |
| **Sticky Jelly** | Marble can't fly off and ignores oil, keeps full speed | 5 s | Middle |
| **Oil Slick** | Drops a puddle behind you; marbles that roll over it lose grip | Puddle lasts 8 s; slip lasts 1.5 s | Front of the pack |
| **Big Bertha** | Your marble grows 1.5× and weighs 3× — bulldoze everyone | 6 s | Back and middle |
| **Bubble Shield** | Bubble protects you from bumps and oil | 6 s | Everyone |

**Family rule:** nothing ever stops a marble dead or pushes it off the track. Items are cheeky, never cruel.

### 4.5 Catch-up (keeps races close)

| System | Rule |
|---|---|
| **Slipstream** | Within 150 px behind another marble → boost meter refills 2× faster, and a wind trail is shown |
| **Back-marker refill** | Back half of the field refills boost 1.3× faster |
| **Item weighting** | Back markers get Turbo and Big Bertha more often (table above) |
| **Straggler gust** | More than 1.2 screens behind the leader for 3+ seconds → a gentle tailwind adds +15% speed until back on screen |

All catch-up can be switched off in VIP settings for "Pro" races.

### 4.6 Cup finale awards (everyone gets one)

| Award | Given to |
|---|---|
| **Cup Champion** | Most cup points |
| **Lightning Start** | Most perfect starts |
| **Frequent Flyer** | Most times off the track |
| **Air Time** | Longest single jump |
| **Bumper Car** | Most marble-on-marble collisions |
| **Comeback King/Queen** | Biggest climb from worst to best position in one race |
| **Steady Roller** | Fewest times off the track |
| **Speed Demon** | Highest top speed |

The server gives each player a different award where possible.

---

## 5. Physics (Claude builds this)

### 5.1 Who runs the physics

**The TV runs the race simulation.** Phones only send button presses. The Render server relays messages and keeps the room. This means:
- One source of truth → no marbles in different places on different screens.
- Button lag (phone → Frankfurt → TV, about 80–120 ms from the UK) is hidden because boosts and grips work on momentum, not split-second steering.
- The phone gives **instant local feedback** (sound, vibration, meter animation) the moment you tap, so it *feels* instant.

### 5.2 Engine settings ("Roll" engine — custom, no libraries)

| Setting | Value | Why |
|---|---|---|
| World units | Design pixels; marble radius **18 px** | Matches 1920×1080 design screen |
| Timestep | Fixed **1/240 s** with accumulator | Fast marbles never tunnel through rails |
| Extra substeps | If a marble would move more than 0.4 × radius in one step, split the step | Safety at top speed |
| Gravity | **1,500 px/s²** downward (zones can change it) | Weighty but lively |
| Top speed cap | **2,400 px/s** | Readable on screen |
| Track collision | Circle vs line segments (rails are polylines) | Any track shape |
| Marble vs marble | Circle vs circle, restitution **0.8**, equal mass (Big Bertha 3×). **Overtaking:** when one marble closes on another faster than **150 px/s**, they glance off (a soft clack) and pass side by side instead of shoving. Big Bertha always bulldozes; a Bubble Shield always slips through | Satisfying clacks, and the faster marble can actually get past |
| Rail restitution | **0.25** (wood 0.3, metal 0.2, candy 0.15, ice 0.25) | Marbles settle onto rails, don't skitter |
| Rolling resistance | **0.012 × g** (ice 0.004, candy 0.02) | Surfaces feel different |
| Air drag | 0.9995 per step | Gentle |
| Broad phase | Spatial hash, cell 128 px | Cheap even on long tracks |
| Randomness | Seeded RNG per race | Same item rolls are fair and replayable |

### 5.3 Marble handling

**Grounded** = touching a rail this step. Contact normal `n` and tangent `t` come from the rail segment.

| Input | Grounded | In the air |
|---|---|---|
| **Boost (tap)** | +380 px/s along the tangent (direction of travel), 0.25 s cooldown | +150 px/s along velocity (a little air control) |
| **Grip (hold)** | Extra pull into the track of **0.6 g** along −n, plus braking of **600 px/s²** along −t. Braking fades to nothing between 800 and 420 px/s, so holding can never stop a marble dead | Gentle braking 200 px/s² (same fade), slight extra gravity 0.2 g (lands sooner) |
| **Nothing** | Normal rolling | Ballistic flight |

**Flying off happens naturally:** on a crest of radius `r`, a marble leaves the rail when `v² / r > g × cos(slope)`. Grip raises that limit by 60%, so **holding grip lets you take crests faster**. No fake "fall off" rules — it's real physics, so it always feels fair.

**Boost meter:** 0–100. Tap costs 25. Refills **14 per second** (× slipstream / back-marker bonuses).

**Super boost:** tapping with a **full meter** gives **1.75×** the push, a gold burst on the TV and "SUPER!" on the phone. The phone pad glows gold and reads **SUPER!** when it's ready, and **WAIT** when the meter is too low to boost. This is what makes patience beat mashing.

Boost always pushes **forwards along the course**, even straight after a bounce off a wall.

**Rolling look:** the marble's visual angle advances by `distance rolled ÷ radius`. The swirl texture rotates with it; the shine highlight stays fixed on top. This is what makes the marbles look like real glass.

### 5.4 Off-track and respawn

- Leaving the play area, falling into a **void** or landing in a **catch net** → marble "poofs" and reappears at the last **checkpoint** after **1.2 s**, rolling at 40% of its previous speed.
- Checkpoints every ~8% of the track (invisible gates).
- Costs about 2–3 seconds — painful, never fatal.
- **Wrong rail:** a marble that lands on a lower level (more than 120 px off the route for 0.45 s) counts as off the track.
- **Stuck rescue:** no progress for 3 s → hop to the next checkpoint, rolling at a modest speed. If a rescue didn't get it clear, the next rescue hops one checkpoint further, so nobody can ever be trapped.
- **Turn walls** at the end of each level are padded **cushions** (no bounce), so fast marbles drop to the next level instead of bouncing back uphill.

### 5.5 Track pieces (all built in code from data)

| Piece | Physics | Skill moment |
|---|---|---|
| **Straight ramp** | Angled rail | Boost here |
| **Curve** | Arc of segments (convex = crest, concave = dip) | Grip over crests |
| **Loop-the-loop** | Full circle rail; needs `v² ≥ g × r` at the top | Boost before it, or drop into a catch net below and lose time |
| **Jump** | Gap with landing ramp | Too slow = short; too fast = overshoot. Grip in the air to drop sooner |
| **Whirlpool bowl** | U-shaped bowl with a hole at the bottom; marble rocks back and forth until slow enough to drop | **Hold grip to bleed speed and exit faster** — counter-intuitive and clever |
| **Splitter** | Path forks: fast marbles clear a gap onto a shortcut, slower ones drop to a safe longer path | Commit with a boost |
| **Boost pad** | Free +500 px/s along the pad | Free speed |
| **Seesaw** | Plank on a hinge (one rotating body); tips under marble weight | Timing — wait or boost across |
| **Lift / paddle wheel** | Moving paddles carry marbles upward at a fixed speed | Natural regroup — the pack bunches up |
| **Bumpers** | Circles with restitution **1.3** and a flash | Pinball chaos |
| **Conveyor** | Rail adds 200 px/s along its direction | Free speed, or a slow uphill one |
| **Low-gravity zone** | Gravity × 0.4 inside the zone | Floaty, huge jumps |
| **Slow zone** (chocolate, snow) | Rolling resistance × 4 | Boost through it |
| **Fork (daredevil shortcut)** | The rail ends at a 230 px gap after a standard run-up. Fast marbles jump onto a gold-edged shortcut rail that skips a whole zigzag; slower ones drop through to the long way round. Ranking stays fair because both routes map onto the same race distance | Boost 1–2 times on the run-up to take it (no-input marbles make it about 1 in 10) |
| **Fork (gem alley)** | Same as above, but the long way is lined with gem rows and a boost pad | Time saved vs. power-ups |
| **Finish gate** | Timing line, then a run-off funnel | — |

### 5.6 Camera

- **Target:** the pack centre, leader weighted 2×, ignoring marbles more than 1.2 screens behind.
- **Look-ahead:** 0.25 s ahead of the leader's velocity.
- **Zoom:** fits the **biggest bunch of racers** (within 1,100 px of each other), clamped between **0.68× and 1.3×**, so marbles stay big enough to read from the sofa. Anyone out of shot gets an edge arrow with their gap. Zooms out slightly at high speed.
- **Motion:** all camera moves use the Gentle spring (5.8) — never jerky.
- **Off-screen marbles:** shown as an arrow at the screen edge with their token and a "−3.2s" gap.
- **Countdown fly-through:** camera glides from finish to start along the track (4 s).

### 5.7 Photo finish replay

- The TV keeps a 4-second rolling recording of every marble's position and spin (60 per second).
- If 1st and 2nd cross within **0.3 s**, the last 3 s replays at **quarter speed**, zoomed onto the line, with a camera-shutter flash and a freeze-frame on the winning moment.

### 5.8 Springs, shake and juice

**Springs** (one shared function: `accel = −stiffness × (pos − target) − damping × vel`):

| Preset | Stiffness | Damping | Used for |
|---|---|---|---|
| Snappy | 400 | 30 | Buttons, toggles |
| Bouncy | 220 | 14 | Tags, scores, podium |
| Wobbly | 170 | 10 | Mascot, jelly effects |
| Gentle | 120 | 20 | Camera, panels |

**Screen shake** (trauma model): big landings add 0.3, bumper hits 0.2, Big Bertha impacts 0.5. Shake = trauma² × 12 px, smooth noise, decays 1.8 per second. Off when Reduce Motion is on.

**Juice checklist (code-driven):**
- Marble **squash** on hard landings (115% wide / 85% tall for 60 ms).
- **Speed streaks** behind marbles over 1,500 px/s.
- **Sparks** when marbles roll fast on metal rails; **dust** on wood; **sprinkles** on candy; **frost puffs** on ice.
- **Impact flash** and clack sound scaled to collision speed.
- **Slow-motion hit** (0.15 s at 30% speed) when a marble lands a huge jump or a Big Bertha bulldoze happens. Max once every 5 s.
- **Musical xylophone stairs** in Toy Box: each step plays a note.

### 5.9 Rendering and performance

- **Design resolution:** 1920 × 1080, scaled to fit any screen.
- **Layers (back to front):** far background image (parallax 0.05) → mid props (parallax 0.4) → track rails and supports → marbles, items and particles → near props (parallax 1.2) → UI layer (HTML text) → FX layer (confetti, flashes).
- **Target:** 60 fps on a mid-range laptop. **Auto "Lite FX"** if frame time averages over 20 ms: halves particles, turns off glow blur and near-prop layer.
- **Particle cap:** 800 (Lite 350).
- **Rails** are drawn as chunky **30 px beams** hanging below the collision line (dark outline → textured body → shaded underside → bright running surface), with scaffold posts that run down to the rail beneath. Physics is unchanged: the top face of every beam is exactly the line the engine collides with. Rails are grouped into 900 px cells and only on-screen cells are drawn.

---

## 6. Tracks (Claude builds, ChatGPT decorates)

### 6.1 How tracks are made

Tracks are **data files** (`content/tracks/*.json`): a chain of track pieces with sizes and angles. Code joins them into one smooth run, draws the rails using the theme's texture and colours, adds supports, and places ChatGPT props around it.

```json
{
  "id": "toybox",
  "name": "Toy Box Tumble",
  "theme": "toybox",
  "gravity": 1500,
  "pieces": [
    { "type": "start_gate" },
    { "type": "ramp", "length": 900, "angle": 18 },
    { "type": "curve", "radius": 400, "turn": -40 },
    { "type": "xylophone_stairs", "steps": 8 },
    { "type": "gem_row", "count": 4 },
    { "type": "loop", "radius": 220 },
    { "type": "bumper_field", "rows": 3 },
    { "type": "lift", "height": 600 },
    { "type": "splitter", "gap": 260 },
    { "type": "finish" }
  ],
  "props": [ { "art": "prop_toybox_03", "at": 0.22, "side": "behind", "scale": 1.0 } ]
}
```

### 6.2 The four launch tracks (one per race in a cup)

| Track | Theme | Signature features |
|---|---|---|
| **Toy Box Tumble** | Wooden toys in a child's bedroom | Xylophone stairs (play notes), toy-train paddle lift, pinball bumpers, building-block jumps |
| **Candy Cascade** | Sweet factory | Conveyor belts, candy-cane loop, gumball whirlpool bowl, chocolate river slow zone |
| **Frosty Freefall** | Ice palace | Slippery ice sections (grip matters), giant snowflake seesaw, ski-jump, icicle bumpers |
| **Orbit Drop** | Space station | Low-gravity zones, rocket boost pads, asteroid bumpers, huge floaty jumps |
| **Jungle Jumble** | Jungle canopy | Two daredevil shortcuts + a gem alley, bamboo rails, mud pits, rope-bridge jump, xylophone stairs |
| **Seaside Sprint** | Seaside pier at sunset | Two gem alleys + a shortcut, boardwalk rails, sand traps, beach-ball bumpers |
| **Clockwork Chaos** | Clockmaker's workshop | Three forks, brass rails, cog conveyors, see-saw levers |

A Cup can be 1, 2, 4 races or a 7-race **Grand Prix**. Players vote between 3 tracks before each race; tracks already played that Cup are left out where possible.

### 6.3 Rail materials (one per theme)

| Theme | Rail look (code-drawn) | Texture | Surface feel |
|---|---|---|---|
| Toy Box | Thick rounded wooden rails, warm | `tex_rail_toybox` | Normal grip, dust |
| Candy | Red-white striped candy rails, glossy | `tex_rail_candy` | Sticky (more resistance), sprinkles |
| Ice | Translucent blue ice with frosted edges | `tex_rail_ice` | Slippery, frost puffs |
| Space | Chrome tube with glowing cyan strip | `tex_rail_space` | Smooth, sparks |

---

## 7. Phone controller, server and networking (Claude builds this)

### 7.1 Phone design rules

- **Portrait, one thumb.** The **pad fills the bottom 60%** of the screen — impossible to miss without looking.
- **Readable in sunlight and darkness:** auto light/dark theme plus high-contrast mode. Position number is **72 px bold**.
- **Interruptible:** close the browser or take a call — it rejoins automatically (player ID saved on the phone). The marble keeps rolling with no input while you're away.
- **Light:** phone downloads under 1.5 MB.
- **Screen stays awake** during races (Wake Lock where supported).

### 7.2 Phone screens

| Screen | Top (look) | Bottom (thumb) |
|---|---|---|
| **Join** | Room code, name | Token grid, swirl picker, **Join** |
| **Lobby** | "You're in!" + your marble | The live pad (practise in the bowl). VIP: **Start** |
| **Vote** | — | 3 big track cards |
| **Race** | Position (e.g. "3rd"), track progress strip | Big pad with **boost meter ring** around it; item button above the pad |
| **Off track** | "WHOOPS!" flash, respawn countdown | Pad disabled for 1.2 s |
| **Results** | Your place, points | VIP: **Next** |
| **Finale** | Your award card | **Play again** |

**Pad feedback (instant, on the phone):**
- Tap → pad pulses, `sfx_boost_phone` plays, 15 ms buzz (Android).
- Hold → pad glows and squeezes in slightly, soft grip hum.
- Meter empty → pad greys and a gentle "empty" thunk plays.
- (iPhones don't allow web vibration — sound and visuals only.)

### 7.3 Server

- **Node.js + `ws`** on Render, **Frankfurt region**.
- The server **relays** phone inputs to the TV and race results back to phones; stores the room, players, cup points and VIP.
- **Wake-up screen:** Render's free tier sleeps. The TV shows a "Polishing the marbles…" animation while it wakes (up to ~50 s).
- Rooms expire after 30 minutes idle.

### 7.4 Messages

| Direction | Type | Contents |
|---|---|---|
| TV → Server | `host:create` | settings |
| Phone → Server | `player:join` | room, name, token, swirl, playerId |
| Phone → TV (via server) | `in` | `p` (press) / `r` (release) / `i` (item) — a few bytes each |
| TV → Phones (via server) | `hud` | position, boost %, item held, progress — **10 times a second** |
| TV → Server | `race:result` | finishing order, times, stats for awards |
| Server → All | `state` | full room state (on every change and on reconnect) |
| VIP → Server | `vip:start` / `vip:next` / `vip:pause` / `vip:kick` / `vip:settings` | — |

The TV decides whether a press was a tap (boost) or a hold (grip) using the 180 ms rule.

### 7.5 Project files

```
marble-rush/
├─ server/server.js             ← relay server (Render runs this)
├─ src/tv/…                     ← TV: physics, tracks, camera, rendering
├─ src/phone/…                  ← phone controller
├─ src/shared/…                 ← springs, RNG, constants
├─ content/tracks/*.json        ← track layouts
├─ assets/raw/                  ← SHAUN DROPS CHATGPT IMAGES HERE
├─ assets/raw/audio/            ← and sounds here
├─ tools/build.js               ← resizes, compresses, builds everything
└─ public/tv.html, play.html    ← final single self-contained files
```

**The build automatically:** trims empty edges, resizes to Section 9 sizes, makes textures tile seamlessly (mirror-blend seams), converts to WebP, converts audio, writes `manifest.json`, and bakes everything into **two single self-contained HTML files**.

---

## 8. Art direction (ChatGPT follows this)

### 8.1 STYLE BIBLE — paste at the start of every ChatGPT image session

```
You are the art director for MARBLE RUSH, a premium family marble-racing game played on a TV.
Follow these rules for every image in this session:

STYLE: Premium stylised 3D, like a high-end animated family feature film. Miniature tabletop
diorama worlds with a slight tilt-shift feel — everything looks like a beautifully crafted toy.
Rich materials: polished wood, glossy candy, frosted ice, brushed chrome, real-looking glass.
Chunky rounded shapes, warm and inviting, full of tiny charming details.

LIGHTING: Warm golden key light from the top-left. Cool blue rim light from the right.
Soft ambient occlusion. Clean readable silhouettes. Gentle glow on shiny surfaces.

MASTER PALETTE:
Night navy #0F1130, Stage navy #14163A, Deep blue #1E2257,
Racing red #FF3B5C, Tangerine #FF8A3D, Lemon #FFD23F, Mint #3DDC97,
Sky #4CC9F0, Grape #8B5CF6, Bubblegum #FF5FA2, Cream #FFF4E0, Gold #FFC83D.

RULES:
- NO text, letters, numbers, logos or watermarks anywhere (unless I say "logo").
- Transparent background unless I say BACKGROUND or TEXTURE.
- Object centred with about 8% empty space around it. Nothing cut off.
- Single still image only. No sprite sheets, no multiple views, no panels.
- No ground shadows under objects (the game adds its own).
- Nothing scary, gory or rude. Must delight ages 5 to 95.
- Same character must look identical every time (see CAPTAIN CLATTER reference).
Confirm you understand, then wait for my first asset request.
```

### 8.2 The mascot — CAPTAIN CLATTER (race announcer)

- A **large glass marble** character with a swirl of racing red and gold inside, glossy and glowing.
- Big expressive cartoon eyes and a wide grin on the glass surface, a **bushy cream handlebar moustache**.
- Wears a **tweed flat cap** and a **vintage commentator headset with a microphone**.
- Small white-gloved hands, no legs (he bounces).
- Personality: enthusiastic old-school race commentator. Warm, excitable, never mean.
- **Make `clatter_reference` first**, then upload it back with every later pose: *"Match this character exactly."*

### 8.3 Background composition rules

- Backgrounds sit **far behind** the track — keep them **softer and slightly darker** than props.
- Strong detail at the **edges and top**; calmer in the **middle band** where the track runs.
- Gentle depth-of-field blur so marbles and rails pop.

### 8.4 Colour tokens (Claude uses in code)

```css
--mr-night: #0F1130;  --mr-navy: #14163A;  --mr-deep: #1E2257;
--mr-red: #FF3B5C;    --mr-gold: #FFC83D;  --mr-cream: #FFF4E0;
--mr-tangerine: #FF8A3D; --mr-lemon: #FFD23F; --mr-mint: #3DDC97;
--mr-sky: #4CC9F0; --mr-grape: #8B5CF6; --mr-bubblegum: #FF5FA2;
```

### 8.5 Player tokens (drawn in code — colour AND shape for colour-blind players)

Each marble gets a floating **name tag** above it with the token shape, plus a coloured ring around the marble.

| # | Colour | Hex | Shape |
|---|---|---|---|
| 1 | Racing red | #FF3B5C | Circle |
| 2 | Sky | #4CC9F0 | Square |
| 3 | Lemon | #FFD23F | Triangle |
| 4 | Mint | #3DDC97 | Star |
| 5 | Bubblegum | #FF5FA2 | Heart |
| 6 | Grape | #8B5CF6 | Diamond |
| 7 | Tangerine | #FF8A3D | Hexagon |
| 8 | Snow | #F5F5F5 | Cross |

### 8.6 Fonts (bundled, free licences)

- **Fredoka** (bold, rounded) — positions, countdown, big moments
- **Nunito** — everything else
- TV text minimum **36 px** at 1080p. Timers use tabular figures.

---

## 9. Image asset list (ChatGPT prompts)

Generate at the **Gen size** (ChatGPT's native sizes). The build shrinks to the **Game size**. Save as PNG with the exact filename.

### 9.1 Logo and general backgrounds

| Filename | Gen size | Game size | Type |
|---|---|---|---|
| `logo_marblerush` | 1536×1024 | 1200 wide | Transparent |
| `bg_lobby` | 1536×1024 | 1920×1080 | Background |
| `bg_results` | 1536×1024 | 1920×1080 | Background |
| `bg_phone` | 1024×1536 | 780×1688 | Background |

**`logo_marblerush`**
```
LOGO (text allowed for this one only). The words "MARBLE RUSH" in chunky, rounded, glossy 3D
letters, racing red with gold outlines and bright highlights, slanted forward for speed.
A shiny glass marble with a red and gold swirl rockets across the top of the words, leaving
a gold speed trail. Small chequered racing
flag accent behind the right end. Transparent background.
Check spelling exactly: M-A-R-B-L-E  R-U-S-H.
```

**`bg_lobby`**
```
BACKGROUND, wide 3:2. A cosy, glamorous marble-racing stadium at night seen from the stands:
deep navy sky, warm marquee light bulbs strung across the top, a big wooden toy stadium bowl
shape blurred in the middle distance, racing red and gold bunting, soft spotlights sweeping
from the corners. Middle band calm and darker. Gentle depth of field. No people, no text.
```

**`bg_results`**
```
BACKGROUND, wide 3:2. Celebration stage for marble racing winners: gold and racing-red lights
blazing, chequered-pattern banners hanging from the top corners (plain pattern, no text),
sparkly bokeh, a softly lit three-step podium shape in the lower centre with no numbers.
Joyful and glittering. No people, no text.
```

**`bg_phone`**
```
BACKGROUND, tall 2:3 portrait. Very subtle dark navy pattern of tiny marbles and faint
chequered squares, low contrast, soft vignette, faint gold glow at the top.
Must stay quiet behind buttons. No text.
```

### 9.2 Captain Clatter (1024×1024 → 512×512, transparent)

| Filename | Pose |
|---|---|
| `clatter_reference` | Front-facing, friendly grin, one hand raised — **the master reference** |
| `clatter_announce` | Leaning forward, holding his headset mic, mouth wide open shouting excitedly |
| `clatter_cheer` | Bouncing high, both hands up, eyes squeezed shut with joy |
| `clatter_gasp` | Eyes huge, moustache flying up, hands on cheeks |
| `clatter_flag` | Waving a chequered racing flag (plain pattern, no text) |
| `clatter_wince` | One eye shut, gritted-teeth "ooh, that hurt" smile — kind, not mocking |

**Template:**
```
CAPTAIN CLATTER, the Marble Rush announcer. Match the attached reference exactly: a large glossy
glass marble character with a racing red and gold swirl inside, big cartoon eyes and grin on the
glass, a bushy cream handlebar moustache, a tweed flat cap, a vintage commentator headset with
microphone, small white-gloved hands, no legs. POSE: [pose]. Centred, transparent background,
Marble Rush style.
```

### 9.3 Marbles (the stars of the show)

**How marbles work in code:** each marble is built from layers — **swirl texture** (rotates as it rolls) → colour tint ring → **highlight overlay** (stays still on top). So ChatGPT supplies flat circular swirl patterns, not finished marbles.

| Filename | Gen → Game | Prompt |
|---|---|---|
| `marble_swirl_01` … `marble_swirl_12` | 1024×1024 → 256×256 | See template below |
| `marble_highlight` | 1024×1024 → 256×256 | A glass sphere shine overlay only: a bright white curved highlight in the top-left, a soft secondary glint bottom-right, faint edge darkening ring, everything else fully transparent. No marble body. |

**Swirl template:**
```
TEXTURE for a glass marble's inside, seen straight on. A perfect circle filling the whole image
edge to edge, transparent outside the circle. Inside: [SWIRL DESCRIPTION], with depth, as if
looking into clear glass. Flat front view, no shine, no highlight, no shadow.
```

| # | Swirl description |
|---|---|
| 01 | Classic red and white candy ribbon twist |
| 02 | Deep ocean blue with white wave swirls |
| 03 | Golden honey with tiny floating bubbles |
| 04 | Mint green and cream cat's-eye vane |
| 05 | Purple galaxy with tiny stars |
| 06 | Bubblegum pink and white marbled cloud |
| 07 | Tangerine flame swirl |
| 08 | Rainbow oil-slick shimmer |
| 09 | Clear glass with a single sky-blue ribbon |
| 10 | Lemon yellow with orange sunburst |
| 11 | Frosty white with icy blue cracks |
| 12 | Black onyx with gold veins |

### 9.4 Theme packs (repeat for each of the 4 themes)

Each theme needs **1 far background, 1 rail texture, 8 props**.

| Filename | Gen → Game | Notes |
|---|---|---|
| `bg_far_[theme]` | 1536×1024 → 1920×1080 | Distant background, soft, calm middle band |
| `tex_rail_[theme]` | 1024×1024 → 512×512 | **TEXTURE**, fills the whole square, seamless tiling, flat-lit |
| `prop_[theme]_01` … `_08` | 1024×1024 → 512×512 | Transparent decorative objects placed around the track |

Theme keys: `toybox`, `candy`, `ice`, `space`, `jungle`, `seaside`, `clockwork`.

**Toy Box Tumble (`toybox`)**
- `bg_far_toybox`: *BACKGROUND, wide 3:2. A child's cosy bedroom at dusk seen from floor level as a giant: blurred bookshelf, warm bedside lamp glow, starry night through a window, soft toy shapes in shadow. Warm and magical. Calm middle band.*
- `tex_rail_toybox`: *TEXTURE, seamless tiling: smooth polished light pine wood grain, warm honey tone, flat even lighting, fills the whole square.*
- Props: `01` stacked wooden alphabet-style blocks (blank faces) · `02` a wind-up toy robot · `03` a wooden toy train engine · `04` a spinning top · `05` a toy drum · `06` a teddy bear sitting · `07` a toy rocket on a stand · `08` a wooden xylophone (colourful bars, no letters).

**Candy Cascade (`candy`)**
- `bg_far_candy`: *BACKGROUND, wide 3:2. A whimsical sweet factory interior: pastel pipes, giant lollipop trees, chocolate waterfall in the far distance, pink and mint glow, sugar sparkle haze. Calm middle band.*
- `tex_rail_candy`: *TEXTURE, seamless tiling: glossy diagonal red-and-white candy stripes with a sugary sheen, flat lighting.*
- Props: `01` giant swirl lollipop · `02` gumball machine (no text) · `03` stack of macarons · `04` cupcake with sprinkles · `05` candy-cane arch · `06` chocolate bar pieces · `07` jelly bear · `08` ice-cream cone tower.

**Frosty Freefall (`ice`)**
- `bg_far_ice`: *BACKGROUND, wide 3:2. A glittering ice palace at night: crystal towers, aurora ribbons of mint and grape in the sky, soft snowfall, cool blue glow with warm lantern accents. Calm middle band.*
- `tex_rail_ice`: *TEXTURE, seamless tiling: translucent pale-blue ice with fine frost crystals and tiny trapped bubbles, flat lighting.*
- Props: `01` ice crystal cluster · `02` friendly snowman · `03` giant snowflake ornament · `04` frosted pine tree · `05` igloo · `06` icicle chandelier · `07` penguin on skis · `08` glowing ice lantern.

**Orbit Drop (`space`)**
- `bg_far_space`: *BACKGROUND, wide 3:2. Deep space seen from a cosy toy-like space station: a big ringed planet, colourful nebula in grape and sky, tiny twinkling stars, warm window lights. Calm middle band.*
- `tex_rail_space`: *TEXTURE, seamless tiling: brushed chrome metal with fine horizontal grain and subtle panel lines, flat lighting.*
- Props: `01` cute satellite · `02` small ringed planet · `03` friendly toy rocket · `04` asteroid with craters · `05` space station module with glowing windows · `06` friendly little alien (cute, not scary) · `07` UFO with lights · `08` astronaut helmet.

**Jungle Jumble (`jungle`)**
- `bg_far_jungle`: *BACKGROUND, wide 3:2. A lush jungle canopy at dusk: giant leaves, hanging vines, a distant waterfall, fireflies, warm golden light shafts through the trees. Calm middle band.*
- `tex_rail_jungle`: *TEXTURE, seamless tiling: green bamboo with natural joints and subtle stripes, flat lighting.*
- Props: `01` friendly toucan on a branch · `02` giant tropical flower · `03` carved tiki totem (smiling) · `04` banana bunch · `05` rope bridge section · `06` monkey hanging from a vine (cute) · `07` waterfall rock · `08` jungle explorer's hat on a crate.

**Seaside Sprint (`seaside`)**
- `bg_far_seaside`: *BACKGROUND, wide 3:2. A cheerful British seaside pier at sunset: Ferris wheel lights, striped beach huts, calm sea reflecting pink and gold sky, gulls in the distance. Calm middle band.*
- `tex_rail_seaside`: *TEXTURE, seamless tiling: sun-bleached boardwalk planks with soft wood grain, flat lighting.*
- Props: `01` sandcastle with a little flag (no text) · `02` striped beach hut · `03` bucket and spade · `04` beach ball · `05` friendly seagull · `06` ice-cream cone · `07` deckchair · `08` lighthouse.

**Clockwork Chaos (`clockwork`)**
- `bg_far_clockwork`: *BACKGROUND, wide 3:2. A cosy clockmaker's workshop at night: huge brass gears turning in the shadows, a giant clock face (no numbers), warm lamp glow, shelves of tiny tools. Calm middle band.*
- `tex_rail_clockwork`: *TEXTURE, seamless tiling: polished brass with fine brushed grain and tiny rivets, flat lighting.*
- Props: `01` big brass cog · `02` pocket watch (no numbers) · `03` wind-up key · `04` cuckoo clock (cheerful) · `05` spring coil · `06` oil can · `07` brass telescope · `08` tiny clockwork robot.

### 9.5 Items and track objects (transparent)

| Filename | Gen → Game | Prompt subject |
|---|---|---|
| `item_box` | 1024×1024 → 192 | A floating glowing gem box: faceted crystal cube, gold edges, rainbow inner glow |
| `item_turbo` | 1024×1024 → 256 | Icon: a swirling mini tornado with a speed arrow feel, sky and white |
| `item_jelly` | 1024×1024 → 256 | Icon: a wobbly glossy green jelly blob |
| `item_oil` | 1024×1024 → 256 | Icon: a glossy black oil droplet with a rainbow sheen |
| `item_big` | 1024×1024 → 256 | Icon: a giant heavy marble with motion "bump" curves around it |
| `item_bubble` | 1024×1024 → 256 | Icon: a shiny soap bubble with rainbow reflections |
| `oil_puddle` | 1536×1024 → 300×120 | Flat glossy black oil puddle seen from a low side angle, rainbow sheen |
| `fx_bubble_shield` | 1024×1024 → 256 | A transparent soap-bubble sphere overlay, rainbow edges, see-through centre |
| `fx_jelly_coat` | 1024×1024 → 256 | A translucent green jelly sphere overlay, glossy, see-through |
| `bumper` | 1024×1024 → 192 | A round pinball bumper seen from the side, racing red with chrome ring and a light bulb top |
| `gate_start` | 1536×1024 → 800×400 | A toy racing starting gate structure: chrome posts, red and gold, a closed gate bar (no text, no numbers) |
| `arch_finish` | 1536×1024 → 900×600 | A finish-line arch with chequered pattern and light bulbs (no text) |
| `trophy_cup` | 1024×1024 → 512 | A gleaming gold trophy cup with a glass marble set into the front |
| `medal_gold` / `medal_silver` / `medal_bronze` | 1024×1024 → 256 | A shiny medal with a red ribbon, plain marble emblem, no numbers |

### 9.6 FX textures (transparent)

| Filename | Gen → Game | Prompt subject |
|---|---|---|
| `fx_sparkle` | 1024×1024 → 128 | A single four-point sparkle, white-gold core, soft glow |
| `fx_glow` | 1024×1024 → 256 | A soft round warm glow fading to fully transparent edges |
| `fx_spark` | 1024×1024 → 128 | A single short bright orange-white metal spark streak |
| `fx_dust` | 1024×1024 → 128 | A soft cartoon dust puff, warm beige |
| `fx_sprinkle` | 1024×1024 → 128 | A tiny cluster of 5 colourful candy sprinkles |
| `fx_frost` | 1024×1024 → 128 | A soft icy white-blue frost puff with tiny crystals |
| `fx_splash` | 1024×1024 → 256 | A cartoon chocolate splash crown, glossy brown |
| `fx_poof` | 1024×1024 → 256 | A round cartoon "poof" cloud with little stars (respawn) |
| `fx_star_burst` | 1024×1024 → 256 | Firework burst of tiny gold and red stars |
| `fx_wind` | 1536×1024 → 400×160 | Soft white curved wind streaks (slipstream trail), fading out |

---

## 10. Integration checklist (Claude's side — how art slots in)

- **Manifest:** build writes `manifest.json`; code loads by key (filename without `.png`).
- **Placeholders:** missing images draw a coloured rounded shape with the asset name; marbles fall back to code-drawn radial gradients.
- **Anchors:** props anchor bottom-centre; marbles, items, bumpers anchor centre; Clatter anchors bottom-centre; starting gate anchors bottom-left.
- **Marble build:** `marble_swirl_xx` (rotated) → player colour ring → `marble_highlight` (fixed). Swirls are masked to a circle in code, so small edge mistakes don't show.
- **Rail textures:** used as a repeating pattern along each rail; the build blends seams so they tile.
- **Props:** placed by the track file at a distance along the track (`at`: 0–1), behind or in front of the track, with parallax.
- **Shadows:** code adds soft contact shadows under marbles and props.

---

## 11. Sound list (ChatGPT / Creative Claw)

### 11.1 Sound rules (paste into the sound session)

```
You are the sound designer for MARBLE RUSH, a premium family marble-racing game for TV.
Sound style: bright, punchy, tactile and playful — real glass marbles, polished wood, candy,
ice and chrome, mixed with a modern family-film polish. Satisfying, never harsh, never scary.
Sound effects: no music, no speech, start instantly with no silence, end cleanly.
Loops must loop seamlessly with no gap or click.
```

**Technical targets (the build checks):** WAV 44.1 kHz 16-bit (or best available) · SFX peaks around −3 dB · music around −18 LUFS · no leading silence.

### 11.2 Sound effects (save in `assets/raw/audio/`)

**Marbles**

| Filename | Length | Prompt |
|---|---|---|
| `roll_wood_loop` | 2 s loop | A glass marble rolling steadily along a wooden track, seamless loop |
| `roll_candy_loop` | 2 s loop | A glass marble rolling on a slightly sticky, sugary surface, seamless loop |
| `roll_ice_loop` | 2 s loop | A glass marble gliding fast on smooth ice, light hiss, seamless loop |
| `roll_metal_loop` | 2 s loop | A glass marble rolling fast inside a chrome tube, bright hum, seamless loop |
| `clack_1` … `clack_4` | 0.15 s each | Two glass marbles clacking together — 4 variations |
| `land_soft` | 0.3 s | Glass marble landing gently on a track |
| `land_hard` | 0.4 s | Glass marble landing hard from a big jump, chunky thud with glassy ring |
| `rail_ping` | 0.2 s | Marble glancing off a rail edge |

**Controls and race**

| Filename | Length | Prompt |
|---|---|---|
| `sfx_boost` | 0.5 s | Punchy whoosh with a bright rising zing, a speed burst |
| `sfx_boost_phone` | 0.2 s | Short crisp tap-whoosh for the phone |
| `sfx_grip_loop` | 1 s loop | Soft humming squeeze, like rubber gripping, seamless loop |
| `sfx_empty` | 0.3 s | Gentle hollow "thunk" — out of boost |
| `sfx_count_beep` | 0.3 s | Classic race countdown beep, mid pitch |
| `sfx_count_go` | 0.6 s | Higher, longer "GO" beep with sparkle |
| `sfx_gate_drop` | 0.5 s | Mechanical starting gate snapping open, satisfying clank |
| `sfx_perfect_start` | 0.8 s | Bright magical chime and zing, a perfect start |
| `sfx_offtrack` | 0.8 s | Cartoon "wheee" falling whistle, playful |
| `sfx_respawn` | 0.5 s | Soft magic "poof" with a little twinkle |
| `sfx_checkpoint` | 0.2 s | Tiny soft chime, passing a checkpoint |
| `sfx_finish` | 1.0 s | Finish line crossing: bright bell ding with a cheer swell |
| `sfx_photo_shutter` | 0.4 s | Old camera shutter with flash pop |
| `sfx_slowmo_in` | 0.6 s | Deep descending "whomp", time slowing down |
| `sfx_slowmo_out` | 0.4 s | Quick rising whoosh, time speeding back up |

**Track features**

| Filename | Length | Prompt |
|---|---|---|
| `sfx_bumper` | 0.3 s | Pinball bumper "boing" with an electric ding |
| `sfx_boostpad` | 0.5 s | Electric zap-whoosh, a booster pad |
| `sfx_seesaw` | 0.6 s | Wooden seesaw creak and thump |
| `sfx_lift_loop` | 2 s loop | Toy-train paddle lift clacking upward, seamless loop |
| `sfx_conveyor_loop` | 2 s loop | Factory conveyor belt whirring, seamless loop |
| `sfx_splash` | 0.6 s | Thick gloopy chocolate splash |
| `sfx_ice_crack` | 0.4 s | Light crisp ice crackle |
| `sfx_lowgrav` | 1.0 s | Floaty spacey whoosh entering low gravity |
| `sfx_whirlpool_loop` | 2 s loop | Marble swirling around a bowl, rising and falling, seamless loop |
| `xylo_c4`, `xylo_d4`, `xylo_e4`, `xylo_f4`, `xylo_g4`, `xylo_a4`, `xylo_b4`, `xylo_c5` | 0.6 s each | Single wooden xylophone note at that pitch, warm and clear |

**Items**

| Filename | Length | Prompt |
|---|---|---|
| `sfx_item_pickup` | 0.5 s | Crystal gem pickup, sparkly arpeggio |
| `sfx_item_turbo` | 1.0 s | Whirling tornado whoosh |
| `sfx_item_jelly` | 0.6 s | Wobbly squelchy jelly boing |
| `sfx_item_oil` | 0.5 s | Oily splat drop |
| `sfx_oil_slip` | 0.6 s | Comic slippery skid |
| `sfx_item_big` | 0.8 s | Comic inflating "bwoomp" growing sound |
| `sfx_big_shrink` | 0.5 s | Comic deflating shrink |
| `sfx_item_bubble` | 0.6 s | Shimmery bubble forming |
| `sfx_bubble_pop` | 0.3 s | Soft bubble pop |

**Crowd and celebration**

| Filename | Length | Prompt |
|---|---|---|
| `crowd_cheer` | 2.5 s | Excited small stadium crowd cheering |
| `crowd_ooh` | 1.5 s | Crowd gasp "ooooh!" at a near-miss |
| `crowd_aww` | 1.5 s | Crowd sympathetic "awww" |
| `crowd_ambience_loop` | 4 s loop | Gentle excited crowd murmur, seamless loop |
| `sfx_points_land` | 0.5 s | Satisfying "cha-ching" with sparkle |
| `sfx_rank_up` | 0.6 s | Rising swoosh-chime, moving up the table |
| `sfx_confetti` | 1.0 s | Party popper burst with paper flutter |
| `sfx_trophy` | 4.0 s | Grand triumphant orchestral fanfare for the cup winner |

### 11.3 Music (all **128 BPM, key of D major**, so everything blends)

| Filename | Length | Prompt |
|---|---|---|
| `mus_lobby_loop` | 16 bars (~30 s), seamless loop | Upbeat funky racing lobby groove, slap bass, brass stabs, claps, glockenspiel. Fun and inviting. 128 BPM, D major. |
| `mus_toybox_loop` | 16 bars loop | Bouncy toy-box racing music: xylophone, music box, ukulele, light drums, playful energy. 128 BPM, D major. |
| `mus_candy_loop` | 16 bars loop | Sugary disco-pop racing music: funky guitar, synth bass, handclaps. 128 BPM, D major. |
| `mus_ice_loop` | 16 bars loop | Sparkling wintry racing music: sleigh bells, celesta, driving strings. 128 BPM, D major. |
| `mus_space_loop` | 16 bars loop | Retro-future space racing music: arpeggiated synths, punchy drums, wonder and speed. 128 BPM, D major. |
| `mus_final_stretch` | 8 bars loop | Excitement layer to play ON TOP of any track music for the last 20% of a race: driving drums, rising strings and brass. 128 BPM, D major. Same bar length grid. |
| `mus_results_loop` | 8 bars loop | Proud bouncy podium music, brass and claps. 128 BPM, D major. |
| `mus_cup_finale` | 30 s, clean ending | Grand joyful trophy ceremony music, full orchestra and brass, big finish. |

### 11.4 How Claude uses the sound

- **Buses:** Music, SFX, Voice, each with a volume slider in VIP settings.
- **Rolling sound per marble:** the right surface loop plays for each grounded marble; volume and pitch rise with speed (pitch 0.8× slow → 1.3× flat out). Mutes in the air. Max 8 rolling voices; off-screen marbles quieter.
- **Clacks** scale volume with impact speed, random pitch ±5%, max 6 at once.
- **Final stretch:** `mus_final_stretch` fades in when the leader passes 80% of the track.
- **Ducking:** music dips 8 dB under Captain Clatter's voice.
- **Phone sounds:** only `sfx_boost_phone`, `sfx_grip_loop`, `sfx_empty`, `sfx_item_pickup`, `sfx_count_beep`, `sfx_count_go`.

---

## 12. Captain Clatter's voice (Creative Claw voiceover)

**Voice brief:**
```
Voice for CAPTAIN CLATTER, a glass-marble race announcer. Enthusiastic, old-school British
sports commentator energy, warm Lancashire accent, mid-low pitch, booming but friendly,
smiling as he talks. Family-friendly, never sarcastic. Clean recording, no music, no effects.
```

| Filename | Line |
|---|---|
| `vo_welcome` | "Welcome to Marble Rush! Grab your phones, it's time to roll!" |
| `vo_controls` | "Tap to boost! Hold to grip! Simple as that!" |
| `vo_vote` | "Pick your track, racers!" |
| `vo_ready` | "Marbles at the ready…" |
| `vo_countdown` | "Three… two… one… ROLL!" |
| `vo_perfect` | "Ooh, perfect start!" |
| `vo_offtrack` | "Whoops! Off the rails!" |
| `vo_offtrack_2` | "And they're airborne! …And they're gone!" |
| `vo_overtake` | "A cheeky overtake!" |
| `vo_bump` | "Oof! Marble on marble!" |
| `vo_big` | "Big Bertha's coming through!" |
| `vo_oil` | "Slippery stuff out there!" |
| `vo_neck` | "It's neck and neck!" |
| `vo_final_stretch` | "Into the final stretch!" |
| `vo_winner` | "What a race! We have a winner!" |
| `vo_photo` | "It's a photo finish!" |
| `vo_cup` | "Ladies and gentlemen, your Marble Rush champion!" |
| `vo_again` | "Fancy another spin?" |

Code works fully **without** voice — every line also shows as a speech bubble from Clatter. Lines have cooldowns so he never talks over himself.

---

## 13. The 5-star checklist (test before release)

**Graphics ★★★★★**
- [ ] Marbles look like real glass: swirl rotates, highlight stays still, contact shadow underneath
- [ ] Every track has parallax depth (far, mid, near layers)
- [ ] Speed is felt: streaks, sparks, camera zoom, rising roll sound
- [ ] 60 fps with 8 marbles on a mid-range laptop (or smooth Lite FX)
- [ ] Text and tags readable from 3 metres on a 40" TV
- [ ] Phone readable in sunlight and darkness
- [ ] No image contains stray text, numbers or watermarks

**Play ★★★★★**
- [ ] A 6-year-old can race with no explanation beyond the lobby bowl
- [ ] Join to first race in under 60 seconds
- [ ] Button presses feel instant on the phone; boosts visible on TV within ~0.15 s
- [ ] At least 3 lead changes in a typical race
- [ ] Last place finishes within ~10 s of the winner in most races (catch-up on)
- [ ] Every track has at least one "shout out loud" moment (loop, big jump, whirlpool)
- [ ] Phone reconnects mid-race without breaking anything

---

## 14. Next: Porkies (game 2)

Built after Marble Rush, reusing the same **Party Core**: lobby and room codes, player tokens, VIP controls, server framework, audio engine, springs, build tool. It gets its own master file with its own style bible. Captain Clatter may cameo.

---

## 15. Change log

| Version | Date | Change |
|---|---|---|
| 1.4 | 10 Nov 2026 | Build v0.4: **skill now pays** — overtaking (5.2), grip can't stall (5.3), super boost on a full meter (5.3), stuck rescue and wrong-rail rules, cushioned turn walls (5.4); new track-aware CPU brain shared by TV and tests; `npm run balance` lab (tools/balance-lab.js). **Track look** — chunky textured beams, scaffold posts, closer camera that follows the biggest bunch (5.6, 5.9). Lobby how-to adds "Wait: full meter = super boost" |
| 1.0 | 8 Nov 2026 | First master document |
| 1.3 | 8 Nov 2026 | Build v0.3: three branched tracks (Jungle Jumble, Seaside Sprint, Clockwork Chaos) with daredevil shortcuts and gem alleys; fork piece added to 5.5; Grand Prix (7 races) Cup option; Clatter calls out shortcuts; art prompts for the three new themes in 9.4 |
| 1.2 | 8 Nov 2026 | Build v0.2: all four launch tracks playable (Candy Cascade, Frosty Freefall, Orbit Drop added); Cup of 1, 2 or 4 races chosen in the lobby; track vote before each race (phones vote; TV can click a card or Decide now); new track pieces built: conveyor, slow zone, seesaw, low-gravity zone; each theme has its own code-drawn look until its art pack arrives |
| 1.1 | 8 Nov 2026 | Build v0.1: Toy Box Tumble playable end to end; TV lobby has a QR code; local test mode (open tv.html, keyboard + CPU racers); manifest now lists each asset's file, so sounds can be MP3, OGG, M4A or WAV; music and sound are code-generated until real files arrive |

*Rule: any change to filenames, sizes, rules or scoring gets a new line here. Both AIs work from the latest version only.*
