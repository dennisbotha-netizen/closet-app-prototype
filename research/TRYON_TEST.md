# Virtual try-on quick test (2026-10-07, ~15:11 SAST)
- Inputs: model_stock.jpg + garment.jpg = the IDM-VTON Space's own bundled demo images (VITON-HD stock). No real user photo was uploaded.
- yisol/IDM-VTON (HF ZeroGPU, gradio_client, anonymous): OK in 25.8 s, 30 steps -> result_idmvton.png
- franciszzj/Leffa: failed in 4.6 s, "exceeded your ZeroGPU runs limit" (anonymous quota, used up by the IDM run)
- zhengchong/CatVTON: Space in RUNTIME_ERROR (down)

# Authenticated test (2026-10-07, ~15:50 SAST, free HF account, token kept out of repo)
- Same Space demo stock images (DeepFashion full-body model from franciszzj/Leffa examples). Jeans = the app's own drawn demo jeans.
- 4 runs, all OK, no quota error (anonymous quota had stopped after 1 run):
  - IDM-VTON top: 31.1 s -> 1_idm_top.png
  - Leffa jeans, viton_hd: 19.7 s (poor: wrong colour/texture)
  - Leffa layered (jeans on IDM result), viton_hd: 16.2 s (bled into top)
  - Leffa jeans, dress_code: 22.2 s -> 4_leffa_jeans_dc.png (good) => app now uses dress_code for bottoms
- HF docs: free account = 5 min ZeroGPU/day (anonymous 2 min), resets 24 h after first use. ~20-30 s per run => roughly 8-12 try-ons/day.
