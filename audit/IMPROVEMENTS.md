# My Closet: audit and improvement plan
Audited 7 Oct 2026 (~15:55 SAST) against the live build https://dennisbotha-netizen.github.io/closet-app-prototype/ using headless Chrome at 360×780 @2x, plus a read of PLAN.md, research/TRYON_TEST.md, app.js, tryon.js, style.css and sw.js. **No code was changed.**
Screenshots are in `audit/01…20-*.png`, covering onboarding, closet, filters, add, item, Dress Me (empty and shuffled), save outfit, try-on with no avatar, Ideas, Me, the avatar maker, feedback, and the empty states after "Clear demo items". The walk logged no JS errors. Page width stayed at 360 px, so nothing overflows sideways.

Legend: **[B]** bug · **[UX]** flow friction · **[V]** visual polish · **[F]** feature · **[R]** try-on reliability · **[S]** safety/privacy. Everything here is free unless marked.

---
## TOP 10 (do these first)
1. **[B] Dates use UTC, not SA time.** `today()` = `toISOString()`. From 00:00 to 02:00 SAST, outfits, the "wearing it on" default, wear counts and the daily try-on counter all land on *yesterday*. Fix: build the date from local Y-M-D. This is one line.
2. **[V/UX] Floating 💬 button and toasts cover the controls.** On Dress Me the FAB sits on top of the Shuffle/Save row (09, 19). Toasts appear over sheet buttons (02, 11, 18), and "Demo items cleared" covers Save outfit. Fix: move feedback into the Me tab (or a header icon), and lift toasts above the nav and sheet actions.
3. **[UX] Adding clothes one at a time is too slow.** It takes 1 photo, then a form, then save, for every item. Getting a real closet in (50–150 pieces) is the biggest drop-off risk. Fix: `multiple` on the Gallery input, a batch queue that auto-cuts and auto-tags each photo, then a swipeable "check & fix" card stack with defaults pre-filled.
4. **[F] Free on-device auto-tagging.** Today only colour is guessed, and category always defaults to "Top". Fix: run transformers.js with a small CLIP (e.g. `Xenova/clip-vit-base-patch32`, zero-shot over "t-shirt, jeans, skirt, sneakers…") in the browser. It's free, the photo never leaves the phone, and the model is cached once. Also do pattern (striped/floral/plain) and season. Show the guesses as pre-selected chips.
5. **[R] Try-on queue, retries and honest progress.** Right now one tap blocks a sheet for 20–120 s, nothing runs in the background, and there's no retry. Proposed fix:
   - A persistent job queue in IndexedDB, so she can close the sheet, keep dressing, and get a toast or badge when the job is done.
   - Auto-retry once with backoff on "sleeping/queue" errors.
   - Fall back to the next provider (already partly there).
   - A progress bar based on the real ~25–30 s median.
   - Pre-warm the Space when Dress Me opens.
   - A "remaining today ≈ N" counter based on the 5 min/day ZeroGPU budget.
6. **[R/B] Cache key is weak.** The key uses `avatarId + item ids + img.length`, so editing a photo with the same byte length returns a stale picture. Hash the image bytes instead. Store blobs, not data-URLs, and cap the cache by LRU with a size limit. Without a cap, IndexedDB grows forever with ~1 MB PNGs. Also call `navigator.storage.persist()` so iOS/Chrome don't evict her closet.
7. **[S] Hugging Face token stored in plain localStorage, typed in the teen's own app.** Anyone holding the phone, or any injected script, can read it. The provider is also hard-coded to public Spaces whose logs and terms we don't control. Fix:
   - Short term: show a clear per-try-on consent line saying "this photo goes to Hugging Face", and never send the original photo, only the cut-out avatar with the face optionally blurred or cropped.
   - Next build: a tiny free proxy (Cloudflare Worker or Supabase Edge Function) that holds the token, rate-limits, and strips EXIF. Optionally Dad's own duplicated private Space.
