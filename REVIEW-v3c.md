# REVIEW v3c: try-on repeat/combine fixes, bigger avatar, garment upright + fit preview (FYI)
Dennis approved deploying straight to `main` (GitHub Pages). This is an FYI summary, not a gate. SW cache `closet-v3c-1`.

## Bugs found and fixed (tryon.js, app.js)
1. **Try-on "only works once"**
   - Free quota: anonymous ZeroGPU allows about 1–2 runs a day, and the local cap is 3. A top+bottom outfit uses 2, and the "prepare favourites" offer could spend the whole budget in the background. Now precompute always leaves 4 runs for her, and her own picks jump ahead of background jobs. With the HF token, 2 IDM-VTON runs in a row worked live (iOS UA, 360 px).
   - Queue could freeze for good (`busy` stuck): the HF runtime fetch had no timeout and the result cut-out wasn't time-boxed. Added an 8 s fetch timeout, a 20 s cut-out cap and a whole-job watchdog.
   - A job marked `done` whose picture was missing from IndexedDB made `fill()` crash on `r.hit.cut` and blocked any re-run. Now it's treated as new and re-queued. The cache stores ArrayBuffers instead of Blobs (iOS Safari IDB), with an in-memory fallback.
2. **Combined outfit never showed**
   - The 150 s timeout covered the whole outfit, so the bottom step got whatever time the top left over. It's now per step.
   - Live: Leffa (the only working bottoms model; CatVTON is RUNTIME_ERROR and IDM-VTON is upper-body only) returned "exceeded your ZeroGPU runs limit". The partial result now shows as one image, the AI top with a quick-fit bottom on it ("AI top + quick-fit bottom"). Flat-lay shows both pieces.
3. **Small avatar.** On phones the stage is `100svh-170px` (min 460, max 760) with narrower rails. The person fills about 97% of the stage height. AI results without a mask are cropped to the person (white-crop fallback).

## New: garment upright + key points (garment.js)
EXIF orientation is read; the browser applies it, with a manual fallback. The mask's PCA main axis deskews the piece. The best 90° turn is picked by category: tops shoulders up, bottoms waist up / leg gap down, shoes sole down and toe right, hats brim down, bags handle up. Then auto-crop.

Key points are found for each type: collar, shoulders, sleeves and hem; waist, crotch and hem; heel and toe; brim; handle. A "Looks right?" box shows them with ↺ ↻ ⇋ and Auto buttons, in Add pieces and in the item sheet. Changing the category re-runs Auto.

A quick fit preview (not AI) maps those points onto her MediaPipe pose: shoulders, hips/ankles, feet, head and hand. Older avatars get their pose worked out from the saved cut-out.

## Tests
Headless Chrome at 360×740, touch, Android and iOS UAs, mocked AI plus one live run. The repeated flow (avatar, top, try, change top, try, add pants, combine, flat-lay, back) ran with 0 page errors. Screenshots are in `screenshots/v3c/`.
