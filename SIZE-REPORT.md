# SIZE-REPORT — tracked repository artwork and build output

Inventory: GitHub `main` recursive tree at audit time, 333 tracked files (137.28 MiB total). The reported 274 MB working repository may include `.git` history and other local files that this tree does not count. **No artwork was deleted.**

## Largest tracked files

| File | Size (MiB) | Recommendation |
|---|---:|---|
| `assets/raw/pp_curling_bg.png` | 3.52 | Legacy Party Pack source; confirm no localhost QA or future use before archiving |
| `assets/raw/pp_derby_bg.png` | 3.41 | Legacy Party Pack source; confirm no localhost QA or future use before archiving |
| `assets/raw/pp_golf_bg.png` | 3.41 | Legacy Party Pack source; confirm no localhost QA or future use before archiving |
| `assets/raw/pp_dropzone_bg.png` | 3.11 | Legacy Party Pack source; confirm no localhost QA or future use before archiving |
| `assets/raw/pp_brawl_bg.png` | 3.08 | Legacy Party Pack source; confirm no localhost QA or future use before archiving |
| `assets/raw/bg_far_jungle.png` | 2.55 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_results.png` | 2.55 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_lobby.png` | 2.42 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_ice.png` | 2.32 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/logo_marblerush.png` | 2.16 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/tex_rail_ice.png` | 2.12 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_clockwork.png` | 2.07 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_candy.png` | 1.96 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_space.png` | 1.94 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_seaside.png` | 1.87 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_11.png` | 1.64 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/tex_rail_seaside.png` | 1.53 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_05.png` | 1.52 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/tex_rail_candy.png` | 1.51 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/bg_far_toybox.png` | 1.46 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_08.png` | 1.44 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_07.png` | 1.43 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_12.png` | 1.42 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/tex_rail_jungle.png` | 1.39 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/prop_space_04.png` | 1.26 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_02.png` | 1.22 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/marble_swirl_03.png` | 1.21 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/prop_clockwork_01.png` | 1.19 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/prop_space_05.png` | 1.18 | Retain original source; optimise the derived runtime WebP and verify references |
| `assets/raw/tex_rail_clockwork.png` | 1.18 | Retain original source; optimise the derived runtime WebP and verify references |

## Tracked size by area

| Area | Size (MiB) |
|---|---:|
| `assets/raw` | 130.77 |
| `assets/extras` | 3.74 |
| `public` | 1.35 |
| `src` | 0.62 |
| `tools` | 0.29 |
| `docs` | 0.19 |
| `MARBLE_RUSH_MASTER.md` | 0.14 |
| `fonts` | 0.10 |
| `.github` | 0.03 |
| `BATCH-C-ASSET-MANIFEST.json` | 0.02 |
| `assets/crucible-stadium.svg` | 0.01 |
| `server` | 0.01 |
| `BATCH-B-ASSET-MANIFEST.json` | 0.00 |
| `README.md` | 0.00 |
| `CLAUDE.md` | 0.00 |
| `PHASE3-BATCH-A-MANIFEST.json` | 0.00 |
| `PHASE2-FILE-MANIFEST.json` | 0.00 |
| `tests` | 0.00 |
| `package.json` | 0.00 |

## Candidate non-runtime / legacy art (review before removal)

The current production README says **Grand Prix only**; Party Pack and local-only QA survive for testing. The build processes **every** source image in `assets/raw/`, regardless of published mode, so archived sources can still generate public assets. `assets/extras/` is not scanned by `tools/build.js`. These are candidates for *future* selective packaging, not confirmed safe deletions.

- `assets/raw/pp_*`: 68 legacy Party Pack assets, 28.32 MiB tracked. Keep in source control for now; selectively exclude from the production *build* only after tests confirm no live/QA dependency.
- `assets/extras/*`: 4 concept/extra assets, 3.74 MiB. Not referenced by the current image pipeline; check game and tooling references before moving to an archive.
- `src/tv.html` → `public/tv.html`, `src/play.html` → `public/play.html`, `src/*.js` → inlined `public/tv.html`: build-generated copies are checked in as well as source. Existing tracked generated outputs stay tracked even after adding `.gitignore` (use a separate reviewed `git rm --cached` if desired).
- `public/assets/img/*`: four checked-in optimised WebPs were generated from source art. The production build re-creates these alongside the full image set.
- Exact Git-blob duplicates across distinct tracked paths: **0**. Semantic duplicates (same art at different resolution/format) still require visual or perceptual-hash review.

### Individual legacy candidates (no deletion authorised)

- `assets/raw/pp_curling_bg.png` — 3.52 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_bg.png` — 3.41 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_bg.png` — 3.41 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_bg.png` — 3.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_bg.png` — 3.08 MiB; Party Pack-labelled, built but not selectable in production
- `assets/extras/jungle_treasure_chest.png` — 1.15 MiB; not scanned by build
- `assets/extras/jungle_tree_frog.png` — 0.89 MiB; not scanned by build
- `assets/extras/jungle_palm_tree.png` — 0.87 MiB; not scanned by build
- `assets/extras/jungle_vine_arch.png` — 0.82 MiB; not scanned by build
- `assets/raw/pp_golf_surface_main.png` — 0.81 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_surface_main.png` — 0.73 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_surface_main.png` — 0.71 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_surface_main.png` — 0.66 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_surface_main.png` — 0.65 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_jackpot.png` — 0.21 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_confetti.png` — 0.19 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_impact.png` — 0.19 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_coins.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_confetti.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_prop_windmill.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_multiplier.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_prop_stone_bridge.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_crown.png` — 0.18 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_prop_grandstand.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_victory.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_chime.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_laurel.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_start.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_prop_hay_bales.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_prop_ice_blocks.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_finale.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_prop_alpine_lodge.png` — 0.17 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_shockwave.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_photo.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_superjackpot.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_victory.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_select.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_prop_spin_hazard.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_peg.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_holeinone.png` — 0.16 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_impact.png` — 0.15 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_prop_striped_bumper.png` — 0.14 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_target.png` — 0.14 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_cup.png` — 0.14 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_surge.png` — 0.14 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_warning.png` — 0.14 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_prop_glass_chute.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_prop_gold_bucket.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_sunset.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_sunset.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_boost.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_aurora.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_impact.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_speed.png` — 0.13 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_confetti.png` — 0.12 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_mist.png` — 0.12 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_dust.png` — 0.12 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_spin.png` — 0.12 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_shared_fx_dust.png` — 0.12 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_ko.png` — 0.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_dust.png` — 0.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_flag.png` — 0.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_sweep.png` — 0.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_ricochet.png` — 0.11 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_impact.png` — 0.10 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_roll.png` — 0.10 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_scrape.png` — 0.10 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_golf_fx_putt.png` — 0.10 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_dropzone_fx_fall.png` — 0.09 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_curling_fx_ricochet.png` — 0.09 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_derby_fx_confetti.png` — 0.08 MiB; Party Pack-labelled, built but not selectable in production
- `assets/raw/pp_brawl_fx_ricochet.png` — 0.06 MiB; Party Pack-labelled, built but not selectable in production

### Suggested next steps

1. Retain originals and check live asset-manifest references before pruning generated resources.
2. Add a production-only allowlist to `tools/build.js` in a separate PR, with browser QA confirming all ten tracks remain correct.
3. Avoid rewriting Git history without an explicit backup and approval; `.gitignore` only affects future untracked files.
