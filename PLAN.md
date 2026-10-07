# My Closet – plan (prototype for Dennis's daughter)

## What it is
A private wardrobe app for teen girls: make a "mini-me" from a photo, snap all your clothes, dress yourself each day, save outfits, and get outfit ideas that get smarter over time.

## User flow
1. **Onboarding** – short privacy note, parent-OK tick box.
2. **Avatar photo** – full-body photo in *Me*; add height + body shape.
3. **Add clothes** – camera/gallery, background cut out, pick category + colour (colour auto-suggested), occasions.
4. **Dress Me** – tap tops / bottoms / shoes / jacket / hat / bag to layer them on the avatar; Shuffle; Save.
5. **Save / calendar** – each saved outfit lands on a date in the outfit calendar + history; "wear again".
6. **Suggestions (Ideas)** – outfits from her own clothes by colour match, occasion, weather, and "not worn lately".

## Roadmap
- **v0 – now (this prototype):** free PWA, everything on the phone, drawn demo clothes, simple rules for ideas, her photo used as the avatar, feedback notes she can share with Dad.
- **v1 – real AI:** photoreal avatar/digital twin from 1–3 photos; virtual try-on of her real clothes on the avatar via a hosted model; auto-tagging of category/colour/pattern; real weather; cloud backup (opt-in) with login.
- **v2 – learning stylist:** learns from likes, ratings and what she actually wears; daily "what to wear" nudge; occasion planning; packing lists; maybe "shop the gap" later (no ads to minors).

## Suggested tech (free-first)
- App: PWA (vanilla JS now; React/Expo or Flutter if it becomes a store app).
- Storage v0: IndexedDB on the phone. v1: Supabase (free tier: auth, Postgres, private storage buckets with row-level security).
- Background removal: on-device (simple cut-out now; open-source in-browser model e.g. @imgly/background-removal; or remove.bg/Clipdrop paid API).
- Auto-tagging: free CLIP-style model or a vision LLM call per item (cents or less).
- Try-on / avatar: hosted models via Replicate / fal.ai / Fashn.ai (IDM-VTON, CatVTON, Kolors try-on), or Higgsfield.
- Hosting: GitHub Pages (free) for the prototype.

## Costs to watch
- **AI try-on is the big one:** roughly US$0.02–0.10 per generated image (≈R0.40–R2). 10 try-ons a day = ~R120–R600/month for one user. Cache results; only render when she taps "see it on me"; keep the free layered preview as default.
- Avatar creation: one-off, ~US$0.05–1 per avatar depending on model.
- Auto-tagging: ~US$0.001–0.01 per item. Storage: free tier covers a few GB.
- Set a monthly spend cap on the AI provider.

## Teen privacy (POPIA)
- Under 18 = a child under POPIA: **a parent/guardian must consent** before her personal info (photos, body details) is processed. Consent screen + parent confirmation in v1.
- **Private by default:** no public profiles, no sharing, no social features, no ads, no tracking.
- v0 stores everything **only on the phone**; nothing is uploaded.
- v1: photos in private, encrypted storage (signed URLs only), minimal data, AI providers that don't train on or keep images (check terms; delete after processing).
- **Deletion:** "Delete all my data" button in the app (v0 already has it); v1 also deletes cloud copies and avatar models.
- Body photos are sensitive: never use them for anything except her own try-on.