8. **[S/UX] Parent consent is a self-ticked checkbox** (POPIA needs a competent person's consent for a child). Fix: a "Parent mode" step with a parent PIN (or a QR/WhatsApp confirmation for Dad) that gates AI try-on, any upload and future sharing. Keep it free with a local PIN for now and a Supabase magic link later.
9. **[V] Premium look: replace emoji UI with a real icon set and type scale.** The nav, chips and buttons are system emoji, which render differently per phone and look cheap. The system font, 30 px/800 headings, and the flat beige mannequin (08, 14) read as "prototype". Fix:
   - Lucide or Phosphor icons (free).
   - One display font (e.g. "Fraunces" or "Instrument Serif" for headings, "Inter"/"DM Sans" for body; self-host them).
   - An 8-pt spacing scale and softer shadows.
   - A proper illustrated or silhouette avatar placeholder with a "make your mini-me" call to action.
   - Layered clothes in the flat view should be pose-anchored (MediaPipe landmarks are already loaded) instead of fixed CSS offsets.
10. **[F] Real weather and a daily "what to wear" card.** The Ideas screen says "auto-weather in v1". Use Open-Meteo, which is free with no key, at a coarse city-level location (or a city she picks, so no GPS is needed). Show "17° and rain at 15:00: take the denim jacket" at the top of Ideas, and feed it into `ideas()`.

---
## Quick wins (≤ ½ day each)
- [B] `today()` local date (see #1). The calendar date input shows US format (10/07/2026). Set `lang="en-ZA"` on the input/page and format history dates as "Wed 7 Oct".
- [B] Item-sheet category chips scroll sideways, so "Shoes / Hats / Accessories" are hidden off-screen at 360 px (06). Wrap them (`flex-wrap`) or use a 3×2 grid.
- [B] Save outfit lets you save the same outfit again and again with no dedupe, and the "Save" button stays live after saving. Back-dated saves bump `wears` each time. Disable the button after one tap and offer "Wore it today ✓" as a separate action.
- [B] Deleting an item leaves dead ids inside saved outfits. History silently drops tiles, and the "wear again" pick has holes. Mark outfits as "has a missing piece" instead.
- [B] `DB.get()` loads the whole `kv` store for every key. Use `store.get(id)`.
- [B] The Closet footer says "0 items · 0 demo items" when empty (18). Hide the demo count when it's 0.
- [B] There's no item edit for the photo (retake or recrop) and no undo after delete. Add a 5 s "Undo" toast in place of `confirm()`.
- [UX] Empty states are plain grey text (18–20). Each needs an illustration, one clear call to action ("Snap your first piece"), and on Dress Me/Ideas a "Bring demo items back" link.
- [UX] Dress Me with an empty closet shows "none" in tiny grey text (19). Replace it with an add tile inside each rail.
- [UX] Name field: auto-fill "lavender top" as a visible editable suggestion instead of a hidden fallback.
- [V] Tap targets under 44 px: calendar days 39 px, sheet ✕/← 34 px, "Delete all my data" 35 px tall. Make them 44 px minimum.
- [V] Add `:active` press scale (0.97), 150–200 ms sheet slide-up and fade, tile pop-in on add, and `prefers-reduced-motion` guards.
- [V] Haptics: `navigator.vibrate(10)` on select/save and a confetti burst on the first outfit (Android only; iOS Safari ignores vibrate, so make it visual too).
- [V] Use one consistent accent. Hot pink plus lavender plus red danger buttons all fight. Make lavender secondary and pink only for the primary call to action.
- [R] Pre-check `T.alive()` before showing the spinner. Show "AI is waking up (~30 s)" for SLEEPING, and stop the timer ticking while skipping a dead Space. Right now the tick interval starts before the alive check and leaks if skipped.
- [R] Downscale the avatar and garment to 768×1024 JPEG before upload. It's faster, uses less quota and sends less personal data.
- [S] Strip EXIF/GPS from every photo (canvas re-encode already does this for items; confirm it for the avatar original). Add "No faces needed" guidance for clothing photos.
- [S] The feedback export goes through the system share sheet. Fine, but prefill "To Dad" and don't include body measurements.

## Next build (1–5 days each)
- [UX] **Batch add + "photo studio" capture** (see #3). Use a live camera overlay with a hanger/flat-lay guide (`getUserMedia`), tap-tap-tap shooting, and processing in a Web Worker. Use @imgly/background-removal for clothes too (already loaded for the avatar) instead of the flood-fill, which fails on patterned floors and white-on-white.
- [UX] **First-run** in 3 steps: (1) privacy plus a parent PIN, (2) a 5-question style quiz (pick-your-vibe image cards: soft girl / Y2K / clean girl / sporty / streetwear, plus favourite colours), which seeds Ideas, (3) "Add 5 favourite pieces" with a progress ring, and avatar capture *offered* after that, not before. Today the demo items and Me form come first and the avatar is hidden in the Me tab.
- [UX] **Avatar capture.** A live pose-guide camera with an outline overlay, a self-timer (3/5/10 s, so she can prop the phone), voice or sound cues, and live green ticks from `checkPose`. Today she has to take a photo, upload it, read the failures, and retake.
- [UX] **Try-on waiting experience.** A shimmer skeleton of her avatar with the garment ghosted, an animated step list (Waking AI → Queue #2 → Dressing top → Dressing bottom), a "keep dressing, we'll ping you" option, and a before/after slider on the result. Add "Save picture to outfit" so the AI image becomes the outfit thumbnail.
- [R] **Queue + retries + caching** (see #5 and #6). Add a "Try-ons" inbox in Dress Me that lists pending, done and failed jobs, with one-tap retry.
- [F] **Outfit calendar v2.** Plan future days (school week, events), drag outfits onto days, show a "worn" vs "planned" state and month swipe (only the current month shows today), and an `.ics` export to her own calendar (no server needed).
- [F] **Wear stats.** Cost-per-wear (optional price field), most/least worn, colour wheel of her closet, "Closet gaps" (e.g. no neutral shoes), and "Miss me?" nudges. All computed locally.
- [F] **Packing lists.** Pick trip dates and destination, get Open-Meteo forecast and occasions, then an auto-generated capsule ("5 tops, 3 bottoms → 15 outfits") with a checklist.
- [F] **Smarter Ideas.** Learn from 💖 ratings, Shuffle skips and actual wears with simple local weights (no ML server). Add "Not again" and "More like this" buttons.
- [V] Design system pass: tokens, icon set, font, the avatar placeholder, and pose-anchored layering (see #9). Use View Transitions API page changes on Android Chrome.
- [S] Parent mode (#8) and the token proxy (#7). Encrypted export/import backup to a file she controls (`.closet` zip with an AES key from a passphrase), so a lost phone doesn't lose the closet without needing a cloud.
- [B/R] Offline: the SW doesn't precache CDN modules (MediaPipe, gradio client, imgly), so the avatar maker and cut-out break offline or on flaky mobile data. Cache them on first use (runtime cache for cdn.jsdelivr/storage.googleapis) and bump the cache version on deploy.

## Later
- [F] **Friend sharing, done safely.** Share an *outfit card image* (flat-lay of clothes only, no avatar or face, no metadata) via the system share sheet to people she already knows. No public profiles, feed, likes, DMs or discoverability. If in-app sharing ever exists, use parent-approved friend codes only, and get a POPIA review first.
- [F] Supabase opt-in sync (free tier): magic-link login *by the parent*, RLS, private bucket with signed URLs, and "delete everything" that also wipes the cloud.
- [F] Better avatar: a 2–3 photo digital twin, and a self-hosted CatVTON/Leffa on Dad's own HF Space or a Modal free credit for steadier quota.
- [F] Store app wrapper (Capacitor) for real haptics, camera control and notifications ("Rain tomorrow, your yellow raincoat?").
- [F] Shop-the-gap. Only with no ads to minors, parent opt-in, and no tracking. Probably never.
- [S] Periodic privacy check-in: "These are the photos stored. Delete old avatar?" Auto-delete try-on images after 30 days by default.

---
## Notes from the walk-through (per screen)
- **01–02 Onboarding:** clear and honest copy, but it's a text wall with no visual of what the app does, and the only feedback for an unticked box is a toast. Disable "Let's go" until it's ticked.
- **03–04 Closet:** the demo grid looks good. Tags overlap the art on small tiles. There's no search or sort (recent / colour / least worn) and no multi-select.
- **05 Add:** Camera/Gallery work. There's no batch, no tips image, and only one file per pick.
- **06–07 Item:** category chips are clipped, the colour swatches have no labels (hard for colour-blind users), and there's no edit of the photo.
- **08–09 Dress Me:** the flat mannequin and floating garments look crude. Rails are narrow (two columns of small tiles), the FAB covers the action row, and Shuffle gives no animation.
- **10–11 Save outfit:** good, with a nice rating chip. The date format is US and the toast overlaps.
- **12 Try-on with no avatar:** good redirect, but it sits behind a toast.
- **13 Ideas:** works. The weather is manual. Reasons are useful but small grey text.
- **14 Me:** a long single scroll with details, calendar, history, feedback, AI settings (token!) and privacy all together. Split it into Me / Stats / Settings (parent), and hide the AI settings behind parent mode.
- **15–16 Avatar maker:** a clear consent tick and guidance. It needs a live camera guide and timer.
- **17 Feedback:** fine. It should live in Me, not as a FAB.
- **18–20 Empty states:** bare text. They need illustrations and calls to action.
