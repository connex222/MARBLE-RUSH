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

---

## Party Pack v0.5.0 development appendix — 10 November 2026

The existing Grand Prix retains its approved seven tracks, artwork, audio,
camera and core race rules. This appendix documents the **Phase 2 foundation**
only. It does not supersede the existing approved graphics bible.

**Mode registration:** `src/modes/registry.js` registers Grand Prix, Marble
Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf with a shared
interface. The five new games are deliberately unavailable until built.

**Party Night:** The TV and VIP phone support 3-, 5- and 7-game selections.
An isolated, fixed-roster session coordinator awards 10/8/6/5/4/3/2/1
Party Points to each game's final ranking. The live development prototype
repeats Grand Prix until other games are available. Reconnection uses the
existing TV/phone relay; new players cannot join a session already in progress.

**Mode previews:** A 15-second code-drawn CPU concept animation can be
opened for any game. This is a preview, not a playable or calibrated
demonstration of an unfinished mode.

**Shared engine options:** `passing:false` disables Grand Prix's special
glancing overtakes; default `passing:true` preserves Grand Prix. A new
Builder API supports peg grids, spinners, buckets, moving gates, target rings,
golf cups, water zones and shrinking rims. The World supports opt-in
collisions and scoring sensor events, including 0.4s bucket dwell. Future
game modes retain responsibility for detailed score/rule consequences.

**Phone UI:** Existing Grand Prix pad remains unchanged. Mode-specific HUD
labels, optional betting/aim/power control panels, VIP mode/Party Night
selection and rate-limited cheering are prepared for future modes.

**QA:** Foundation tests, seven-track deterministic main-versus-development
Grand Prix regression, code/art audit, build, and simulated TV/two-phone
browser checks are required. A full real-device acceptance is still pending.


---

## Phase 3 — Drop Zone v0.6.0 development appendix (10 November 2026)

Drop Zone is the first new playable Party Pack game. The current approved
Grand Prix seven-track rendering, camera, 119 art assets and audio are
untouched. There are now two playable mode cards; the other four are locked.

**Gameplay:** 1–8 participants; five turns per participant, one marble per
turn; sequential turn order; aim LEFT/RIGHT then press DROP. The marble
falls through an 85-peg board with an animated bumper and gate, bounces
off the walls and settles into one of eight buckets. From left to right,
the bucket awards are 50, 100, 200, 500, 1000, 500, 200, 100.
The game winner has the highest total; jackpot count and roster order
break ties. A marble's flight has a 10-second fail-safe and scoring
requires a 0.4-second settling interval. Inactive players are
automatically released after 25 seconds so the session cannot stall.

**Devices:** TV shows a 1920×1080 board with turn, scores and Left/Drop/Right
fallback controls. Connected phones display the active turn, controls,
aim position and points. CPU turns are automatically resolved using
seeded randomness; unowned or duplicate drop commands are rejected.
No player data is transmitted to a new external service.

**Party Night:** Drop Zone is a single game within a 3/5/7-game session.
Its five-round final ranking is converted to the existing Party Points
scale 10/8/6/5/4/3/2/1. The fixed player roster and cumulative scores
remain controlled by Phase 2 PartyCoordinator. The shared finale displays
the winner and offers the next game.

**Art:** the functional Drop Zone pegboard is currently code-rendered,
following the established premium colour palette. It is not a claim that
a new 3D environment has been artistically approved; future visual
production must preserve its physics and screen affordances.

**QA:** 30 deterministic full CPU simulations with repeated seeds,
one eight-racer capacity test, input validation, Grand Prix regression,
local browser-rendered Drop Zone completion, and TV/two-phone WebSocket
smoke. Physical multiplayer acceptance is a separate Alpha release gate.

**Release constraint:** all development remains in
`dev/party-pack-phase3-dropzone`, PR #39 based on the Phase 2 development
branch. No GitHub main merge or Render production deployment.

---

## Party Pack Phase 4 — Bowl Brawl (development v0.7.0)

**Architecture:** `src/modes/brawl.js` implements the deterministic,
DOM-free arena simulation; `src/tv.js` handles room control, TV drawing
and Party Night scoring, and `src/play.html` handles phone button input.
The minimum number of Bowl Brawl players is **2** and the maximum is **8**.
The mode is disabled at startup if too few racers have joined.

**Rules:** five rounds, all players participate simultaneously in a circular
arena. RAM consumes **28 energy**, ANCHOR consumes **15 energy**,
energy regenerates and attack actions are cooldown-limited. RAM launches
the marble along its selected heading. ANCHOR reduces momentum and
resistance to incoming impacts. Human players can steer left/right; CPU
opponents aim toward nearby surviving rivals. The 380-unit safety
radius begins shrinking after 10 seconds, reaching 110 by 42 seconds.
A player outside the ring is eliminated. The round ends on one survivor
or 42 seconds. Rankings favour living racers, then survival time;
the round points schedule is 10, 8, 6, 5, 4, 3, 2, 1.
Five-round totals determine the winner; wins and hit counts break ties.

**Party Night:** a completed Bowl Brawl counts as one game within 3/5/7-game
Party Night, using the existing 10/8/6/5/4/3/2/1 final-game points.
The fixed roster and cross-game totals remain controlled by
`PartyCoordinator`. Grand Prix and Drop Zone stay playable.

**TV and phone:** the TV uses a 1920×1080 code-rendered bowl, shrinking
gold safety ring, avatar-coloured marbles, round timer and standings,
plus optional local control buttons. Phones show current round, points,
energy and RAM/ANCHOR/TURN buttons. The large phone pad triggers RAM.
Unauthorised inputs and spam are rejected in the mode's logic.

**Testing and release:** 30+ deterministic three-CPU full-match seeds
with five rounds, eight-player capacity test, invalid-roster, energy,
cooldown and elimination guards, seeded Grand Prix physics comparison,
Drop Zone regression and browser TV + 2-phone WebSocket testing.
The production source and 119 approved artwork assets are preserved.
The new arena art is code-rendered until visual acceptance in a later
production phase. Physical 2–4-phone testing remains a later release gate.
Phase 4 remains an isolated development branch; no merge/deploy.

---

## Party Pack Phase 5 — Marble Derby (development v0.8.0)

**Scope:** implement a complete new **five-heat Derby** for 1–8 players,
six CPU-driven marble runners and one virtual-gem wager per player per
heat. Start with 600 gems. Stake options are 25, 50, 100 and 200 gems.
Odds are computed and displayed before the wager and locked when placed.
A winning wager credits floor(stake × locked odds), with no negative
wallets, no real money, no cash-out, prize or monetisation. A 100-gem
stipend is automatically awarded if a wallet is below the minimum
25-gem stake at the start of a heat.

The TV runs a deterministic, seeded six-lane race, one 1,500-unit
distance per heat, with a maximum 24-second heat and a 12-second
selection countdown. Human players can back one runner, pick the
stake and cheer once per heat for a tiny boost. CPU players bet and
cheer automatically according to their deterministic decisions.
The Derby ends with the existing approved trophy presentation.
Final gems, then successful wagers, net profit and original roster
order determine the winner. Party Night grants 10/8/6/5/4/3/2/1
Party Points based on the Derby final standings.

