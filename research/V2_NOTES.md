# v2: realistic Dress Me + audit + design pass (7 Oct 2026, tested ~16:30 SAST, headless Chrome 360×780 @2x, stock images only)
- Avatar: MediaPipe pose_landmarker_full + selfie_multiclass_256x256 (fallbacks: lite / selfie_segmenter); mask bilinear upsample + 2× box-blur feather + smoothstep; head-to-feet bbox from mask+pose. Analyse 2.6–3.2 s (box CPU, models cached).
- Try-on (free HF token): IDM-VTON top 24.4 s; layered IDM top 15.4 s + Leffa dress_code skirt 16.8 s = 32.7 s total. Cached re-show 80 ms.
- AI result is cut out on-device (same segmenter) and placed on the studio stage; fallback = mix-blend multiply.
- Smart tagging: transformers.js CLIP ViT-B/32 q8 (~90 MB once), batch of 2 photos 16–18 s incl. first load on the box. Opt-in.
- Depth Anything (transformers.js depth-anything-small, ~27 MB q8): not shipped. On WASM phones it's ~5–15 s per image, and a 2.5D relief from one photo warps faces/limbs; the CSS tilt + rim light + floor shadow gives the depth feel at zero cost. Revisit with WebGPU.
- Token relay: not deployed (needs Dennis's Cloudflare/Supabase account). Token stays in this browser's localStorage behind the parent PIN; never in the repo.
- Known limits: flood-fill garment cut-out fails white-on-white (use "Better cut-out", @imgly on-device); daily cap is an estimate (anon ~3, free token ~9).
