# REVIEW v3b: Editorial redesign (FYI for Claude)
Dennis approved going live without a pre-launch review. This file is a summary only. Branch `v3b-redesign`, merged into `main` on 7 Oct 2026.

## What changed (look only)
Spec: `/workspace/muse/closet-review-v3/review.md` §1–4, §10 and slices 1–8.
1. **Tokens.** Ivory `#f4f1ec`, ink `#0f0e0d`, oxblood `#5a1a1f` (AI actions, active nav bar and tags only), champagne `#a8875a` for decoration only, `#c9b48a` for text on black. The old v2 token names now point to the new values. Corners are square everywhere; only swatches, the shutter and the spinner stay round.
2. **Type.** Bodoni Moda and Geist are self-hosted (OFL) in `fonts/`. Fraunces and Jakarta were removed.
3. **Structure.** Each tab has an issue header ("Nº 07 · October / The Wardrobe Issue" and so on). The mastheads are in Bodoni with an italic second word. Sections are numbered "01…07". Privacy is set as a pull-quote. Onboarding uses a black cover.
4. **Controls.** The chip grid is ruled with hairlines. Buttons are ruled caps at 52/44 px, icon buttons are square, the nav is full-width with an oxblood top bar, and the feedback button is square.
5. **Tiles.** Photo tiles are 3:4 on a stone gradient with a double drop-shadow, a number, a Bodoni name and caps meta. The 12 demo items are now real photos in `img/demo/*.webp` (about 520 KB in total). Existing installs move their old SVG demo items over to the photos automatically; only `demo_N` items whose image is still an SVG are touched. Add pieces now opens with a guided photo tip and a dashed frame.
6. **Item tilt.** `photo3d.js` (adapted from Muse) is a depth-parallax tilt with a moving contact shadow and a masked sheen. Under reduced motion it does not auto-tilt, but dragging still works. If 3D transforms are not supported, the flat view stays.
7. **Dress Me.** Shows a flat-lay outfit made from the picked pieces, with tilt. The AI try-on (IDM-VTON/Leffa in `tryon.js`) is unchanged. When an AI result exists it is shown with a "preview" badge, and a **Flat-lay view / Show AI try-on** toggle switches between the two.
8. **Carousels (required).** `carousel.js` adds:
   - **Closet:** a CSS 3D ring of up to 8 cards that drifts at −9°/s, turns at 0.35°/px when dragged, and keeps inertia. Tapping a card opens the item.
   - **Ideas:** each look is a tilted 3-card stack.
   - **Flat fallback** (snap-scroll row and flat cards) when any of these apply: reduced motion, no `preserve-3d`, Save-Data, deviceMemory ≤ 2 GB, ≤ 2 cores, slow frames in the first second, or `localStorage.flat_fx='1'`.
   - **Stock photo:** a flat-lay at the top of Ideas, labelled "Stock photo · for mood only".

No logic changes. The name, logo, every control and every ID are kept. The service worker cache is now `closet-v3b-0`, and the new files are precached.

## Diff summary
`git diff --stat c540f22..v3b-redesign`: style.css (about +150 lines of overrides), app.js (markup and helpers), new files photo3d.js, carousel.js, img/demo/*, fonts/*, plus small edits to sw.js, index.html, manifest.json, tryon.js and extra.js (colours only).

## Tests (headless Chrome, Playwright)
- 360 and 768 px on Closet, Dress Me, Ideas, Me, the item sheet and Add pieces:
  - **0 console errors and 0 page errors.**
  - 0 text below 4.5:1 on solid backgrounds.
  - No horizontal scroll.
- **Tap targets:** every control is at least 44 px, except the carousel cards that are turned edge-on at the back of the ring. Those are not focusable (tabIndex −1) and turn to the front when you swipe.
- **Reduced motion:** carousel and stacks go flat, nothing auto-tilts, and dragging still works.
- **AI try-on:** stubbed as a finished result. The AI badge shows, and flat-lay ↔ AI toggles both ways. The real Hugging Face call was not run.
- **Screenshots:** `screenshots/v3b/before-*` and `after-*`, plus `after-rm-*` for reduced motion.

## Photo licences
See `img/demo/credits.json`. The credits are visible in **Me → 07 Photo credits** and as a credit line under the Closet grid.
- **CC0:** tee, tank, skirt, shorts, jacket (The Met), sneakers and bag (rawpixel/Flickr via Openverse); the stock flat-lay by Toa Heftiba.
- **Unsplash Licence:** jeans.
- **CC BY-SA:**
  - knit: Joan Rocaguinard, 3.0
  - plimsolls: MarnieP 29, 4.0
  - lace-ups: HeavyTaste Australia, 3.0
  - sailor cap: Édouard Hue, 3.0

  These carry visible credit, a licence link and "background removed, cropped". The cut-outs are shared under the same licence.
- All photos are of garments only. No model or person is visible (the tee photo has the skin masked out). No brand logos.

## Needs real-phone testing
- **iOS Safari:**
  - `preserve-3d` ring and `mask` sheen (uses the -webkit- prefix)
  - pointer capture
  - webp with alpha (iOS 14+)
  - safe-area nav
- **Older Android:** carousel frame rate (the auto-fallback threshold is a guess), and memory with many tilt layers.
- The real AI try-on round trip on a phone.