Phone controls offer four stake presets, six runners and a CHEER
action. All scoring and ownership checks take place in the
authoritative TV runtime. Marble Curling and Marble Golf stay locked.
Existing 119 approved art images, Grand Prix mechanics and camera,
Drop Zone, Bowl Brawl and current audio are preserved. Derby track
art is currently code-rendered pending future AAA art production.

QA includes 30 seeded complete five-heat three-CPU games with replay,
eight-player cap and invalid wagers, plus regression tests for all
previous games, the shared Party Night and simulated TV/2-phone
WebSocket acceptance. Physical phone acceptance remains outstanding.
Phase 5 is a nonproduction branch; no main merge or Render deploy.

---

## Party Pack Phase 6 — Marble Curling (development v0.9.0)

**Players:** 2–8. **Format:** five ends; two stones per participant
per end. The shared TV controller handles the room, score reporting and
championship screen, while `src/modes/curling.js` handles deterministic
physics, authoritative input validation, turn order and scoring.
The ice uses fixed-step friction, collisions among stones, side-wall
bounces and a bounded slide. Aim is restricted to −40° through 40°;
power 30–100. Players can press SWEEP during their own moving stone,
temporarily lowering ice resistance. CPU marbles perform their turns
using seeded aim/power choices. After 18 seconds of inactivity a human
throw is released automatically; a slide stops by 22 seconds.

**Scoring:** players ranked by nearest stone to the central button
receive 10/8/6/5/4/3/2/1 points by end. Each of the player's stones
within a radius of 80 world units earns an extra 2 points.
Five-end totals determine the winner; end wins and joining order
break ties. One completed Curling game contributes the normal
Party Points scale based on these final standings.

**TV and phone:** 1920×1080 ice rink with house, aim line, stones,
round status and standings. TV fallback controls and phone control
panels allow aim, power, throw and sweep. The large phone pad is
THROW during aim or SWEEP during a slide. Invalid/unauthorised actions
are rejected by the TV-hosted simulation.

**Preservation:** all 119 approved art files, original music/audio,
seven-track Grand Prix, Derby, Drop Zone and Bowl Brawl unchanged.
Marble Golf remains locked. Curling ice is functional code-drawn
development art pending final visual/audio acceptance. Test gates are
30 deterministic five-end three-CPU matches with replays, 8-player
capacity, legacy regressions, browser TV game and two-phone
WebSocket simulated acceptance, before PR review. GitHub main and
Render remain untouched; physical-phone acceptance is outstanding.

## 16. Party Pack AAA Spec — Phase 1 audit and design approval

**Status:** Phase 1 design only; no simulation, interface, physics, Grand Prix or sound code modified. Based on the 10 November 2026 uploaded `MARBLE-RUSH-main (1).zip` snapshot. Proposed additions in this section are NOT implemented. GitHub target: `dev/party-pack-aaa`; main and Render must remain untouched.

### 16.1 Evidence and non-negotiables

The five mode simulations are located in `src/modes/{derby,dropzone,brawl,curling,golf}.js`; they export the shared registry methods. Shared rendering is `src/modes/registry.js` (`MarblePartyStage`); modes currently paint their playfields with Canvas gradients, strokes, rectangles, circles, and material approximations. `tools/build.js` automatically resizes `assets/raw/` to WebP via `sharp`; **it does not currently have explicit `pp_` sizing rules**, which Phase 3 integration must add. `src/play.html` contains the phone controls; `src/tv.js` hosts the game, network and audio paths. All five modes use seeded fixed-step or bounded-step simulation and must remain independent of animation timing. Existing `src/modes/bots.js` exposes a seeded planner but each mode also embeds its own CPU behaviour: the planner is not universally wired. Audio includes five approved Creative Claw keys, while the new-mode key names below currently rely on synthetic fallbacks.

Preserve 119 original approved art assets, Grand Prix’s seven tracks and camera, approved avatars, authoritative TV physics, existing score/coordinator policy and 128 BPM / D major sound harmony. Every asset: exact `pp_<mode>_` prefix, no embedded lettering/branding, fallback when missing. Art generated by **ChatGPT image generation only**; Creative Claw **audio and voice only**. Never infer a physics result from a presentation-only event, shader or animation.

Accessibility and presentation acceptance: design for 1920×1080 TV with **at least 36 px for running information** per §8.6 (the request’s 28 px is a lower bound but the established bible is stricter); 3 m couch visibility; tabular scores; colour **and** geometric token shape; no rapid flashes; reduced-motion variants; phone targets ≥48 CSS px; do not cover TV leaderboard with navigation. Text rendered in Fredoka/Nunito in code, never baked into images.

### 16.2 Critical audit — scores out of 10

| Game | Decision depth | Drama | Pacing | Readability | Visual | Audio | Phone UX | Primary diagnosis |

|---|---:|---:|---:|---:|---:|---:|---:|---|

| Marble Derby | 4 | 6 | 5 | 7 | 3 | 4 | 5 | One stake/pick and a single capped cheer per heat; odds and simulated races are legible, but choices mostly end at the gate. |

| Drop Zone | 3 | 5 | 4 | 7 | 3 | 4 | 5 | One drop position and one release per turn; lots of chance and forced waiting for the next action. |

| Bowl Brawl | 5 | 7 | 7 | 6 | 4 | 4 | 5 | RAM/ANCHOR/heading have real consequences and simultaneous play works; visuals lack physical arena depth. |

| Marble Curling | 6 | 6 | 3 | 6 | 4 | 3 | 5 | Aim/power/sweep give real tactical control but 5 × 2 stones per player creates considerable downtime. |

| Marble Golf | 5 | 5 | 3 | 6 | 4 | 3 | 5 | Angle/power/obstacles matter, yet five flat layouts and a capped seven-stroke loop limit variety. |

Scores are **qualitative design audit ratings**, not measured player research or frame-by-frame audiovisual testing. Current code is stronger at determinism than presentation. There is no evidence that additional code-drawn bevels alone can reach Grand Prix’s premium quality.

### 16.3 Game-by-game approved-target proposals (not implemented)

#### Marble Derby

**Gameplay and fairness.** Maintain 5 heats and 6 named runners. Add a 3-stat form board (speed, endurance, consistency) derived from the seeded horse form; make odds a fair snapshot at bet time and keep virtual gems only. Rotate seeded straight sprint, hurdle straight, muddy bend, extended final heat and photo-finish showcase. Give players one *timed cheer* per heat with a fixed small boost rather than rapid-tap advantage. Add a visible shared hype bar that affects spectacle only, not results. Late surge must come from a deterministic stamina/drafting model, not unseeded comeback manipulation. Offer 3× 5-sec form insights before lock; no real-money betting imagery.

**Art world.** Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting. Palette: amber, racing red, gold and rich green. Depth order: distant background → parallax set dressing → real asset-backed play surface → collision-aligned 3D-styled obstacles → player marbles → event-driven FX → legible fixed HUD. Distinct world, common material/lighting calibration.

**Camera and game feel.** Low chase camera at the toy rails, grandstand tracking shot, shallow-depth foreground bunting, finish line slow replay based on recorded positions (render-only) on under-0.25s separation; choose stable close-heats threshold and limit replay to 3 s. Anticipation, action, impact and reaction should be presented through short sound/lighting/camera envelopes, never blocking player input or affecting deterministic physics.

**TV HUD / phone UX.** 6 runner tiles with shapes + colours; odds and form, 12 s visible bet timer, each player’s virtual gem balance, huge race order, winner payout clarity. Phone: big runner chips, stake control and one-tap CHEER after gates; no spam.

