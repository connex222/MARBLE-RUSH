# MARBLE RUSH Party Pack — Phase 8 integration record

Development branch: `dev/party-pack-phase8-final-polish`. **Do not merge or deploy without acceptance.**

## Implemented in Phase 8

- Fixed a blocker inherited from Phase 7: Marble Golf was registered and tested headlessly, but absent from TV/phone gameplay routing.
- Golf now starts from the six-mode picker and Party Night, draws the five-hole course on the TV, accepts scoped phone aim/power/shoot actions, has local TV shot controls, and reports a scoreboard into the standard winner display.
- Golf host may abandon a round to the lobby; starting another mode clears the old Party Night session.
- Golf now sends per-player shot controls, hole/par, turn, power, aim and strokes on the normal phone HUD.
- Host-facing picker copy shows all six games as playable, rather than the obsolete Golf placeholder.
- Added integration regression guard so a registered game cannot silently be inaccessible.

## Verification

Run from the repository root:

```sh
npm install
node --check src/tv.js
node --check src/modes/golf.js
node tools/test-phase8-integration.js
node tests/phase7-golf.test.js
npm run test:party
npm run test:dropzone
npm run test:brawl
npm run test:derby
npm run test:curling
npm run build
```

Review the Phase 8 GitHub Actions result. Automated source checks and simulation cannot substitute for physical TV and phone acceptance.

## Visual/audio enhancement pass

- Six distinct, CSS-rendered miniature-diorama-style mode cards: glossy marbles, stage-specific palettes, stronger hierarchy and keyboard focus indication. All original approved assets, fonts and avatar bindings remain intact.
- Added original, mode-sensitive synthesised Web Audio phrases for Derby, Drop Zone, Brawl, Curling and Golf, plus tactile putt, sweep, ram, cheer and release cues. These run through the existing music/SFX toggles.
- A connected Creative Claw premium-music attempt was **blocked** on 10 November 2026 by a zero-credit balance (approximately 23 credits required); no charge was made. No external premium track has been produced or integrated.
- Proposed generated menu artwork included incorrect game titles and was deliberately **not integrated**. Only the real modes Grand Prix, Marble Derby, Drop Zone, Bowl Brawl, Marble Curling and Marble Golf are advertised.

## Outstanding gates — not certified as AAA final

1. Review actual TV and phone appearance for all six modes and complete manual browser regression.
2. Test 2–4 real phones, QR joining/rejoining, host actions, CPU players and 3/5/7 Party Night transitions.
3. Produce, approve and integrate dedicated high-quality mode-specific backgrounds, props and an externally produced premium soundtrack when available. Procedural fallback cues are already in place. Existing approved Grand Prix artwork is preserved; current Party Pack modes still use code-drawn rendering and synthesised fallback audio.
4. Check audio unlock/music toggle, volume balance, reduced-motion and legibility on TV/tablet/phone.
5. Only after those gates pass, prepare merge and Render deployment.

This is a functional integration checkpoint, not a claim of full Phase 8 art/audio or release completion.