**Captain Clatter cues.** Intro, gate countdown, odds lock, cheer, late surge, photo finish, virtual-gem payout; no repeated voice while intro is playing.

**Acceptance target.** 30 seeded 8-player-capable deterministic simulations with replay equality; no mechanic reduces fairness; scene works with all new art disabled, controls readable at 3 metres, no overlapping host/leaderboard UI, reduced motion, <15 s unengaged wait where practical.

#### Drop Zone

**Gameplay and fairness.** Keep five rounds and physical peg board. Seed 2–3 gold multiplier pegs per round, one seeded moving jackpot target reserved for round 5, and escalating bin values clearly displayed. Allow a single limited trajectory hint to the first peg rather than an exact path that removes tension. Add a max-10s aim window (with owner confirmation), and let waiting players make one non-scoring prediction/emote. Gold multipliers must cap at 2× to prevent runaway variance; simulate and tune actual win spreads.

**Art world.** Grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms. Palette: midnight navy, amber, cyan and polished gold. Depth order: distant background → parallax set dressing → real asset-backed play surface → collision-aligned 3D-styled obstacles → player marbles → event-driven FX → legible fixed HUD. Distinct world, common material/lighting calibration.

**Camera and game feel.** Follow glass marble in a 3/4 cabinet view, keyframe slow-motion on final three peg impacts and dolly to the winning bucket; VFX must not slow simulation ticks or alter collisions. Anticipation, action, impact and reaction should be presented through short sound/lighting/camera envelopes, never blocking player input or affecting deterministic physics.

**TV HUD / phone UX.** Prominent score bins with shape as well as colour, each drop’s value, jackpot target, round 1–5 and queued turn; phone one-thumb left/right + DROP, visible forecast ghost and short celebratory animation.

**Captain Clatter cues.** Peg bounce surprise, rare multiplier, moving jackpot, bucket reveal, last-drop tension, last-to-first comeback.

**Acceptance target.** 30 seeded 8-player-capable deterministic simulations with replay equality; no mechanic reduces fairness; scene works with all new art disabled, controls readable at 3 metres, no overlapping host/leaderboard UI, reduced motion, <15 s unengaged wait where practical.

#### Bowl Brawl

**Gameplay and fairness.** Keep five 42-second rounds, 2–8 competitors and deterministic marbles. Define one seeded *telegraphed* arena feature each round: spring bumper, brittle outer tile, small ice patch, rotating central bumper, or clean last-round showdown. Retain RAM energy and ANCHOR cooldown, give defeated players a non-scoring camera/cheer action until next round. Never introduce random hazard geometry without a seeded state. Balance anti-camping (edge warning), collision impulse and recovery time with CPU tournament tests.

**Art world.** Wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights. Palette: grape, coral pink, gold and deep indigo. Depth order: distant background → parallax set dressing → real asset-backed play surface → collision-aligned 3D-styled obstacles → player marbles → event-driven FX → legible fixed HUD. Distinct world, common material/lighting calibration.

**Camera and game feel.** 3/4 bowl diorama, radial ring tilt and contact shadows, <120 ms camera punch on hard impacts, spectator shake and KO cut-in capped at 1.5 seconds; last two get wider framed confrontation rather than screen shake. Anticipation, action, impact and reaction should be presented through short sound/lighting/camera envelopes, never blocking player input or affecting deterministic physics.

**TV HUD / phone UX.** Larger top-two/remaining count, shrinking rim countdown, energy rings, KO ticker and hazard icon; host return outside standings; phone one-thumb RAM, ANCHOR and steering, tactile energy gauge.

**Captain Clatter cues.** Arena hazard warning, collision, shrinking ring, comeback save, knockout, final-duel reveal and champion.

**Acceptance target.** 30 seeded 8-player-capable deterministic simulations with replay equality; no mechanic reduces fairness; scene works with all new art disabled, controls readable at 3 metres, no overlapping host/leaderboard UI, reduced motion, <15 s unengaged wait where practical.

#### Marble Curling

**Gameplay and fairness.** Keep 5 ends, two throws per person and 2–8 competitors; make spin (curl -100..100) a seeded fixed-force contribution and SWEEP a rhythm/tap budget with hard rate limit to prevent faster phones winning automatically. Optionally shorten per-player pre-shot timer from 18 to 12 sec after physical testing. Add a visible next-player preview and non-scoring spectator prediction. Keep scoring based on nearest distance and inner-ring bonus unless separately approved.

**Art world.** Frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight. Palette: icy cyan, snow white, royal blue and gold. Depth order: distant background → parallax set dressing → real asset-backed play surface → collision-aligned 3D-styled obstacles → player marbles → event-driven FX → legible fixed HUD. Distinct world, common material/lighting calibration.

**Camera and game feel.** Low tracking camera following the active marble, then easing out to a high top-down house view for contact; on near-tie use clean split-screen 3 s measurement vignette; avoid misleading fake camera scale for distances. Anticipation, action, impact and reaction should be presented through short sound/lighting/camera envelopes, never blocking player input or affecting deterministic physics.

**TV HUD / phone UX.** Five-end score and hammer (last throw) indicator, aim/curl/power arrows, sweep rhythm meter, projected landing *range* only; phone big THROW/SWEEP button, side thumb curl control and short sweep coaching.

**Captain Clatter cues.** Curl choice, polished throw, short sweep call, lucky tap, hammer setup, tight measurement and end winner.

**Acceptance target.** 30 seeded 8-player-capable deterministic simulations with replay equality; no mechanic reduces fairness; scene works with all new art disabled, controls readable at 3 metres, no overlapping host/leaderboard UI, reduced motion, <15 s unengaged wait where practical.

#### Marble Golf

**Gameplay and fairness.** Propose 9 holes instead of 5 **only for a standalone Golf game**. Party Night should offer a short 3- or 5-hole playlist to avoid a 20+ minute interruption; preserve external Party Points. Include windmill, flipping gate, tunnel, raised ramp, loop and deliberately readable slope fields; moving obstacle timing must be deterministic and evaluated in simulation rather than renderer. Limit shot preview to first bounce and display a ghost best *shot position* only when recorded fairly. Keep a max-strokes policy; add clearer rescue options for repeated water traps.

**Art world.** Lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup. Palette: mint green, tangerine, racing red and sunshine gold. Depth order: distant background → parallax set dressing → real asset-backed play surface → collision-aligned 3D-styled obstacles → player marbles → event-driven FX → legible fixed HUD. Distinct world, common material/lighting calibration.

**Camera and game feel.** One 2.5–3 s flythrough per new hole, smooth chase while rolling, pullback on bends, snap to cup reveal and hole-in-one flash without eye-straining bloom; avoid camera movement during active aim if it reduces control clarity. Anticipation, action, impact and reaction should be presented through short sound/lighting/camera envelopes, never blocking player input or affecting deterministic physics.

**TV HUD / phone UX.** Large hole number/par/shot count, current turn, score differential and target cup, accessible slope cues; phone one-thumb angle/power and big SHOOT, hold-to-preview with limited path reveal.

**Captain Clatter cues.** Hole preview, windmill warning, ramp launch, banked shot, narrow miss, hole in one, score comeback and trophy.

**Acceptance target.** 30 seeded 8-player-capable deterministic simulations with replay equality; no mechanic reduces fairness; scene works with all new art disabled, controls readable at 3 metres, no overlapping host/leaderboard UI, reduced motion, <15 s unengaged wait where practical.

### 16.4 Shared architecture and implementation contract

1. **Simulation** (`src/modes/<mode>.js`): seeded RNG only, fixed-step tick, stable event IDs and event payloads `{seq, kind, t, x, y, intensity, ownerId}` as applicable. Emit once when a real rules event occurs, not inside draw. No Date.now/Math.random in rules. Deterministic rotating hazards use seeded phase or accumulated simulation clock.

2. **Presentation** (`src/modes/registry.js`, future `src/party-renderer.js`): load `IMG[assetKey]`; `drawSprite()` returns `false` on missing art, triggering Canvas fallback. No new sprite may replace a collision shape without aligned physics bounds. Adopt 3/4 miniature camera projection, contact shadow and glass specular material, but retain invariant simulation-space coordinate transforms.

3. **Camera/VFX**: consume immutable event snapshots; screen-shake, lens ease and particles use rendering state only; reduced-motion substitutes glow/colour for movement. Deterministic game logic replay must be bit-for-bit identical with full FX and FX disabled.

4. **Asset build**: add explicit `^pp_(derby|dropzone|brawl|curling|golf)_(bg|results)_` 1920×1080, `^pp_.*_surface_` 1024 square repeatable, and `^pp_.*_(prop|obstacle|fx|clatter)_` transparent sized according to manifest. Existing `tools/build.js` has no pp-specific rules. The existing image loading manifest is valid and avoids a requirement for images at run time.

5. **Sound**: implement one voice bus distinct from SFX, priority ducking -8 dB, `stop()` on screen transition, small clean fade and noise gate; guarantee no looped full intro voice. Music 128 BPM / D major, but never keep the same repetitive loud bed through every game. Background Music and Creative Claw are not graphical sources. `play(k)` should use new mode-specific file when present, controlled fallback when absent.

6. **Host return**: top-right buttons can obscure the Grand Prix standings. Place a non-obscuring, deliberately tested exit in each mode, confirm click hit-test and phone host exit, cancel pending audio and clear unfinished Party Night only when the host elects to leave.

7. **Milestones**: Phase 2 modifies rules and behaviour, Phase 3 ChatGPT art batches and contact sheets, Phase 4 visual integration/camera/VFX, Phase 5 Creative Claw audio and voice plus game feel, Phase 6 responsive QA/performance, Phase 7 acceptance. Later phase details require explicit approval; do not create them prematurely.

### 16.5 Asset IMAGE MANIFEST — 90 ChatGPT images (planning only)

All prompts below inherit this exact mandatory suffix: **“MARBLE RUSH master §8.1 premium stylised 3D miniature tabletop diorama; chunky rounded toy forms; warm golden key light top-left; cool blue rim light right; soft ambient occlusion; shallow depth of field; clean silhouette; palette from §8.4; no text, letters, numbers, logos, emblems, watermarks, or typography; no extra inset panels; no real humans; family-friendly ages 5–95.”** For *transparent* entries add “isolated with transparent background, centred, at least 8% clear margin, no baked floor/contact shadow”; for *background* entries add “1920×1080, soft darker calm centre, ornate edges/top, suitable for 3 m TV viewing”; for *surface* add “seamless/tileable orthographic texture, evenly lit, no cast shadows.”

**Note:** image prompts describe **visual-only** artefacts. Rules, score numbers, labels, safety borders, arrows and screen titles are generated in code. Dimensions are desired source exports before resizing; transparent props use PNG with alpha. Filenames are exact planned source keys.

| Filename | Purpose | Size | Transparency | Layer | Full subject prompt (plus universal suffix above) |

|---|---|---|---|---|---|

| `pp_derby_bg_stage.png` | Miniature world panorama | 1920×1080 | No | background | Wide cinematic establishing background of Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; broad uncluttered central play area, rich edge detail, slight perspective tilt-shift, no foreground gameplay board. |

| `pp_derby_surface_main.png` | Tileable active playfield material | 1024×1024 | No | surface | Seamless physically believable top-surface material of Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; macro fibre/grain/micro-scratches, neutral lighting ready for projected shadows, repeatable, no props. |

| `pp_derby_results_bg.png` | Results ceremony background | 1920×1080 | No | background | Cinematic miniature trophy ceremony environment in Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; elegant vacant central podium region for dynamic code drawn score and names, no built-in text. |

| `pp_derby_prop_victorian_grandstand.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale victorian grandstand belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_brass_finish_arch.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale brass finish arch belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_starting_gates.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale starting gates belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_toy_spectator_group.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy spectator group belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_flag_bunting.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale flag bunting belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_trophy_pavilion.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale trophy pavilion belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_scoreboard_frame.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale scoreboard frame belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_prop_turf_flowerpots.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale turf flowerpots belonging to Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_derby_obstacle_hurdle.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive hurdle used in a Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_derby_obstacle_mud_bank.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive mud bank used in a Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_derby_fx_speed_streak.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: speed streak in the materials and colours of Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_derby_fx_cheer_confetti.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: cheer confetti in the materials and colours of Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_derby_fx_photo_flash.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: photo flash in the materials and colours of Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_derby_clatter_announce.png` | Captain Clatter themed announcement pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, big eyes, cream handlebar moustache, tweed flat cap, vintage headset and white-gloved hands; enthusiastic game-show announcing pose with tiny derby themed accessory; preserve the same face/cap/character identity. |

| `pp_derby_clatter_win.png` | Captain Clatter victory pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, cream handlebar moustache, tweed flat cap and headset, white gloves, no legs; delighted victory gesture with game-inspired derby prop; same approved proportions and outfit. |

| `pp_dropzone_bg_stage.png` | Miniature world panorama | 1920×1080 | No | background | Wide cinematic establishing background of grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; broad uncluttered central play area, rich edge detail, slight perspective tilt-shift, no foreground gameplay board. |

| `pp_dropzone_surface_main.png` | Tileable active playfield material | 1024×1024 | No | surface | Seamless physically believable top-surface material of grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; macro fibre/grain/micro-scratches, neutral lighting ready for projected shadows, repeatable, no props. |

| `pp_dropzone_results_bg.png` | Results ceremony background | 1920×1080 | No | background | Cinematic miniature trophy ceremony environment in grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; elegant vacant central podium region for dynamic code drawn score and names, no built-in text. |

| `pp_dropzone_prop_walnut_cabinet.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale walnut cabinet belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_top_marble_chute.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale top marble chute belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_copper_gear_cluster.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale copper gear cluster belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_glass_jackpot_bucket.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale glass jackpot bucket belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_hanging_stage_lamp.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale hanging stage lamp belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_tiny_toy_operator.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale tiny toy operator belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_brass_side_trim.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale brass side trim belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_prop_gem_basket.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale gem basket belonging to grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_dropzone_obstacle_gold_multiplier_peg.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive gold multiplier peg used in a grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_dropzone_obstacle_moving_jackpot_gate.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive moving jackpot gate used in a grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_dropzone_fx_peg_sparks.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: peg sparks in the materials and colours of grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_dropzone_fx_jackpot_rays.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: jackpot rays in the materials and colours of grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_dropzone_fx_gem_cascade.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: gem cascade in the materials and colours of grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_dropzone_clatter_announce.png` | Captain Clatter themed announcement pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, big eyes, cream handlebar moustache, tweed flat cap, vintage headset and white-gloved hands; enthusiastic game-show announcing pose with tiny dropzone themed accessory; preserve the same face/cap/character identity. |

| `pp_dropzone_clatter_win.png` | Captain Clatter victory pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, cream handlebar moustache, tweed flat cap and headset, white gloves, no legs; delighted victory gesture with game-inspired dropzone prop; same approved proportions and outfit. |

| `pp_brawl_bg_stage.png` | Miniature world panorama | 1920×1080 | No | background | Wide cinematic establishing background of wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; broad uncluttered central play area, rich edge detail, slight perspective tilt-shift, no foreground gameplay board. |

| `pp_brawl_surface_main.png` | Tileable active playfield material | 1024×1024 | No | surface | Seamless physically believable top-surface material of wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; macro fibre/grain/micro-scratches, neutral lighting ready for projected shadows, repeatable, no props. |

| `pp_brawl_results_bg.png` | Results ceremony background | 1920×1080 | No | background | Cinematic miniature trophy ceremony environment in wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; elegant vacant central podium region for dynamic code drawn score and names, no built-in text. |

| `pp_brawl_prop_wooden_coliseum.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale wooden coliseum belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_toy_crowd_stand.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy crowd stand belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_brass_arena_gate.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale brass arena gate belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_champion_podium.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale champion podium belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_red_banner.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale red banner belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_torch_lantern.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale torch lantern belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_toy_drummer.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy drummer belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_prop_arena_stanchion.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale arena stanchion belonging to wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_brawl_obstacle_spring_bumper.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive spring bumper used in a wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_brawl_obstacle_crumbling_rim_tile.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive crumbling rim tile used in a wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_brawl_fx_impact_sparks.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: impact sparks in the materials and colours of wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_brawl_fx_knockout_poof.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: knockout poof in the materials and colours of wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_brawl_fx_final_duel_rays.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: final duel rays in the materials and colours of wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_brawl_clatter_announce.png` | Captain Clatter themed announcement pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, big eyes, cream handlebar moustache, tweed flat cap, vintage headset and white-gloved hands; enthusiastic game-show announcing pose with tiny brawl themed accessory; preserve the same face/cap/character identity. |

| `pp_brawl_clatter_win.png` | Captain Clatter victory pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, cream handlebar moustache, tweed flat cap and headset, white gloves, no legs; delighted victory gesture with game-inspired brawl prop; same approved proportions and outfit. |

| `pp_curling_bg_stage.png` | Miniature world panorama | 1920×1080 | No | background | Wide cinematic establishing background of frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; broad uncluttered central play area, rich edge detail, slight perspective tilt-shift, no foreground gameplay board. |

| `pp_curling_surface_main.png` | Tileable active playfield material | 1024×1024 | No | surface | Seamless physically believable top-surface material of frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; macro fibre/grain/micro-scratches, neutral lighting ready for projected shadows, repeatable, no props. |

| `pp_curling_results_bg.png` | Results ceremony background | 1920×1080 | No | background | Cinematic miniature trophy ceremony environment in frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; elegant vacant central podium region for dynamic code drawn score and names, no built-in text. |

| `pp_curling_prop_pine_lodge.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale pine lodge belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_snow_pine_group.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale snow pine group belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_wooden_score_pavilion.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale wooden score pavilion belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_warm_lantern.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale warm lantern belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_ice_boundary_stones.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale ice boundary stones belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_mountain_bridge.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale mountain bridge belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_toy_spectator_scarves.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy spectator scarves belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_prop_miniature_ice_broom.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale miniature ice broom belonging to frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_curling_obstacle_curling_house_rim.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive curling house rim used in a frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_curling_obstacle_ice_mound.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive ice mound used in a frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_curling_fx_ice_shavings.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: ice shavings in the materials and colours of frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_curling_fx_sweep_snow.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: sweep snow in the materials and colours of frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_curling_fx_measurement_glow.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: measurement glow in the materials and colours of frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_curling_clatter_announce.png` | Captain Clatter themed announcement pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, big eyes, cream handlebar moustache, tweed flat cap, vintage headset and white-gloved hands; enthusiastic game-show announcing pose with tiny curling themed accessory; preserve the same face/cap/character identity. |

| `pp_curling_clatter_win.png` | Captain Clatter victory pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, cream handlebar moustache, tweed flat cap and headset, white gloves, no legs; delighted victory gesture with game-inspired curling prop; same approved proportions and outfit. |

| `pp_golf_bg_stage.png` | Miniature world panorama | 1920×1080 | No | background | Wide cinematic establishing background of lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; broad uncluttered central play area, rich edge detail, slight perspective tilt-shift, no foreground gameplay board. |

| `pp_golf_surface_main.png` | Tileable active playfield material | 1024×1024 | No | surface | Seamless physically believable top-surface material of lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; macro fibre/grain/micro-scratches, neutral lighting ready for projected shadows, repeatable, no props. |

| `pp_golf_results_bg.png` | Results ceremony background | 1920×1080 | No | background | Cinematic miniature trophy ceremony environment in lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; elegant vacant central podium region for dynamic code drawn score and names, no built-in text. |

| `pp_golf_prop_toy_windmill.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy windmill belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_miniature_pond_bank.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale miniature pond bank belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_garden_bridge.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale garden bridge belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_flower_planter.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale flower planter belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_toy_castle_tunnel.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy castle tunnel belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_trophy_flagpole.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale trophy flagpole belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_wooden_garden_fence.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale wooden garden fence belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_prop_toy_mushroom_cluster.png` | Themed decorative prop | 768×768 | Yes | prop | One beautifully modelled isolated toy-scale toy mushroom cluster belonging to lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; clear three-quarter perspective and consistent golden/blue lighting, single standalone object. |

| `pp_golf_obstacle_flipping_gate.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive flipping gate used in a lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_golf_obstacle_loop_ramp.png` | Gameplay obstacle art | 768×768 | Yes | prop | One standalone toy-scale interactive loop ramp used in a lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; visually readable collision silhouette, distinct material thickness and colour contrast, side depth visible. |

| `pp_golf_fx_cup_starburst.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: cup starburst in the materials and colours of lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_golf_fx_water_splash.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: water splash in the materials and colours of lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_golf_fx_putt_trail.png` | One-shot particle/FX texture | 512×512 | Yes | FX | One isolated additive-looking family arcade effect: putt trail in the materials and colours of lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup; restrained polish, bright centre, feathered alpha outer edge, no background or extra props. |

| `pp_golf_clatter_announce.png` | Captain Clatter themed announcement pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, big eyes, cream handlebar moustache, tweed flat cap, vintage headset and white-gloved hands; enthusiastic game-show announcing pose with tiny golf themed accessory; preserve the same face/cap/character identity. |

| `pp_golf_clatter_win.png` | Captain Clatter victory pose | 1024×1024 | Yes | UI | Exact existing Captain Clatter reference character: racing-red/gold glass marble, cream handlebar moustache, tweed flat cap and headset, white gloves, no legs; delighted victory gesture with game-inspired golf prop; same approved proportions and outfit. |

Image-count contract: 18 per game × 5 = **90 distinct assets**, including **8 transparent themed props per game**, 2 collision-aware obstacles, 3 VFX, a background, a tileable material, a results background and 2 Clatter poses. Artwork production and visual contact sheets are reserved for Phase 3 after approval.

### 16.6 AUDIO MANIFEST — Creative Claw audio only (planning only)

Audio universal requirements: clean start (no silence); no sustained hiss or noise-floor tail; no music or speech inside SFX; seamless loop where specified; mastering target SFX peaks near −3 dB, music ~−18 LUFS, no clipping; original composition, 128 BPM in D major for any music. File source path `assets/raw/audio/`. Voice assets will use exact key names from §16.7 plus `.wav`.

| Filename | Type | Length | Description | Full Creative Claw production prompt |

|---|---|---|---|---|

| `music_party.wav` | Existing audio, reuse | 60 s | Current main Party Pack theme | **Reuse existing source; do not overwrite until a seamless beat-aligned replacement is approved.** |

| `vo_party_intro.wav` | Existing audio, reuse/edit | 9 s max segment | Current intro causes long playback; Phase 5 revoice | **Do not auto-loop. Replace with a clean short authorised Clatter intro after voice approval; no hiss tail.** |

| `sfx_ui_tap.wav` | Existing SFX, reuse | <0.3 s | Menu confirm | **Reuse existing exact key, no re-recording needed unless audit finds hiss/clipping.** |

| `sfx_bumper.wav` | Existing SFX, reuse | <0.6 s | Grand Prix/prop bump | **Preserve existing key and default behaviour.** |

| `sfx_trophy.wav` | Existing SFX, reuse | <3 s | Global win cue | **Preserve existing key and default behaviour.** |

| `mus_pp_derby_loop.wav` | Music loop | 16 bars, 30 s | Marble Derby mode-specific motif | Original seamless instrumental family arcade game-show loop at exactly 128 BPM, D major, miniature-world timbres matching Victorian miniature racecourse made of varnished mahogany, toy turf, brass rails, warm grandstand lights and bunting, memorable melody, clear submix space for announcer and glass impacts, clean seamless loop, no voices, no hiss. |

| `mus_pp_derby_sting.wav` | Music sting | 2–4 s | Dramatic mode climax | Original D major 128 BPM short premium family game-show motif for Marble Derby: build excitement → impact → happy resolve; no voices, clean ending, compatible with party loop. |

| `sfx_derby_cheer.wav` | SFX | 1.2 s | one short grandstand chant and playful brass whoop, no speech | Premium family arcade game sound, foreground focused, one short grandstand chant and playful brass whoop, no speech; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_derby_gate.wav` | SFX | 1 s | spring loaded miniature wooden gates opening with satisfying metallic snap | Premium family arcade game sound, foreground focused, spring loaded miniature wooden gates opening with satisfying metallic snap; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_derby_photo.wav` | SFX | 1.1 s | single camera shutter plus bright glass bell, no sustained noise | Premium family arcade game sound, foreground focused, single camera shutter plus bright glass bell, no sustained noise; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_derby_payout.wav` | SFX | 2.2 s | sparkly cascade of toy glass gems and a warm brass success sting | Premium family arcade game sound, foreground focused, sparkly cascade of toy glass gems and a warm brass success sting; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `mus_pp_dropzone_loop.wav` | Music loop | 16 bars, 30 s | Drop Zone mode-specific motif | Original seamless instrumental family arcade game-show loop at exactly 128 BPM, D major, miniature-world timbres matching grand upright brass-and-walnut arcade plinko cabinet in a miniature carnival workshop, glowing glass pegs, jewel bins and moving golden mechanisms, memorable melody, clear submix space for announcer and glass impacts, clean seamless loop, no voices, no hiss. |

| `mus_pp_dropzone_sting.wav` | Music sting | 2–4 s | Dramatic mode climax | Original D major 128 BPM short premium family game-show motif for Drop Zone: build excitement → impact → happy resolve; no voices, clean ending, compatible with party loop. |

| `sfx_drop_release.wav` | SFX | 0.45 s | single crisp glass marble released from miniature chrome chute, soft spring pop | Premium family arcade game sound, foreground focused, single crisp glass marble released from miniature chrome chute, soft spring pop; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_drop_peg.wav` | SFX | 0.2 s | clean bright glass-on-brass peg tap, four optional pitch variants should be recorded later | Premium family arcade game sound, foreground focused, clean bright glass-on-brass peg tap, four optional pitch variants should be recorded later; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_drop_multiplier.wav` | SFX | 1 s | jubilant sparkling chime for a gold multiplier peg | Premium family arcade game sound, foreground focused, jubilant sparkling chime for a gold multiplier peg; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_drop_jackpot.wav` | SFX | 2.8 s | triumphant cascading gemstones with short brass hit; no hiss tail | Premium family arcade game sound, foreground focused, triumphant cascading gemstones with short brass hit; no hiss tail; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `mus_pp_brawl_loop.wav` | Music loop | 16 bars, 30 s | Bowl Brawl mode-specific motif | Original seamless instrumental family arcade game-show loop at exactly 128 BPM, D major, miniature-world timbres matching wooden toy coliseum with carved spectator tiers, lacquered fighting bowl, brass rim, miniature banners and warm arena spotlights, memorable melody, clear submix space for announcer and glass impacts, clean seamless loop, no voices, no hiss. |

| `mus_pp_brawl_sting.wav` | Music sting | 2–4 s | Dramatic mode climax | Original D major 128 BPM short premium family game-show motif for Bowl Brawl: build excitement → impact → happy resolve; no voices, clean ending, compatible with party loop. |

| `sfx_brawl_ram.wav` | SFX | 0.5 s | weighty but friendly polished glass marble body-check, warm wooden thud and short chrome impact | Premium family arcade game sound, foreground focused, weighty but friendly polished glass marble body-check, warm wooden thud and short chrome impact; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_brawl_ko.wav` | SFX | 1.35 s | toy audience gasp and tiny percussive knockout flourish, clean ending | Premium family arcade game sound, foreground focused, toy audience gasp and tiny percussive knockout flourish, clean ending; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_brawl_ring.wav` | SFX | 1 s | deep wooden rim wobble and gentle bell, no harsh frequencies | Premium family arcade game sound, foreground focused, deep wooden rim wobble and gentle bell, no harsh frequencies; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_brawl_duel.wav` | SFX | 2 s | quick gladiator-style toy brass sting for last two remaining | Premium family arcade game sound, foreground focused, quick gladiator-style toy brass sting for last two remaining; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `mus_pp_curling_loop.wav` | Music loop | 16 bars, 30 s | Marble Curling mode-specific motif | Original seamless instrumental family arcade game-show loop at exactly 128 BPM, D major, miniature-world timbres matching frozen alpine lake curling rink at blue hour with frosted glass ice, miniature pine lodge, snowbound fences and warm firelight, memorable melody, clear submix space for announcer and glass impacts, clean seamless loop, no voices, no hiss. |

| `mus_pp_curling_sting.wav` | Music sting | 2–4 s | Dramatic mode climax | Original D major 128 BPM short premium family game-show motif for Marble Curling: build excitement → impact → happy resolve; no voices, clean ending, compatible with party loop. |

| `sfx_curl_sweep.wav` | SFX | 0.35 s | soft dry brush sweeping icy rink with a crisp rhythmic whoosh, no steady hiss | Premium family arcade game sound, foreground focused, soft dry brush sweeping icy rink with a crisp rhythmic whoosh, no steady hiss; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_curl_release.wav` | SFX | 0.48 s | polished marble released onto smooth frosted ice, subtle sliding scrape | Premium family arcade game sound, foreground focused, polished marble released onto smooth frosted ice, subtle sliding scrape; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_curl_collision.wav` | SFX | 0.55 s | two heavy glass stones tapping together with satisfying crystalline ring | Premium family arcade game sound, foreground focused, two heavy glass stones tapping together with satisfying crystalline ring; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_curl_measure.wav` | SFX | 1.5 s | quiet anticipatory bell and twinkling icy resolve for close measurement | Premium family arcade game sound, foreground focused, quiet anticipatory bell and twinkling icy resolve for close measurement; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `mus_pp_golf_loop.wav` | Music loop | 16 bars, 30 s | Marble Golf mode-specific motif | Original seamless instrumental family arcade game-show loop at exactly 128 BPM, D major, miniature-world timbres matching lush tabletop crazy-golf miniature garden with felt turf greens, polished wood rails, red windmill, toy pond, tiny flowers and brass cup, memorable melody, clear submix space for announcer and glass impacts, clean seamless loop, no voices, no hiss. |

| `mus_pp_golf_sting.wav` | Music sting | 2–4 s | Dramatic mode climax | Original D major 128 BPM short premium family game-show motif for Marble Golf: build excitement → impact → happy resolve; no voices, clean ending, compatible with party loop. |

| `sfx_golf_putt.wav` | SFX | 0.5 s | bright concise glass marble struck gently by a miniature wooden putter with felt scuff | Premium family arcade game sound, foreground focused, bright concise glass marble struck gently by a miniature wooden putter with felt scuff; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_golf_bounce.wav` | SFX | 0.4 s | friendly glass ball bouncing on polished garden wood rail | Premium family arcade game sound, foreground focused, friendly glass ball bouncing on polished garden wood rail; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_golf_cup.wav` | SFX | 1.45 s | ball dropping into polished brass cup with happy rising bell flourish | Premium family arcade game sound, foreground focused, ball dropping into polished brass cup with happy rising bell flourish; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

| `sfx_golf_holeinone.wav` | SFX | 2.7 s | short joyful brass fanfare, bells and sparkling toy confetti for hole in one | Premium family arcade game sound, foreground focused, short joyful brass fanfare, bells and sparkling toy confetti for hole in one; tactile glass/wood/chrome materials and detailed micro-transients; mono compatible, dry close-miked centre, begin at sample zero, zero clipped peaks, clean silent end, no hiss, no words or music. |

**Voice source requirement:** For each `vo_pp_<mode>_NN.wav` below, produce exactly the given script as one dry, 1–3-second voice line, warm Lancashire accent, mid-low resonant Captain Clatter tone, smiling excitable (not manic), consistent microphone and loudness; no background audio, no breath/hiss tail, never invent text. If long enough to overlap the next call, shorten the line rather than mixing both. Playback must enforce one speaker and priority/cooldown.

### 16.7 Captain Clatter voice lines — 70 short scripts

| Filename | Mode | Spoken line | Trigger / priority |

|---|---|---|---|

| `vo_pp_derby_01.wav` | Marble Derby | “Welcome to the Derby! Six sparkling speedsters, one glorious winner!” | `mode_open` / high |

| `vo_pp_derby_02.wav` | Marble Derby | “Look at that form guide. Pick wisely!” | `choices` / low |

| `vo_pp_derby_03.wav` | Marble Derby | “Gems on the table, all just for fun!” | `ready` / low |

| `vo_pp_derby_04.wav` | Marble Derby | “The gates are twitching. We are nearly off!” | `launch` / high |

| `vo_pp_derby_05.wav` | Marble Derby | “And they are away!” | `action` / low |

| `vo_pp_derby_06.wav` | Marble Derby | “Rocket is gathering steam!” | `impact` / normal |

| `vo_pp_derby_07.wav` | Marble Derby | “Comet has found another gear!” | `play_progress` / low |

| `vo_pp_derby_08.wav` | Marble Derby | “Get those cheers in, folks!” | `feature` / low |

| `vo_pp_derby_09.wav` | Marble Derby | “The final bend could change everything!” | `feature_2` / low |

| `vo_pp_derby_10.wav` | Marble Derby | “A late surge! That has shaken things up!” | `late_drama` / normal |

| `vo_pp_derby_11.wav` | Marble Derby | “I cannot separate those two! Photo finish!” | `close_finish` / high |

| `vo_pp_derby_12.wav` | Marble Derby | “That is a lovely little haul of gems!” | `award` / normal |

| `vo_pp_derby_13.wav` | Marble Derby | “The crowd are on their feet!” | `final_action` / low |

| `vo_pp_derby_14.wav` | Marble Derby | “That was a cracker of a heat!” | `victory` / high |

| `vo_pp_dropzone_01.wav` | Drop Zone | “Welcome to Drop Zone, where every bounce counts!” | `mode_open` / high |

| `vo_pp_dropzone_02.wav` | Drop Zone | “Pick your lane. Think before you drop!” | `choices` / low |

| `vo_pp_dropzone_03.wav` | Drop Zone | “Here comes a brave little marble!” | `ready` / low |

| `vo_pp_dropzone_04.wav` | Drop Zone | “Ooh, straight into the brass pegs!” | `launch` / high |

| `vo_pp_dropzone_05.wav` | Drop Zone | “That golden peg could be worth a fortune in points!” | `action` / low |

| `vo_pp_dropzone_06.wav` | Drop Zone | “The multiplier is lit!” | `impact` / normal |

| `vo_pp_dropzone_07.wav` | Drop Zone | “Steady now, the jackpot bucket is moving!” | `play_progress` / low |

| `vo_pp_dropzone_08.wav` | Drop Zone | “Look at that last bounce!” | `feature` / low |

| `vo_pp_dropzone_09.wav` | Drop Zone | “A cheeky deflection!” | `feature_2` / low |

| `vo_pp_dropzone_10.wav` | Drop Zone | “Right into the big-money pocket!” | `late_drama` / normal |

| `vo_pp_dropzone_11.wav` | Drop Zone | “The whole board is glowing!” | `close_finish` / high |

| `vo_pp_dropzone_12.wav` | Drop Zone | “That is a monster score!” | `award` / normal |

| `vo_pp_dropzone_13.wav` | Drop Zone | “Last drop of the round! Make it count!” | `final_action` / low |

| `vo_pp_dropzone_14.wav` | Drop Zone | “An absolute avalanche of points!” | `victory` / high |

| `vo_pp_brawl_01.wav` | Bowl Brawl | “Welcome to Bowl Brawl! Hold your nerve!” | `mode_open` / high |

| `vo_pp_brawl_02.wav` | Bowl Brawl | “Find your rival and line up that ram!” | `choices` / low |

| `vo_pp_brawl_03.wav` | Bowl Brawl | “Anchor yourself, or risk the rim!” | `ready` / low |

| `vo_pp_brawl_04.wav` | Bowl Brawl | “That marble has some serious momentum!” | `launch` / high |

| `vo_pp_brawl_05.wav` | Bowl Brawl | “Oof! What a collision!” | `action` / low |

| `vo_pp_brawl_06.wav` | Bowl Brawl | “The crowd felt that one!” | `impact` / normal |

| `vo_pp_brawl_07.wav` | Bowl Brawl | “The arena is getting smaller!” | `play_progress` / low |

| `vo_pp_brawl_08.wav` | Bowl Brawl | “Mind the crumbling edge!” | `feature` / low |

| `vo_pp_brawl_09.wav` | Bowl Brawl | “A bumper has changed the whole fight!” | `feature_2` / low |

| `vo_pp_brawl_10.wav` | Bowl Brawl | “There goes another contender!” | `late_drama` / normal |

| `vo_pp_brawl_11.wav` | Bowl Brawl | “Two left! This is the showdown!” | `close_finish` / high |

| `vo_pp_brawl_12.wav` | Bowl Brawl | “What a glorious last-second save!” | `award` / normal |

| `vo_pp_brawl_13.wav` | Bowl Brawl | “One marble to rule the bowl!” | `final_action` / low |

| `vo_pp_brawl_14.wav` | Bowl Brawl | “A knockout worthy of the trophy cabinet!” | `victory` / high |

| `vo_pp_curling_01.wav` | Marble Curling | “It is a lovely evening on the ice!” | `mode_open` / high |

| `vo_pp_curling_02.wav` | Marble Curling | “Aim carefully. Every inch matters!” | `choices` / low |

| `vo_pp_curling_03.wav` | Marble Curling | “That stone is away and gliding!” | `ready` / low |

| `vo_pp_curling_04.wav` | Marble Curling | “Sweep, sweep, sweep!” | `launch` / high |

| `vo_pp_curling_05.wav` | Marble Curling | “Mind the curl on that one!” | `action` / low |

| `vo_pp_curling_06.wav` | Marble Curling | “A lovely gentle nudge!” | `impact` / normal |

| `vo_pp_curling_07.wav` | Marble Curling | “The house is getting crowded!” | `play_progress` / low |

| `vo_pp_curling_08.wav` | Marble Curling | “That is a perfectly placed stone!” | `feature` / low |

| `vo_pp_curling_09.wav` | Marble Curling | “The last stone is the hammer!” | `feature_2` / low |

| `vo_pp_curling_10.wav` | Marble Curling | “What a delicate bit of tactics!” | `late_drama` / normal |

| `vo_pp_curling_11.wav` | Marble Curling | “We might need a closer look!” | `close_finish` / high |

| `vo_pp_curling_12.wav` | Marble Curling | “It is measuring time!” | `award` / normal |

| `vo_pp_curling_13.wav` | Marble Curling | “That end is going to be tight!” | `final_action` / low |

| `vo_pp_curling_14.wav` | Marble Curling | “A cool-headed champion!” | `victory` / high |

| `vo_pp_golf_01.wav` | Marble Golf | “Welcome to the craziest golf garden in town!” | `mode_open` / high |

| `vo_pp_golf_02.wav` | Marble Golf | “Take a look at this beautiful hole!” | `choices` / low |

| `vo_pp_golf_03.wav` | Marble Golf | “Aim your putt. A little touch goes a long way!” | `ready` / low |

| `vo_pp_golf_04.wav` | Marble Golf | “The windmill is turning!” | `launch` / high |

| `vo_pp_golf_05.wav` | Marble Golf | “Watch out for that pond!” | `action` / low |

| `vo_pp_golf_06.wav` | Marble Golf | “That is a clever bank shot!” | `impact` / normal |

| `vo_pp_golf_07.wav` | Marble Golf | “Ooh, the gate nearly caught it!” | `play_progress` / low |

| `vo_pp_golf_08.wav` | Marble Golf | “Through the tunnel! Lovely stuff!” | `feature` / low |

| `vo_pp_golf_09.wav` | Marble Golf | “Right round the loop!” | `feature_2` / low |

| `vo_pp_golf_10.wav` | Marble Golf | “So close to the cup!” | `late_drama` / normal |

| `vo_pp_golf_11.wav` | Marble Golf | “An absolute beauty of a putt!” | `close_finish` / high |

| `vo_pp_golf_12.wav` | Marble Golf | “Hole in one! You little superstar!” | `award` / normal |

| `vo_pp_golf_13.wav` | Marble Golf | “This hole could decide the match!” | `final_action` / low |

| `vo_pp_golf_14.wav` | Marble Golf | “And that is one magnificent round of Marble Golf!” | `victory` / high |

**Voice dispatch rules**: Clatter speaks only when the game-state trigger matches, maximum one line at a time, no queuing beyond the current event, at least 6 s between ordinary lines, no repetitive line for 60 s; high priority may pre-empt via 120 ms fade. Mode transitions stop all speech and return music to normal. The 14 voice lines per mode are **scripts** only; voice files do not yet exist.

### 16.8 Test and acceptance matrix for the next phases

| Gate | Exact acceptance condition | Phase |

|---|---|---|

| Old regressions | Existing `npm run test:party`, `test:dropzone`, `test:brawl`, `test:derby`, `test:curling`; `tests/phase7-golf.test.js`; `tools/test-phase8-integration.js`; Grand Prix regression. Use actual available file path: check test file names rather than silently assuming those exact package aliases exist. | 2–6 |

| Replay identity | For each of 30 fixed seeds per game, player order and score records exactly match replay with FX on/off and after restart; no Math.random in gameplay. | 2 |

| 8-player capacity | 1–8 or 2–8 according to mode, 30 seeded full CPU games, invalid actions refused; winner variance and win spreads logged. | 2 |

| Art alpha | All 90 PNG keys exist; dimensions/alpha/transparent rules validated; missing sprite yields a visually coherent fallback. No game-name text in images. | 3–4 |

| No overlap | Back button does not intersect leaderboard, controls, camera subject or phone host panel at 1920×1080, 1366×768, 720p and portrait controllers; browser pointer-hit tests. | 4–6 |

| Sound hygiene | One voice at a time, transition stop <200 ms, no looped intro, no audible hiss tail, sound mute works, no game affects existing Grand Prix audio. | 5 |

| Accessibility | 3-m sofa readability, colour+shape token IDs, high contrast, colour-blind friendly, reduced-motion effects, touch targets ≥48 px. | 4–6 |

| Performance | Target ≥55 fps at 1080p TV baseline, ≥30 fps lower tier; deterministic under different FPS; no memory growth over full Party Night. | 6 |

| Physical multiplayer | Two–four real phones join and return; stable gamepad actions, reconnect/rejoin, complete Party Night, narrator/audio on TV. | 6–7 |

### 16.9 Phase 1 review decisions required

**Decision A:** Golf standalone expands to nine holes, but Party Night uses three or five holes to keep its duration reasonable. **Decision B:** Derby keeps virtual gems and not actual wagering; odds lock at bet-time, and cheering is one capped decision. **Decision C:** Brawl hazards are deterministic and signalled in advance; no random rule changes during a round. **Decision D:** Curling adds curl/spin and rate-limited sweep, with proposed 12-second aim timer (subject to real-phone QA). **Decision E:** Drop Zone introduces multiplier/jackpot pegs with an explicit 2× cap and preview to first peg only. No changes should start before these decisions are approved.

**Phase 1 STOP GATE.** Provide this updated complete master file, audit report and manifests for review; do not generate images/audio, modify game code, merge or deploy. Await explicit: **“Approved — start Phase 2.”**
